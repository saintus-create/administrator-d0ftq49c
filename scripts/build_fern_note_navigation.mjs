#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const docsFile = 'fern/docs.yml';
const notesRoot = 'fern/docs/pages/notes';
const docs = fs.readFileSync(docsFile, 'utf8');
const start = '      # BEGIN GENERATED NOTES NAVIGATION';
const end = '      # END GENERATED NOTES NAVIGATION';

const categories = fs.readdirSync(notesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

// Individual notes remain discoverable through category indexes and site search.
// The global sidebar should contain categories, not thousands of separate links.
const lines = [start];
for (const category of categories) {
  const label = category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  lines.push(`      - section: ${label} notes`);
  lines.push('        contents:');
  lines.push(`          - page: ${label} index`);
  lines.push(`            path: docs/pages/notes/${category}/index.mdx`);
}
lines.push(end);

if (!docs.includes(start) || !docs.includes(end)) {
  throw new Error('Generated navigation markers are missing; docs.yml was not changed.');
}
const updated = docs.replace(new RegExp(`${start}[\\s\\S]*?${end}`), lines.join('\n'));
fs.writeFileSync(docsFile, updated, 'utf8');
console.log(`Added ${categories.length} category links to Fern navigation.`);
