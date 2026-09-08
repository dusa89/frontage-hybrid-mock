import { build } from 'esbuild';

await build({
  entryPoints: ['src/wet-asphalt.ts'],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  format: 'esm',
  outfile: 'assets/wet-asphalt.js',
  legalComments: 'none',
});
