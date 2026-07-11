import type { ParsedBook } from "./types";
import { parseBook } from "./parseBook";

// Vite: import every book's raw markdown text at build time.
const raw = import.meta.glob("../books/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

const parsed: ParsedBook[] = Object.entries(raw)
  .map(([path, md]) => parseBook(md, slugFromPath(path)))
  .sort((a, b) => a.meta.title.localeCompare(b.meta.title));

export const books: ParsedBook[] = parsed;

export function getBook(id: string): ParsedBook | undefined {
  return parsed.find((b) => b.meta.id === id);
}
