import type { Block, ParsedBook, BookMeta } from "./types";

function parseFrontmatter(md: string, fallbackId: string): { meta: BookMeta; body: string } {
  const fm = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const meta: BookMeta = { id: fallbackId, title: fallbackId, author: "Unknown", cover: undefined };
  let body = md;
  if (fm) {
    body = md.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^(\w+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (key === "id") meta.id = val;
      else if (key === "title") meta.title = val;
      else if (key === "author") meta.author = val;
      else if (key === "cover") meta.cover = val || undefined;
    }
    if (meta.title === fallbackId && meta.id !== fallbackId) meta.title = meta.id;
  }
  return { meta, body };
}

/** Collapse internal whitespace/newlines within a paragraph to single spaces. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function parseBook(md: string, fallbackId: string): ParsedBook {
  const { meta, body } = parseFrontmatter(md, fallbackId);

  // Split body into raw chunks separated by blank lines.
  const rawChunks = body.split(/\n\s*\n+/);
  const texts: { type: Block["type"]; text: string }[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (heading && !trimmed.includes("\n")) {
      const t = normalize(heading[1].replace(/[*_`]/g, ""));
      if (t) texts.push({ type: "heading", text: t });
    } else {
      const t = normalize(trimmed.replace(/[*_`>#]/g, ""));
      if (t) texts.push({ type: "paragraph", text: t });
    }
  }

  const blocks: Block[] = [];
  const parts: string[] = [];
  let cursor = 0;
  for (const { type, text } of texts) {
    const start = cursor;
    const end = start + text.length;
    blocks.push({ type, text, start, end });
    parts.push(text);
    cursor = end + 2; // account for the "\n\n" joiner
  }

  const plainText = parts.join("\n\n");
  return { meta, blocks, plainText, length: plainText.length };
}
