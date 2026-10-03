#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'fern/docs/pages/notes';
const categories = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

function titleFrom(source, fallback) {
  const match = source.match(/^title:\s*(.*)$/m);
  if (!match) return fallback;
  try { return String(JSON.parse(match[1])); }
  catch { return match[1].replace(/^["']|["']$/g, ''); }
}

function markdownLabel(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/\\/g, '\\\\')
    .replace(/([\[\]])/g, '\\\\$1').replace(/\r?\n/g, ' ');
}

for (const category of categories) {
  const directory = path.join(root, category);
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mdx') && name !== 'index.mdx').sort();
  const links = files.map((filename) => {
    const source = fs.readFileSync(path.join(directory, filename), 'utf8');
    return `- [${markdownLabel(titleFrom(source, filename))}](./${filename.slice(0, -4)})`;
  });
  const label = category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const page = `---\ntitle: ${JSON.stringify(`${label} notes`)}\nslug: ${JSON.stringify(`notes-${category}`)}\n---\n\n${files.length} notes categorized as **${label}**.\n\n${links.join('\n')}\n`;
  fs.writeFileSync(path.join(directory, 'index.mdx'), page, 'utf8');
}
console.log(`Built indexes for ${categories.length} categories.`);
