import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

const STATIC_FILES = [
  'index.html', 'application.html', 'auth.html',
  'profile.html', 'eligibility.html', 'about.html',
];

const STATIC_DIRS = ['css', 'js', 'images', 'assets'];

const ROOT_SCAN_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.txt']);

const COPY_ALLOW_EXTS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg',
  '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map', '.pdf', '.txt']);

function rimraf(dir) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) rimraf(full);
    else {
      try { unlinkSync(full); } catch (_) {}
    }
  }
  try { rmdirSync(dir); } catch (_) {}
}

import { unlinkSync, rmdirSync } from 'fs';

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const srcP = join(src, e.name);
    const dstP = join(dest, e.name);
    if (e.isDirectory()) {
      copyDir(srcP, dstP);
    } else if (e.isFile()) {
      const ext = extname(e.name).toLowerCase();
      if (COPY_ALLOW_EXTS.has(ext) || basename(e.name) === '.gitkeep') {
        copyFileSync(srcP, dstP);
      }
    }
  }
}

function main() {
  rimraf(distDir);
  mkdirSync(distDir, { recursive: true });

  let copied = 0;
  for (const name of STATIC_FILES) {
    const src = join(projectRoot, name);
    if (existsSync(src)) {
      copyFileSync(src, join(distDir, name));
      copied++;
    }
  }

  for (const e of readdirSync(projectRoot, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    const ext = extname(e.name).toLowerCase();
    if (!ROOT_SCAN_EXTS.has(ext)) continue;
    if (STATIC_FILES.includes(e.name)) continue;
    const src = join(projectRoot, e.name);
    copyFileSync(src, join(distDir, e.name));
    copied++;
  }

  for (const dir of STATIC_DIRS) {
    const src = join(projectRoot, dir);
    if (existsSync(src) && statSync(src).isDirectory()) {
      copyDir(src, join(distDir, dir));
    }
  }

  const manifestPath = join(distDir, '_redirects');
  if (!existsSync(manifestPath)) {
    writeFileSync(manifestPath,
      `/api/* /.netlify/functions/:splat 200\n`,
      'utf8'
    );
  }

  console.log(`✅ Copied static site to ${distDir}`);
  console.log(`   Files from root list: ${copied}`);
  for (const dir of STATIC_DIRS) {
    const d = join(distDir, dir);
    if (existsSync(d)) {
      let count = 0;
      const walk = (p) => { for (const e of readdirSync(p, { withFileTypes: true })) { const f = join(p, e.name); if (e.isDirectory()) walk(f); else count++; } };
      walk(d);
      console.log(`   ${dir}/: ${count} file(s)`);
    }
  }
}

main();
