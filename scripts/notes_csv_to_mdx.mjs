#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [input = 'notes_export.csv', output = 'notes-mdx'] = process.argv.slice(2);

function parseStructured(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
}

function cleanTitle(value) {
  const parsed = parseStructured(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return String(parsed.name ?? parsed.title ?? parsed.summary ?? 'Untitled note').trim();
  }
  return String(value ?? '').trim() || 'Untitled note';
}

function categoryFor(title, text) {
  const value = `${title}\n${text.slice(0, 4000)}`.toLowerCase();
  const groups = [
    ['development', /\b(code|javascript|typescript|python|api|github|bug|server|database|sql|css|html)\b/],
    ['finance', /\b(invoice|budget|bank|tax|payment|expense|invest|stock|finance)\b/],
    ['health', /\b(health|doctor|medical|workout|exercise|diet|medication)\b/],
    ['travel', /\b(travel|flight|hotel|itinerary|airport|trip)\b/],
    ['tasks', /\b(todo|to do|task|reminder|follow up|checklist)\b/],
    ['ideas', /\b(idea|brainstorm|concept|proposal|project)\b/],
    ['journal', /\b(journal|diary|today|yesterday|feeling)\b/],
  ];
  return groups.find(([, expression]) => expression.test(value))?.[0] ?? 'uncategorized';
}

function decodeEntities(value) {
  return String(value || '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/&#x27;/gi, "'");
}

function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, ''));
}

// MDX parses braces and JSX-like tags even in otherwise ordinary text.
// Entities preserve the visible characters without creating expressions/components.
function mdxSafe(text) {
  return String(text).replace(/\r\n?/g, '\n')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;').replace(/}/g, '&#125;').trim();
}

function frontmatter(value) {
  return `---\n${Object.entries(value).map(([key, item]) =>
    `${key}: ${JSON.stringify(item ?? '')}`).join('\n')}\n---\n`;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const stream = fs.createReadStream(input, { encoding: 'utf8' });
  let field = '', row = [], inQuotes = false, quotePending = false, headers = null, count = 0;

  const consume = (values) => {
    if (!headers) { headers = values; return; }
    if (values.length !== headers.length) return;
    const note = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    const structuredName = parseStructured(note.name);
    const title = cleanTitle(note.name);
    let plaintext = note.plaintext?.trim() || htmlToText(note.body);
    const structuredBody = parseStructured(plaintext);
    if (structuredBody && typeof structuredBody === 'object' && !Array.isArray(structuredBody)) {
      plaintext = String(structuredBody.summary ?? structuredBody.plaintext ?? structuredBody.text ?? plaintext);
    }
    const category = categoryFor(title, plaintext);
    const directory = path.join(output, category);
    fs.mkdirSync(directory, { recursive: true });
    const filename = `${String(count + 1).padStart(5, '0')}-${slug(title)}.mdx`;
    const contents = `${frontmatter({
      title, id: note.id, created: note.created, modified: note.modified,
      category, source: 'notes_export.csv'
    })}\n${mdxSafe(plaintext)}\n`;
    fs.writeFileSync(path.join(directory, filename), contents, 'utf8');
    count += 1;
  };

  function slug(value) {
    return String(value || 'untitled').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'untitled';
  }

  for await (const chunk of stream) {
    for (let index = 0; index < chunk.length; index += 1) {
      const character = chunk[index];
      if (inQuotes) {
        if (quotePending) {
          if (character === '"') { field += '"'; quotePending = false; continue; }
          inQuotes = false; quotePending = false;
        } else if (character === '"') { quotePending = true; continue; }
        else { field += character; continue; }
      }
      if (character === '"' && field === '') inQuotes = true;
      else if (character === ',') { row.push(field); field = ''; }
      else if (character === '\n') { row.push(field); field = ''; consume(row); row = []; }
      else if (character !== '\r') field += character;
    }
  }
  if (inQuotes && quotePending) { inQuotes = false; quotePending = false; }
  if (field || row.length) { row.push(field); consume(row); }
  fs.writeFileSync(path.join(output, 'README.md'),
    `# Notes MDX export\n\nGenerated ${count} MDX files from \`${input}\`. Categories are heuristic; retain the original export as the authoritative archive.\n`, 'utf8');
  console.log(`Generated ${count} MDX files in ${output}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
