#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Source and target directories
const sourceDir = 'D:\\ob\\JLH\\21 TFT';
const targetDir = path.join(projectRoot, 'content', 'guides');

// Process files 84-99
const fileRange = { start: 84, end: 99 };

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function extractTitle(filename) {
  // "86 - 崔斯特 贾克斯.md" -> "崔斯特 贾克斯"
  return filename.replace(/^\d+\s*-\s*/, '').replace(/\.md$/, '').trim();
}

function processFrontmatter(content, title) {
  // Handle both \n and \r\n line endings
  const frontmatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!frontmatterMatch) {
    console.warn(`No frontmatter found for: ${title}`);
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');

  let hasTitle = false;
  let hasSource = false;
  let hasUpdatedAt = false;
  let coverValue = null;

  const newLines = [];

  for (const line of lines) {
    if (line.startsWith('title:')) hasTitle = true;
    if (line.startsWith('source:')) hasSource = true;
    if (line.startsWith('updatedAt:')) hasUpdatedAt = true;

    if (line.startsWith('cover:')) {
      // Extract cover filename: "cover: ../90 附件/TFT/image.png" -> "image.png"
      const match = line.match(/cover:\s*(.+)/);
      if (match) {
        const coverPath = match[1].trim();
        coverValue = path.basename(coverPath);
        newLines.push(`cover: ${coverValue}`);
        continue;
      }
    }

    newLines.push(line);
  }

  // Add missing fields
  if (!hasTitle) {
    newLines.unshift(`title: ${title}`);
  }
  if (!hasSource) {
    newLines.push('source: obsidian');
  }
  if (!hasUpdatedAt) {
    const today = new Date().toISOString().split('T')[0];
    newLines.push(`updatedAt: ${today}`);
  }

  return `---\n${newLines.join('\n')}\n---`;
}

function fixImagePaths(content) {
  // Fix Obsidian image syntax: ![[image.png]] -> keep as is (already supported)
  // Fix markdown image paths: ![alt](../90 附件/TFT/image.png) -> ![alt](image.png)
  return content.replace(/!\[([^\]]*)\]\(\.\.\/90 附件\/TFT\/([^)]+)\)/g, '![$1]($2)');
}

async function importGuides() {
  console.log('Starting import from:', sourceDir);
  console.log('Target directory:', targetDir);

  const files = fs.readdirSync(sourceDir);
  const guideFiles = files.filter(f => {
    const match = f.match(/^(\d+) -/);
    if (!match) return false;
    const num = parseInt(match[1], 10);
    return num >= fileRange.start && num <= fileRange.end && f.endsWith('.md');
  });

  console.log(`Found ${guideFiles.length} guide files (${fileRange.start}-${fileRange.end})`);

  let imported = 0;
  let skipped = 0;

  for (const filename of guideFiles) {
    const title = extractTitle(filename);
    const slug = slugify(title);
    const sourceFile = path.join(sourceDir, filename);
    const targetGuideDir = path.join(targetDir, slug);
    const targetFile = path.join(targetGuideDir, 'TFT.md');

    console.log(`\nProcessing: ${filename}`);
    console.log(`  Title: ${title}`);
    console.log(`  Slug: ${slug}`);

    // Read source file
    let content = fs.readFileSync(sourceFile, 'utf-8');

    // Process frontmatter
    const newFrontmatter = processFrontmatter(content, title);
    if (!newFrontmatter) {
      console.error(`  ❌ Skipped (no valid frontmatter)`);
      skipped++;
      continue;
    }

    // Replace frontmatter (handle both line endings)
    content = content.replace(/^---[\r\n]+[\s\S]*?[\r\n]+---/, newFrontmatter);

    // Fix image paths
    content = fixImagePaths(content);

    // Create target directory
    if (!fs.existsSync(targetGuideDir)) {
      fs.mkdirSync(targetGuideDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(targetFile, content, 'utf-8');
    console.log(`  ✅ Imported to: ${path.relative(projectRoot, targetFile)}`);
    imported++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`\nNext steps:`);
  console.log(`1. Run: npm run check:guide-contract`);
  console.log(`2. Copy images from Obsidian attachments to public/guides/<slug>/`);
  console.log(`3. Run: npm run publish:guide -- content/guides/<slug>/TFT.md`);
}

importGuides().catch(console.error);
