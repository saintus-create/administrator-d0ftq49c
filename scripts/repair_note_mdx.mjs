#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'fern/docs/pages/notes';
let scanned = 0;
let repaired = 0;

function parseJson(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.mdx') || entry.name === 'index.mdx') continue;
    scanned += 1;
    const source = fs.readFileSync(file, 'utf8');
    const match = source.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) continue;
    const fields = {};
    for (const line of match[1].split('\n')) {
      const item = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      if (!item) continue;
      try { fields[item[1]] = JSON.parse(item[2]); }
      catch { fields[item[1]] = item[2].replace(/^["']|["']$/g, ''); }
    }
    const parsedTitle = parseJson(fields.title);
    const recoveredTitle = parsedTitle && !Array.isArray(parsedTitle)
      ? (parsedTitle.name ?? parsedTitle.title) : null;
    if (!recoveredTitle || typeof recoveredTitle !== 'string' || recoveredTitle === fields.title) continue;
    fields.title = recoveredTitle.trim();
    const frontmatter = `---\n${Object.entries(fields).map(([key, value]) =>
      `${key}: ${JSON.stringify(value ?? '')}`).join('\n')}\n---\n`;
    fs.writeFileSync(file, frontmatter + source.slice(match[0].length), 'utf8');
    repaired += 1;
  }
}

walk(root);
console.log(`Scanned ${scanned} notes; repaired ${repaired} serialized-title metadata fields.`);
