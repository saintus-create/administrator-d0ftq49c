#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'fern/docs/pages/notes';
const categories = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

function extractTitle(source) {
  const match = source.match(/^title:\s*"([^"]*)"/m);
  if (match) {
    const title = match[1].replace(/\\"/g, '"');
    // If title looks like JSON or is malformed, return null
    if (title.startsWith('[') || title.startsWith('{') || title.includes('uuid')) {
      return null;
    }
    // If title is too short or looks like a filename, return null
    if (title.length < 5) {
      return null;
    }
    return title;
  }
  return null;
}

function sanitizeLabel(str) {
  return String(str)
    .replace(/["{}]/g, '')
    .trim()
    .slice(0, 200);
}

function filenameToLabel(filename) {
  // Remove the .mdx extension
  let label = filename.slice(0, -4);
  
  // Remove UUID patterns (with dashes)
  label = label.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '');
  label = label.replace(/uuid-[a-f0-9-]+/gi, '');
  
  // Remove leading number and dash
  label = label.replace(/^\d+-/, '');
  
  // Remove "name-" prefix if it appears after UUID removal
  label = label.replace(/^name-?/i, '');
  
  // Replace remaining dashes with spaces
  label = label.replace(/-/g, ' ');
  
  // Clean up multiple spaces
  label = label.replace(/\s+/g, ' ');
  
  return label.trim().slice(0, 150);
}

for (const category of categories) {
  const directory = path.join(root, category);
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mdx')).sort();
  const links = files.map((filename) => {
    const source = fs.readFileSync(path.join(directory, filename), 'utf8');
    let title = extractTitle(source);
    let label = title ? sanitizeLabel(title) : filenameToLabel(filename);
    
    // If label is empty or very short, use filename
    if (!label || label.length < 3) {
      label = filenameToLabel(filename);
    }
    return `- [${label}](./${filename.slice(0, -4)})`;
  });
  const categoryLabel = category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const page = `--- 
title: ${JSON.stringify(`${categoryLabel} notes`)}
slug: ${JSON.stringify(`notes-${category}`)}
---

${files.length} notes categorized as **${categoryLabel}**.

${links.join('\n')}
`;
  fs.writeFileSync(path.join(directory, 'index.mdx'), page, 'utf8');
}

console.log(`Built indexes for ${categories.length} categories.`);
