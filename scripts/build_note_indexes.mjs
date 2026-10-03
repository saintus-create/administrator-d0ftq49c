#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'fern/docs/pages/notes';
const categories = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

for (const category of categories) {
  const directory = path.join(root, category);
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mdx')).sort();
  const links = files.map((filename) => {
    const source = fs.readFileSync(path.join(directory, filename), 'utf8');
    const title = source.match(/^title: "(.*)"$/m)?.[1]?.replace(/\\"/g, '"') || filename;
    return `- [${title.replace(/[\[\]]/g, '\\$&')}](./${filename.slice(0, -4)})`;
  });
  const label = category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const page = `---\ntitle: ${JSON.stringify(`${label} notes`)}\nslug: ${JSON.stringify(`notes-${category}`)}\n---\n\n${files.length} notes categorized as **${label}**.\n\n${links.join('\n')}\n`;
  fs.writeFileSync(path.join(directory, 'index.mdx'), page, 'utf8');
}

console.log(`Built indexes for ${categories.length} categories.`);
