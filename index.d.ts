export interface Options {
  /** Максимум повторов. По умолчанию 10. */
  retries?: number;
  /** Экспоненциальный фактор. По умолчанию 2. */
  factor?: number;
  /** Мс до первого повтора. По умолчанию 1000. */
  minTimeout?: number;
  /** Максимум мс между повторами. По умолчанию Infinity. */
  maxTimeout?: number;
  /** Рандомизировать задержки (×1..2). По умолчанию true. */
  randomize?: boolean;
  /** Повторять бесконечно. */
  forever?: boolean;
  /** unref() внутренних таймеров. */
  unref?: boolean;
  /** Максимальное суммарное время повторов, мс. */
  maxRetryTime?: number;
  /**
   * Вызывается после каждого неуспеха перед следующим повтором.
   * Может быть async (rejection проглатывается, задержку не блокирует).
   */
  onRetry?: (error: Error, attempt: number) => void | Promise<void>;
  /** Предикат: вернуть false, чтобы прекратить повторы для этой ошибки (#51). */
  shouldRetry?: (error: Error) => boolean;
  /** Прервать всю операцию (например AbortSignal.timeout(ms)) (#73). */
  signal?: AbortSignal;
}

export type RetryFunction<T> = (
  bail: (error?: Error) => void,
  attempt: number
) => Promise<T> | T;

/** Выполнить `fn` с повторами при ошибке. `bail(err)` прекращает повторы. */
declare function retry<T>(fn: RetryFunction<T>, opts?: Options): Promise<T>;

export default retry;
