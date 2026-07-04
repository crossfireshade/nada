/**
 * Patches @tensorflow/tfjs-node to be compatible with Node.js v14+.
 *
 * Node.js removed `util.isNullOrUndefined` and `util.isArray` in v14+.
 * @tensorflow/tfjs-node 4.x still references them in nodejs_kernel_backend.js.
 * This script replaces those calls with direct equivalents.
 *
 * Run automatically via "postinstall" in package.json.
 */
const fs = require('fs');
const path = require('path');

const backendPath = path.resolve(
  __dirname,
  '../node_modules/@tensorflow/tfjs-node/dist/nodejs_kernel_backend.js'
);

if (!fs.existsSync(backendPath)) {
  console.log('[patch-tfjs] @tensorflow/tfjs-node not found – skipping patch.');
  process.exit(0);
}

let src = fs.readFileSync(backendPath, 'utf8');

// Check if already patched
if (!src.includes('util_1.isNullOrUndefined') && !src.includes('util_1.isArray')) {
  console.log('[patch-tfjs] Already patched – nothing to do.');
  process.exit(0);
}

src = src.replace(/\(0, util_1\.isNullOrUndefined\)\(([^)]+)\)/g, '($1 == null)');
src = src.replace(/\(0, util_1\.isArray\)\(([^)]+)\)/g, 'Array.isArray($1)');
src = src.replace(/util_1\.isNullOrUndefined\(([^)]+)\)/g, '($1 == null)');
src = src.replace(/util_1\.isArray\(([^)]+)\)/g, 'Array.isArray($1)');

fs.writeFileSync(backendPath, src, 'utf8');
console.log('[patch-tfjs] Patched @tensorflow/tfjs-node for Node.js v14+ compatibility.');
