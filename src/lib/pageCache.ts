import type { PageRange } from "./types";

const key = (bookId: string, fontSizePx: number, widthPx: number, heightPx: number) =>
  `pages:${bookId}:${fontSizePx}:${widthPx}:${heightPx}`;

export function loadPages(bookId: string, fontSizePx: number, widthPx: number, heightPx: number): PageRange[] | null {
  try {
    const raw = localStorage.getItem(key(bookId, fontSizePx, widthPx, heightPx));
    return raw ? (JSON.parse(raw) as PageRange[]) : null;
  } catch {
    return null;
  }
}

export function savePages(bookId: string, fontSizePx: number, widthPx: number, heightPx: number, pages: PageRange[]): void {
  try {
    localStorage.setItem(key(bookId, fontSizePx, widthPx, heightPx), JSON.stringify(pages));
  } catch {
    /* quota exceeded — ignore */
  }
}
