'use strict';

const fs = require('node:fs');
const path = require('node:path');

function packageRoot(specifier) {
  return path.dirname(require.resolve(`${specifier}/package.json`));
}

const ts7Root = packageRoot('typescript');
const tsNgRoot = packageRoot('typescript-ng');
const classicLib = path.join(ts7Root, 'classic-lib');

fs.cpSync(path.join(tsNgRoot, 'lib'), classicLib, { recursive: true });

const shimCjs = `module.exports = require('./classic-lib/typescript.js');\n`;
const shimMjs = `export * from './classic-lib/typescript.js';\nexport { default } from './classic-lib/typescript.js';\n`;

fs.writeFileSync(path.join(ts7Root, 'angular-shim.cjs'), shimCjs);
fs.writeFileSync(path.join(ts7Root, 'angular-shim.mjs'), shimMjs);

const pkgPath = path.join(ts7Root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
delete pkg.type;
pkg.main = './classic-lib/typescript.js';
pkg.types = './classic-lib/typescript.d.ts';
pkg.exports = {
  ...(pkg.exports || {}),
  '.': {
    types: './classic-lib/typescript.d.ts',
    require: './classic-lib/typescript.js',
    import: './classic-lib/typescript.js',
    default: './classic-lib/typescript.js',
  },
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
console.log('Shimed typescript 7 package to expose the TypeScript 6 compiler API for Angular.');
