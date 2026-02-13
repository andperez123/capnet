#!/usr/bin/env node
/**
 * Build script: copy apps/landing to public for Vercel static output.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'apps', 'landing');
const dest = path.join(root, 'public');

if (!fs.existsSync(src)) {
  console.error('Source not found:', src);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
const entries = fs.readdirSync(src, { withFileTypes: true });
for (const e of entries) {
  const srcPath = path.join(src, e.name);
  const destPath = path.join(dest, e.name);
  if (e.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}
console.log('Build complete: public/', fs.readdirSync(dest).join(', '));
