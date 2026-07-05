# Changelog

Maintained fork of [vercel/async-retry](https://github.com/vercel/async-retry).

## 2.0.0 — 2026-07-05

### Added
- Built-in TypeScript types — no separate `@types/async-retry` needed.
- `shouldRetry` option to decide per-error whether to retry (#51).
- `signal` option accepting an `AbortSignal` to cancel retries (#73).
- Dual ESM + CommonJS builds.

### Fixed
- `bail()` now actually stops retries instead of leaving the operation running (#69).
- Correct CJS/ESM interop on import (#103).
- Async `onRetry` no longer causes an unhandled promise rejection (#43).

### Unchanged
- Drop-in replacement for `async-retry` — same API and options.
- Zero runtime dependencies (`retry` core vendored in).

[Full fix table and migration guide in the README.](https://github.com/bybraveHQ/async-retry2#readme)
