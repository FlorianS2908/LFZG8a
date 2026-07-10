import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const required = [
  'index.html',
  'src/main.js',
  'src/App.tsx',
  'src/styles/app.css',
  'README.md'
];

const missing = required.filter((file) => !existsSync(resolve(import.meta.dirname, '..', file)));
if (missing.length) {
  console.error(`Missing files: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('ContentFactory Lab static build check passed.');
