#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const docsFile = 'fern/docs.yml';
const notesRoot = 'fern/docs/pages/notes';
const docs = fs.readFileSync(docsFile, 'utf8');
const start = '      # BEGIN GENERATED NOTES NAVIGATION';
const end = '      # END GENERATED NOTES NAVIGATION';

function titleFrom(file) {
  const source = fs.readFileSync(file, 'utf8');
  return source.match(/^title: "(.*)"$/m)?.[1]?.replace(/\\"/g, '"') ?? path.basename(file, '.mdx');
}

const categories = fs.readdirSync(notesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const lines = [start];
for (const category of categories) {
  const files = fs.readdirSync(path.join(notesRoot, category)).filter((name) => name.endsWith('.mdx') && name !== 'index.mdx').sort();
  const label = category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  lines.push(`      - section: ${label} notes`);
  lines.push(`        slug: notes-${category}`);
  lines.push('        contents:');
  lines.push(`          - page: ${label} index`);
  lines.push(`            path: docs/pages/notes/${category}/index.mdx`);
  for (const filename of files) {
    const title = titleFrom(path.join(notesRoot, category, filename)).replace(/"/g, "'");
    lines.push(`          - page: ${JSON.stringify(title)}`);
    lines.push(`            slug: ${filename.slice(0, -4)}`);
    lines.push(`            path: docs/pages/notes/${category}/${filename}`);
  }
}
lines.push(end);

if (!docs.includes(start) || !docs.includes(end)) throw new Error('Generated navigation markers are missing.');
const updated = docs.replace(new RegExp(`${start}[\\s\\S]*?${end}`), lines.join('\n'));
fs.writeFileSync(docsFile, updated, 'utf8');
console.log(`Added ${categories.length} note sections to Fern navigation.`);
