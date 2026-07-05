// Retrying made simple, easy and async. Портировано из vercel/async-retry (MIT).
// Ядро node-retry вендорено в ./retry (0 внешних зависимостей).
import * as retrier from './retry/retry.js';

/**
 * @template T
 * @param {(bail: (error?: Error) => void, attempt: number) => Promise<T> | T} fn
 * @param {import('../index.js').Options} [opts]
 * @returns {Promise<T>}
 */
export default function retry(fn, opts) {
  function run(resolve, reject) {
    // Не мутируем пользовательский объект опций (оригинал делал `opts.randomize = true`).
    const options = { randomize: true, ...opts };
    const { onRetry, shouldRetry, signal } = options;

    const op = retrier.operation(options);

    // #69: после bail (или abort) новые попытки не запускаются и fn больше не вызывается.
    let settled = false;
    let onAbort = null;

    function cleanup() {
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
    }

    function finish(fn2, value) {
      if (settled) return;
      settled = true;
      op.stop();
      cleanup();
      fn2(value);
    }

    // Прервать всю операцию (bail / AbortSignal), не планируя ретраев.
    function bail(err) {
      finish(reject, err || new Error('Aborted'));
    }

    // #73: AbortSignal прекращает всю операцию (например AbortSignal.timeout(ms)).
    if (signal) {
      const abortError = () =>
        signal.reason instanceof Error
          ? signal.reason
          : new Error('The operation was aborted');
      if (signal.aborted) {
        finish(reject, abortError());
        return;
      }
      onAbort = () => finish(reject, abortError());
      signal.addEventListener('abort', onAbort, { once: true });
    }

    function onError(err, num) {
      if (settled) return;

      if (err && err.bail) {
        bail(err);
        return;
      }

      // #51: предикат решает, ретраить ли эту ошибку.
      if (shouldRetry && !shouldRetry(err)) {
        finish(reject, err);
        return;
      }

      if (!op.retry(err)) {
        finish(reject, op.mainError());
      } else if (onRetry) {
        // #43: onRetry может быть async — ловим rejection, чтобы он не стал
        // unhandled. Задержку до следующей попытки onRetry не блокирует.
        Promise.resolve()
          .then(() => onRetry(err, num))
          .catch(() => {});
      }
    }

    function runAttempt(num) {
      if (settled) return; // #69: не вызывать fn после bail/abort

      let val;
      try {
        val = fn(bail, num);
      } catch (err) {
        onError(err, num);
        return;
      }

      Promise.resolve(val)
        .then((value) => finish(resolve, value))
        .catch((err) => onError(err, num));
    }

    op.attempt(runAttempt);
  }

  return new Promise(run);
}
