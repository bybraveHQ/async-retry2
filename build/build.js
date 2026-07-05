// CJS-бандл из ESM-исходника. Footer разворачивает default в module.exports,
// чтобы require('@bybrave/async-retry2') отдавал функцию напрямую — как оригинал.
import { build } from 'esbuild';

await build({
  entryPoints: ['index.js'],
  bundle: true,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2018',
  outfile: 'dist/index.cjs',
  footer: {
    js: 'module.exports = module.exports.default;',
  },
});

console.log('built dist/index.cjs');
