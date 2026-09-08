import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const ts = readFileSync('src/wet-asphalt.ts', 'utf8');
const shader = readFileSync('src/asphalt-shaders.ts', 'utf8');
const registry = readFileSync('src/reflection-registry.ts', 'utf8');

const classRe = /wet-asphalt-[a-z]+/g;
const htmlClasses = [...new Set(html.match(classRe) || [])].sort();
const tsClasses = [...new Set(ts.match(classRe) || [])].sort();

const shaderUniforms = [...shader.matchAll(/uniform\s+\w+\s+(u\w+)/g)].map((m) => m[1]);
const tsUniforms = [...ts.matchAll(/\b(u[A-Z]\w+)\s*:/g)].map((m) => m[1]);

const htmlAttrs = [...new Set(html.match(/data-reflect[a-z-]*/g) || [])].sort();
const registryAttrs = [...new Set(registry.match(/data-reflect[a-z-]*|reflect[A-Z]\w+/g) || [])].sort();

console.log(JSON.stringify({
  htmlClasses,
  tsClasses,
  htmlOnly: htmlClasses.filter((c) => !tsClasses.includes(c)),
  tsOnly: tsClasses.filter((c) => !htmlClasses.includes(c)),
  shaderUniforms,
  tsUniforms,
  missingInTs: shaderUniforms.filter((u) => !tsUniforms.includes(u)),
  extraInTs: tsUniforms.filter((u) => !shaderUniforms.includes(u)),
  htmlAttrs,
  registryAttrs,
  canvasClassInTs: (ts.match(/className\s*=\s*['\"]([^'\"]+)['\"]/) || [])[1],
  liveAdds: [...ts.matchAll(/classList\.add\(['\"]([^'\"]+)['\"]\)/g)].map((m) => m[1]),
}, null, 2));
