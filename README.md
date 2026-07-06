# @bybrave/async-retry2

Maintained fork of [`async-retry`](https://www.npmjs.com/package/async-retry) — retrying made simple, easy, and async.

Same API, **zero runtime dependencies** (node-retry is vendored in), dual **ESM + CommonJS**, **built-in TypeScript types**, and a `bail()` that actually stops retrying.

## Install

```sh
npm install @bybrave/async-retry2
```

## Usage

```js
import retry from '@bybrave/async-retry2';

await retry(
  async (bail, attempt) => {
    const res = await fetch('https://example.com');
    if (res.status === 403) {
      bail(new Error('Unauthorized')); // stops retrying immediately
      return;
    }
    return res.text();
  },
  { retries: 5 }
);
```

CommonJS works too — `require` returns the function directly:

```js
const retry = require('@bybrave/async-retry2');
```

The supplied function receives `(bail, attempt)`: call `bail(error)` to abort retrying, `attempt` is the 1-based attempt number.

### Options

Passed through to node-retry, plus fork additions:

| Option | Default | Effect |
|---|---|---|
| `retries` | `10` | Maximum number of retries. |
| `factor` | `2` | Exponential backoff factor. |
| `minTimeout` | `1000` | Milliseconds before the first retry. |
| `maxTimeout` | `Infinity` | Maximum milliseconds between retries. |
| `randomize` | `true` | Multiply timeouts by a random `1`–`2` factor. |
| `onRetry` | — | `(error, attempt) => void \| Promise<void>` after each failed attempt. May be async. |
| `shouldRetry` | — | `(error) => boolean` — return `false` to stop retrying this error. **(fork, #51)** |
| `signal` | — | `AbortSignal` to abort the whole operation, e.g. `AbortSignal.timeout(5000)`. **(fork, #73)** |

## What's fixed vs `async-retry@1.3.3`

| Issue | Fix |
|---|---|
| [#69](https://github.com/vercel/async-retry/issues/69) | `bail()` now actually stops the operation — no further attempts run and the retrier function is never called again after bail. Previously bail only rejected the promise while retries kept firing. |
| [#103](https://github.com/vercel/async-retry/issues/103) | Ships as native ESM with a CommonJS build via the `exports` map — no more `(0 , async_retry_1.retry) is not a function`. `import` and `require` both work. |
| [#110](https://github.com/vercel/async-retry/issues/110), [#54](https://github.com/vercel/async-retry/issues/54) | Built-in TypeScript types (no separate `@types/async-retry` needed), including the `attempt` parameter. |
| [#51](https://github.com/vercel/async-retry/issues/51) | New `shouldRetry(error)` option to decide per-error whether to keep retrying. |
| [#43](https://github.com/vercel/async-retry/issues/43) | `onRetry` may be `async`; a rejection from it is swallowed instead of becoming an unhandled rejection. |
| [#73](https://github.com/vercel/async-retry/issues/73) | New `signal` option (`AbortSignal`) to time out or cancel the entire retry operation. |
| — | Zero runtime dependencies — `retry` is vendored and maintained in-tree. |

## Migration from `async-retry`

Drop-in — replace the import:

```diff
- const retry = require('async-retry');
+ const retry = require('@bybrave/async-retry2');
```

The retry/backoff behaviour is unchanged. The one intentional behaviour change is [#69](https://github.com/vercel/async-retry/issues/69): after you call `bail()`, the function is no longer retried (this is what most people already expected).

## Support

If this package saves you time, you can support maintenance:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-buy%20me%20a%20coffee-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/bybrave)
[![Bitcoin](https://img.shields.io/badge/Bitcoin-BTC-F7931A?logo=bitcoin&logoColor=white)](#support)

Bitcoin (BTC): `bc1q37557q5jpeaxqydzwvf3jgj7zhnfpn2td3q40q`

## License

MIT. Copyright © Vercel, Inc.; vendored node-retry © Tim Koschützki, Felix Geisendörfer; fork © bybrave.
