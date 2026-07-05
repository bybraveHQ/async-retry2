// Компилируется в CI (npm run test-types) — проверяет соответствие типов рантайму.
import retry from '../index.js';

async function main() {
  const s: string = await retry(async (bail, attempt) => {
    if (attempt > 3) bail(new Error('stop'));
    return 'ok';
  });

  const n: number = await retry(() => 5, { retries: 3 });

  const withOpts: string = await retry(async () => 'x', {
    retries: 5,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 2000,
    randomize: true,
    onRetry: async (err: Error, attempt: number) => {
      void [err, attempt];
    },
    shouldRetry: (err: Error) => err.name !== 'FatalError',
    signal: AbortSignal.timeout(1000),
  });

  void [s, n, withOpts];
}

void main;
