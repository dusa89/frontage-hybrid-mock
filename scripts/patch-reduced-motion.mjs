import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const path = 'src/wet-asphalt.ts';
let source = readFileSync(path, 'utf8');

const needle =
  "if (!document.body || !('WebGLRenderingContext' in window)) {\n    fallback();\n    return;\n  }";
const insert =
  "// Reduced motion: static CSS asphalt only — no WebGL, no scroll road drift.\n  if (!document.body || !('WebGLRenderingContext' in window) || reduced) {\n    fallback();\n    return;\n  }";

if (!source.includes(needle)) {
  console.error('mount gate not found');
  process.exit(1);
}

if (!source.includes('|| reduced)')) {
  source = source.replace(needle, insert);
  writeFileSync(path, source);
  console.log('patched reduced-motion gate');
} else {
  console.log('reduced-motion gate already present');
}

const build = spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
process.exit(build.status ?? 1);
