import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputRoot = path.join(root, '.deploy', 'tftblog-static-mvp');
const htmlRoot = path.join(outputRoot, 'html');
const siteRoot = path.join(outputRoot, 'site');
const appBuildRoot = path.join(root, '.next', 'server', 'app');
const nextStaticRoot = path.join(root, '.next', 'static');
const publicRoot = path.join(root, 'public');
const contentGuidesRoot = path.join(root, 'content', 'guides');

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required build file is missing: ${filePath}`);
  }
}

function guideSlugs() {
  if (!fs.existsSync(contentGuidesRoot)) return [];

  return fs
    .readdirSync(contentGuidesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(contentGuidesRoot, entry.name, 'TFT.md')))
    .map((entry) => entry.name)
    .sort();
}

function copyHtml() {
  const htmlFiles = [
    ['index.html', 'index.html'],
    ['data.html', 'data.html'],
    ['guides.html', 'guides.html'],
    ['login.html', 'login.html'],
    ['_not-found.html', '_not-found.html'],
  ];

  for (const [sourceName, targetName] of htmlFiles) {
    const source = path.join(appBuildRoot, sourceName);
    requireFile(source);
    copyFile(source, path.join(htmlRoot, targetName));
  }

  for (const slug of guideSlugs()) {
    const source = path.join(appBuildRoot, 'guides', `${slug}.html`);
    requireFile(source);
    copyFile(source, path.join(htmlRoot, 'guides', `${slug}.html`));
  }
}

function copyStaticAssets() {
  requireFile(path.join(root, '.next', 'BUILD_ID'));
  if (!fs.existsSync(nextStaticRoot)) {
    throw new Error(`Required static directory is missing: ${nextStaticRoot}`);
  }

  copyDir(nextStaticRoot, path.join(siteRoot, '_next', 'static'));

  for (const slug of guideSlugs()) {
    copyDir(path.join(publicRoot, 'guides', slug), path.join(siteRoot, 'guides', slug));
  }

  const favicon = path.join(root, 'app', 'favicon.ico');
  if (fs.existsSync(favicon)) {
    copyFile(favicon, path.join(siteRoot, 'favicon.ico'));
  }
}

function main() {
  ensureCleanDir(outputRoot);
  fs.mkdirSync(htmlRoot, { recursive: true });
  fs.mkdirSync(siteRoot, { recursive: true });

  copyHtml();
  copyStaticAssets();
  copyFile(path.join(root, 'scripts', 'static-mvp-server.mjs'), path.join(outputRoot, 'server.mjs'));

  console.log(`Static deploy bundle created: ${outputRoot}`);
  console.log(`Guide routes: ${guideSlugs().join(', ')}`);
}

main();
