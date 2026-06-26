import fs from 'node:fs';
import path from 'node:path';

const prototypeDir = path.join(process.cwd(), 'app', 'data', 'prototype');

if (fs.existsSync(prototypeDir)) {
  throw new Error(`Prototype route directory should be removed after formal data page implementation: ${prototypeDir}`);
}

console.log('Data prototype cleanup check passed.');
