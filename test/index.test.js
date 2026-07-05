import { test } from 'node:test';
import assert from 'node:assert';
import retry from '../index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fast = { minTimeout: 1, maxTimeout: 10 };

// --- Порт оригинального suite (vercel/async-retry) ---

test('return value', async () => {
  const val = await retry(async (bail, num) => {
    if (num < 2) throw new Error('woot');
    await sleep(20);
    return `woot ${num}`;
  }, fast);
  assert.equal(val, 'woot 2');
});

test('return value no await', async () => {
  const val = await retry(async () => 1, fast);
  assert.equal(val, 1);
});

test('return non-async', async () => {
  const val = await retry(() => 5, fast);
  assert.equal(val, 5);
});

test('with non-async functions', async () => {
  await assert.rejects(
    retry((bail, num) => {
      throw new Error(`Test ${num}`);
    }, { retries: 2, ...fast }),
    /Test 3/
  );
});

test('bail', async () => {
  await assert.rejects(
    retry(async (bail, num) => {
      if (num === 2) bail(new Error('Wont retry'));
      throw new Error(`Test ${num}`);
    }, { retries: 3, ...fast }),
    /Wont retry/
  );
});

test('bail + return', async () => {
  await assert.rejects(
    retry(async (bail) => {
      await sleep(20);
      bail(new Error('woot'));
    }, fast),
    /woot/
  );
});

test('bail error (err.bail = true)', async () => {
  let retries = 0;
  await assert.rejects(
    retry(async () => {
      retries += 1;
      const err = new Error('Wont retry');
      err.bail = true;
      throw err;
    }, { retries: 3, ...fast }),
    /Wont retry/
  );
  assert.equal(retries, 1);
});

test('onRetry receives error and attempt number', async () => {
  let lastAttempt = 0;
  await assert.rejects(
    retry(() => {
      throw new Error('nope');
    }, {
      retries: 2,
      ...fast,
      onRetry: (err, i) => {
        assert.ok(err instanceof Error);
        lastAttempt = i;
      },
    })
  );
  assert.equal(lastAttempt, 2);
});

// --- Фиксы форка ---

test('#69: bail stops further attempts even if fn keeps throwing', async () => {
  let calls = 0;
  await assert.rejects(
    retry(async (bail, num) => {
      calls += 1;
      if (num === 2) bail(new Error('Wont retry'));
      throw new Error(`Test ${num}`);
    }, { retries: 5, ...fast }),
    /Wont retry/
  );
  await sleep(80); // дать шанс фантомным ретраям, которых быть не должно
  assert.equal(calls, 2);
});

test('#51: shouldRetry can stop retrying for a given error', async () => {
  let calls = 0;
  await assert.rejects(
    retry(() => {
      calls += 1;
      const err = new Error('fatal');
      err.code = 'FATAL';
      throw err;
    }, {
      retries: 5,
      ...fast,
      shouldRetry: (err) => err.code !== 'FATAL',
    }),
    /fatal/
  );
  assert.equal(calls, 1);
});

test('#51: shouldRetry true keeps retrying', async () => {
  let calls = 0;
  await assert.rejects(
    retry(() => {
      calls += 1;
      throw new Error('transient');
    }, { retries: 2, ...fast, shouldRetry: () => true }),
    /transient/
  );
  assert.equal(calls, 3);
});

test('#43: async onRetry is awaited-safe (rejection does not crash)', async () => {
  let ran = 0;
  await assert.rejects(
    retry(() => {
      throw new Error('boom');
    }, {
      retries: 2,
      ...fast,
      onRetry: async () => {
        ran += 1;
        throw new Error('onRetry failed');
      },
    }),
    /boom/
  );
  assert.equal(ran, 2);
});

test('#73: AbortSignal aborts the whole operation', async () => {
  const controller = new AbortController();
  let calls = 0;
  const p = retry(async () => {
    calls += 1;
    throw new Error('keep trying');
  }, { retries: 100, minTimeout: 20, maxTimeout: 20, signal: controller.signal });

  setTimeout(() => controller.abort(new Error('timed out')), 50);
  await assert.rejects(p, /timed out/);
  const seen = calls;
  await sleep(80);
  assert.equal(calls, seen); // после abort новых попыток нет
});

test('#73: already-aborted signal rejects immediately', async () => {
  let calls = 0;
  await assert.rejects(
    retry(() => {
      calls += 1;
      throw new Error('should not run');
    }, { signal: AbortSignal.abort(new Error('pre-aborted')) }),
    /pre-aborted/
  );
  assert.equal(calls, 0);
});

test('does not mutate the caller options object', async () => {
  const opts = { retries: 0, minTimeout: 1 };
  await retry(() => 1, opts);
  assert.equal('randomize' in opts, false);
});
