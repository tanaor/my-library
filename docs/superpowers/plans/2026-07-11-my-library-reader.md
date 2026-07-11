# My Library Reader — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A personal, always-live web reading app: pick a book from a library, read it page-by-page with swipe navigation, highlight text and attach notes, and have position + highlights sync across devices.

**Architecture:** React SPA (Vite) deployed to GitHub Pages. Books are Markdown files bundled at build time. All reader logic is anchored to **character offsets in the book's normalized plain text** — pagination, saved position, and highlights are offset ranges, making them robust across screen sizes and font sizes. Position and highlights persist per-user in Supabase (Postgres + Auth). Pure logic (parsing, pagination packing, offset↔page resolution, highlight intersection) is TDD'd with an injectable height measurer; DOM measuring and React UI are integration/manual-verified.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind 4, Supabase JS, Vitest. Mirrors the existing `the-living-word` project.

---

## File Structure

```
src/
  main.tsx                 App entry (reused pattern)
  App.tsx                  Top-level: auth gate → Library or Reader routing (view state)
  index.css                Tailwind import + base styles
  lib/
    supabase.ts            Supabase client (copied from the-living-word)
    types.ts               Shared types: BookMeta, Block, ParsedBook, PageRange, Highlight
    parseBook.ts           MD (frontmatter + body) → ParsedBook (blocks + plainText + offsets)
    parseBook.test.ts
    paginate.ts            Pure pagination packing over an injectable measurer → PageRange[]
    paginate.test.ts
    reader-math.ts         resolveOffsetToPage, progressPercent, rangesOverlap, highlightSegmentsForBlock
    reader-math.test.ts
    measure.ts             DOM height measurer factory (createMeasurer)
    books.ts               Loads bundled books via import.meta.glob, exposes manifest + getBook
    pageCache.ts           localStorage cache of page-break offsets keyed by book+font+width
  hooks/
    useAuth.ts             Session + signIn/signUp/signOut (copied/trimmed from the-living-word)
    useProgress.ts         Load/save reading position for (user, book) in Supabase
    useHighlights.ts       CRUD highlights for (user, book) in Supabase
  components/
    AuthPage.tsx           Email/password sign in (copied/trimmed)
    LibraryPage.tsx        Grid of book covers + progress
    BookCover.tsx          Cover image OR generated text cover
    ReaderPage.tsx         Paginated reader: paging, gestures, selection toolbar, top bar
    SelectionToolbar.tsx   Floating Highlight / Add note toolbar on text selection
    NotesPanel.tsx         Slide-over list of highlights/notes; jump-to
    Spinner.tsx            Small loading indicator
  books/
    breakthrough-advertising.md
    e5-method.md
supabase/
  migrations/0001_reader.sql   Tables + RLS
.github/workflows/deploy.yml    GitHub Pages deploy (copied)
index.html, vite.config.ts, tailwind, tsconfig, package.json, public/manifest.json
```

---

## Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.env.example`, `vitest.config.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "my-library",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.105.4",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.0",
    "@types/node": "^24.12.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4.3.0",
    "typescript": "~6.0.2",
    "vite": "^8.0.12",
    "vitest": "^3.2.6"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", globals: true },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#1a1a1a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>My Library</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/index.css`, `src/main.tsx`, minimal `src/App.tsx`**

`src/index.css`:
```css
@import "tailwindcss";

html, body, #root { height: 100%; margin: 0; }
body { background: #1a1a1a; color: #e8e8e8; font-family: system-ui, -apple-system, sans-serif; }
* { -webkit-tap-highlight-color: transparent; }
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (placeholder, replaced in Task 9):
```tsx
export default function App() {
  return <div className="p-8 text-center">My Library</div>;
}
```

`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 5: Install and verify build**

Run: `cd /Users/galyaacobi/projects/my-library && npm install && npm run build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + Tailwind + Vitest project"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write the types**

```ts
export interface BookMeta {
  id: string;
  title: string;
  author: string;
  cover?: string;
}

export type BlockType = "heading" | "paragraph";

/** A block of the book. `start`/`end` are offsets into ParsedBook.plainText. */
export interface Block {
  type: BlockType;
  text: string;
  start: number; // inclusive
  end: number;   // exclusive (== start + text.length)
}

export interface ParsedBook {
  meta: BookMeta;
  blocks: Block[];
  plainText: string;
  length: number; // plainText.length
}

/** A page is a contiguous half-open offset range [start, end). */
export interface PageRange {
  start: number;
  end: number;
}

export interface Highlight {
  id: string;
  book_id: string;
  start_off: number;
  end_off: number;
  quote: string;
  note: string | null;
  color: string;
  created_at?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: shared reader types"
```

---

## Task 3: Book parser (MD → ParsedBook)

Parses YAML-ish frontmatter (`title`, `author`, `id`, `cover`) and the Markdown body into heading/paragraph blocks with monotonic offsets. `plainText` is the blocks' text joined by `"\n\n"`; block offsets index into it.

**Files:**
- Create: `src/lib/parseBook.ts`, `src/lib/parseBook.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/parseBook.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseBook } from "./parseBook";

const SAMPLE = `---
id: sample
title: Sample Book
author: Jane Doe
---

## Chapter One

First paragraph here.

Second paragraph, a bit longer.

# Part Two

Final paragraph.
`;

describe("parseBook", () => {
  it("reads frontmatter into meta", () => {
    const b = parseBook(SAMPLE, "fallback-id");
    expect(b.meta).toEqual({ id: "sample", title: "Sample Book", author: "Jane Doe", cover: undefined });
  });

  it("falls back to the given id and Unknown author when frontmatter missing", () => {
    const b = parseBook("Just text.\n", "the-slug");
    expect(b.meta.id).toBe("the-slug");
    expect(b.meta.author).toBe("Unknown");
    expect(b.meta.title).toBe("the-slug");
  });

  it("splits body into heading and paragraph blocks", () => {
    const b = parseBook(SAMPLE, "sample");
    expect(b.blocks.map((x) => x.type)).toEqual([
      "heading", "paragraph", "paragraph", "heading", "paragraph",
    ]);
    expect(b.blocks[0].text).toBe("Chapter One");
    expect(b.blocks[3].text).toBe("Part Two");
  });

  it("produces monotonic offsets that index into plainText", () => {
    const b = parseBook(SAMPLE, "sample");
    let prev = -1;
    for (const blk of b.blocks) {
      expect(blk.start).toBeGreaterThan(prev);
      expect(blk.end).toBe(blk.start + blk.text.length);
      expect(b.plainText.slice(blk.start, blk.end)).toBe(blk.text);
      prev = blk.start;
    }
    expect(b.length).toBe(b.plainText.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- parseBook`
Expected: FAIL — cannot find module `./parseBook`.

- [ ] **Step 3: Write the implementation**

`src/lib/parseBook.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- parseBook`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseBook.ts src/lib/parseBook.test.ts
git commit -m "feat: parse book markdown into blocks with offsets"
```

---

## Task 4: Pagination packing (pure, injectable measurer)

Packs blocks into pages given a height `measure(text, type)` function, a page height, and a gap between blocks. Splits blocks taller than a page on word boundaries. Returns contiguous `PageRange[]` tiling `[firstBlock.start, lastBlock.end)`.

**Files:**
- Create: `src/lib/paginate.ts`, `src/lib/paginate.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/paginate.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { paginate } from "./paginate";
import type { Block } from "./types";

// Fake measurer: 10 chars per line, 1 unit per line. pageHeight in "lines".
const CPL = 10;
const measure = (text: string) => Math.max(1, Math.ceil(text.length / CPL));

function blocksFrom(texts: [Block["type"], string][]): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;
  for (const [type, text] of texts) {
    blocks.push({ type, text, start: cursor, end: cursor + text.length });
    cursor += text.length + 2;
  }
  return blocks;
}

describe("paginate", () => {
  it("returns one page when everything fits", () => {
    const blocks = blocksFrom([["paragraph", "short"]]);
    const pages = paginate(blocks, measure, 10, 0);
    expect(pages).toEqual([{ start: 0, end: 5 }]);
  });

  it("starts a new page when a block does not fit in remaining space", () => {
    // each block = 1 line; pageHeight 2 lines, gap 0 -> 2 blocks per page
    const blocks = blocksFrom([
      ["paragraph", "aaa"], ["paragraph", "bbb"], ["paragraph", "ccc"],
    ]);
    const pages = paginate(blocks, measure, 2, 0);
    expect(pages.length).toBe(2);
    expect(pages[0]).toEqual({ start: 0, end: 5 });   // aaa..bbb (bbb.start=5)
    expect(pages[1].start).toBe(10);                   // ccc.start
  });

  it("splits a block taller than a page across pages on word boundaries", () => {
    // 6 words of 9 chars + spaces; pageHeight 2 lines (~20 chars) forces splits
    const text = "aaaaaaaaa bbbbbbbbb ccccccccc ddddddddd eeeeeeeee fffffffff";
    const blocks = blocksFrom([["paragraph", text]]);
    const pages = paginate(blocks, measure, 2, 0);
    expect(pages.length).toBeGreaterThan(1);
    // pages tile contiguously and cover the whole block
    expect(pages[0].start).toBe(0);
    expect(pages[pages.length - 1].end).toBe(text.length);
    for (let i = 1; i < pages.length; i++) {
      expect(pages[i].start).toBe(pages[i - 1].end);
    }
    // every break lands on a word boundary (char before break is a space or is text end)
    for (const p of pages) {
      if (p.end < text.length) expect(text[p.end - 1]).toBe(" ");
    }
  });

  it("returns a single empty page for no blocks", () => {
    expect(paginate([], measure, 10, 0)).toEqual([{ start: 0, end: 0 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- paginate`
Expected: FAIL — cannot find module `./paginate`.

- [ ] **Step 3: Write the implementation**

`src/lib/paginate.ts`:
```ts
import type { Block, PageRange } from "./types";

export type Measure = (text: string, type: Block["type"]) => number;

/** Indices in `text` at which a page break is allowed (after each space, and text end). */
function wordBreaks(text: string): number[] {
  const bounds: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === " ") bounds.push(i + 1);
  if (bounds[bounds.length - 1] !== text.length) bounds.push(text.length);
  return bounds;
}

/** Largest prefix length of `text` whose measured height <= avail; 0 if none fits. */
function largestPrefix(text: string, type: Block["type"], avail: number, measure: Measure): number {
  const bounds = wordBreaks(text);
  let lo = 0, hi = bounds.length - 1, best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (measure(text.slice(0, bounds[mid]), type) <= avail) { best = bounds[mid]; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

export function paginate(blocks: Block[], measure: Measure, pageHeight: number, blockGap: number): PageRange[] {
  if (blocks.length === 0) return [{ start: 0, end: 0 }];

  const pages: PageRange[] = [];
  let pageStart = blocks[0].start;
  let used = 0;

  const closePage = (end: number) => {
    pages.push({ start: pageStart, end });
    pageStart = end;
    used = 0;
  };

  for (const block of blocks) {
    const gap = used > 0 ? blockGap : 0;
    const full = measure(block.text, block.type);

    if (used + gap + full <= pageHeight) {
      used += gap + full; // whole block fits on current page
      continue;
    }
    if (used > 0 && full <= pageHeight) {
      closePage(block.start); // block fits on a fresh page: move it there whole
      used = full;
      continue;
    }

    // Block is taller than a full page (or we're already on a fresh page): split it.
    let localStart = block.start; // absolute offset of unplaced remainder
    while (localStart < block.end) {
      const gap2 = used > 0 ? blockGap : 0;
      const avail = pageHeight - used - gap2;
      const remainder = block.text.slice(localStart - block.start);
      let fit = avail > 0 ? largestPrefix(remainder, block.type, avail, measure) : 0;

      if (fit <= 0) {
        if (used > 0) { closePage(localStart); continue; } // no room; try a fresh page
        // Fresh page still can't fit one word: force the first word to avoid an infinite loop.
        fit = wordBreaks(remainder)[0];
      }
      used += gap2 + measure(remainder.slice(0, fit), block.type);
      localStart += fit;
      if (localStart < block.end) closePage(localStart); // more remainder → break page here
    }
  }

  closePage(blocks[blocks.length - 1].end);
  return pages;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- paginate`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/paginate.ts src/lib/paginate.test.ts
git commit -m "feat: pure pagination packing with word-boundary splitting"
```

---

## Task 5: Reader math (offset↔page, progress, highlight intersection)

**Files:**
- Create: `src/lib/reader-math.ts`, `src/lib/reader-math.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/reader-math.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveOffsetToPage, progressPercent, highlightSegmentsForBlock } from "./reader-math";
import type { PageRange, Block, Highlight } from "./types";

const pages: PageRange[] = [
  { start: 0, end: 100 },
  { start: 100, end: 250 },
  { start: 250, end: 400 },
];

describe("resolveOffsetToPage", () => {
  it("finds the page containing an offset", () => {
    expect(resolveOffsetToPage(pages, 0)).toBe(0);
    expect(resolveOffsetToPage(pages, 99)).toBe(0);
    expect(resolveOffsetToPage(pages, 100)).toBe(1);
    expect(resolveOffsetToPage(pages, 399)).toBe(2);
  });
  it("clamps out-of-range offsets", () => {
    expect(resolveOffsetToPage(pages, -5)).toBe(0);
    expect(resolveOffsetToPage(pages, 9999)).toBe(2);
  });
});

describe("progressPercent", () => {
  it("computes percent through the book", () => {
    expect(progressPercent(0, 400)).toBe(0);
    expect(progressPercent(200, 400)).toBe(50);
    expect(progressPercent(400, 400)).toBe(100);
  });
  it("handles empty book", () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe("highlightSegmentsForBlock", () => {
  const block: Block = { type: "paragraph", text: "Hello brave new world", start: 10, end: 31 };
  it("returns block-local highlighted ranges intersected with the block", () => {
    // highlight covers absolute 16..21 -> "brave"
    const hls: Highlight[] = [
      { id: "h1", book_id: "b", start_off: 16, end_off: 21, quote: "brave", note: null, color: "yellow" },
    ];
    const segs = highlightSegmentsForBlock(block, hls);
    expect(segs).toEqual([{ start: 6, end: 11, id: "h1" }]);
    expect(block.text.slice(6, 11)).toBe("brave");
  });
  it("clamps a highlight that spans the block boundary", () => {
    const hls: Highlight[] = [
      { id: "h2", book_id: "b", start_off: 0, end_off: 100, quote: "", note: null, color: "yellow" },
    ];
    const segs = highlightSegmentsForBlock(block, hls);
    expect(segs).toEqual([{ start: 0, end: 21, id: "h2" }]);
  });
  it("ignores highlights that do not overlap", () => {
    const hls: Highlight[] = [
      { id: "h3", book_id: "b", start_off: 0, end_off: 5, quote: "", note: null, color: "yellow" },
    ];
    expect(highlightSegmentsForBlock(block, hls)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- reader-math`
Expected: FAIL — cannot find module `./reader-math`.

- [ ] **Step 3: Write the implementation**

`src/lib/reader-math.ts`:
```ts
import type { PageRange, Block, Highlight } from "./types";

export function resolveOffsetToPage(pages: PageRange[], offset: number): number {
  if (pages.length === 0) return 0;
  if (offset <= pages[0].start) return 0;
  for (let i = 0; i < pages.length; i++) {
    if (offset >= pages[i].start && offset < pages[i].end) return i;
  }
  return pages.length - 1;
}

export function progressPercent(offset: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((offset / length) * 100)));
}

export interface BlockSegment { start: number; end: number; id: string }

/** Highlighted sub-ranges of a block, in block-local coordinates. */
export function highlightSegmentsForBlock(block: Block, highlights: Highlight[]): BlockSegment[] {
  const segs: BlockSegment[] = [];
  for (const h of highlights) {
    const s = Math.max(block.start, h.start_off);
    const e = Math.min(block.end, h.end_off);
    if (s < e) segs.push({ start: s - block.start, end: e - block.start, id: h.id });
  }
  return segs.sort((a, b) => a.start - b.start);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- reader-math`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reader-math.ts src/lib/reader-math.test.ts
git commit -m "feat: reader math — offset/page resolution, progress, highlight segments"
```

---

## Task 6: Supabase client, schema migration, book loader, measurer, page cache

**Files:**
- Create: `src/lib/supabase.ts`, `supabase/migrations/0001_reader.sql`, `src/lib/books.ts`, `src/lib/measure.ts`, `src/lib/pageCache.ts`

- [ ] **Step 1: `src/lib/supabase.ts`** (copy of the-living-word)

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: `supabase/migrations/0001_reader.sql`**

```sql
create table if not exists reading_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  "offset" int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  start_off int not null,
  end_off int not null,
  quote text not null default '',
  note text,
  color text not null default 'yellow',
  created_at timestamptz not null default now()
);
create index if not exists highlights_user_book_idx on highlights (user_id, book_id);

alter table reading_progress enable row level security;
alter table highlights enable row level security;

create policy "own progress" on reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own highlights" on highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Note in the plan: this SQL must be run once in the Supabase SQL editor for the target project (documented in Task 12).

- [ ] **Step 3: `src/lib/books.ts`** — load bundled Markdown at build time

```ts
import type { ParsedBook } from "./types";
import { parseBook } from "./parseBook";

// Vite: import every book's raw markdown text.
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
```

- [ ] **Step 4: `src/lib/measure.ts`** — real DOM height measurer

```ts
import type { Block } from "./types";

export interface MeasurerStyle {
  widthPx: number;
  fontSizePx: number;
  lineHeight: number;
  headingScale: number; // heading font = fontSizePx * headingScale
}

/** Creates an offscreen measurer that reports rendered height (px) for a block's text. */
export function createMeasurer(style: MeasurerStyle) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute", visibility: "hidden", pointerEvents: "none",
    left: "-9999px", top: "0",
    width: `${style.widthPx}px`,
    lineHeight: String(style.lineHeight),
    fontFamily: "system-ui, -apple-system, sans-serif",
    whiteSpace: "normal", wordBreak: "normal", overflowWrap: "break-word",
    boxSizing: "border-box",
  } as CSSStyleDeclaration);
  document.body.appendChild(el);

  const measure = (text: string, type: Block["type"]): number => {
    el.style.fontSize = `${type === "heading" ? style.fontSizePx * style.headingScale : style.fontSizePx}px`;
    el.style.fontWeight = type === "heading" ? "700" : "400";
    el.textContent = text;
    return el.getBoundingClientRect().height;
  };

  const destroy = () => el.remove();
  return { measure, destroy };
}
```

- [ ] **Step 5: `src/lib/pageCache.ts`** — cache page breaks in localStorage

```ts
import type { PageRange } from "./types";

const key = (bookId: string, fontSizePx: number, widthPx: number, heightPx: number) =>
  `pages:${bookId}:${fontSizePx}:${widthPx}:${heightPx}`;

export function loadPages(bookId: string, fontSizePx: number, widthPx: number, heightPx: number): PageRange[] | null {
  try {
    const raw = localStorage.getItem(key(bookId, fontSizePx, widthPx, heightPx));
    return raw ? (JSON.parse(raw) as PageRange[]) : null;
  } catch { return null; }
}

export function savePages(bookId: string, fontSizePx: number, widthPx: number, heightPx: number, pages: PageRange[]): void {
  try { localStorage.setItem(key(bookId, fontSizePx, widthPx, heightPx), JSON.stringify(pages)); } catch { /* quota */ }
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS (types compile). Books glob resolves even before real books exist (empty is fine).

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts supabase/migrations/0001_reader.sql src/lib/books.ts src/lib/measure.ts src/lib/pageCache.ts
git commit -m "feat: supabase client, schema, book loader, DOM measurer, page cache"
```

---

## Task 7: Auth hook + AuthPage

**Files:**
- Create: `src/hooks/useAuth.ts`, `src/components/AuthPage.tsx`, `src/components/Spinner.tsx`

- [ ] **Step 1: `src/hooks/useAuth.ts`** (trimmed from the-living-word — no profiles table)

```ts
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return { session, loading, signUp, signIn, signOut };
}
```

- [ ] **Step 2: `src/components/Spinner.tsx`**

```tsx
export default function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-200" />
    </div>
  );
}
```

- [ ] **Step 3: `src/components/AuthPage.tsx`**

```tsx
import { useState } from "react";

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export default function AuthPage({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      if (mode === "signIn") await onSignIn(email, password);
      else await onSignUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-semibold">My Library</h1>
        <input className="w-full rounded-lg bg-neutral-800 px-4 py-3 outline-none"
          type="email" placeholder="Email" value={email} required
          onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-lg bg-neutral-800 px-4 py-3 outline-none"
          type="password" placeholder="Password" value={password} required minLength={6}
          onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy}
          className="w-full rounded-lg bg-neutral-100 py-3 font-medium text-neutral-900 disabled:opacity-50">
          {busy ? "…" : mode === "signIn" ? "Sign in" : "Create account"}
        </button>
        <button type="button" className="w-full text-sm text-neutral-400"
          onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(""); }}>
          {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.ts src/components/AuthPage.tsx src/components/Spinner.tsx
git commit -m "feat: email/password auth hook and page"
```

---

## Task 8: Data hooks — useProgress and useHighlights

**Files:**
- Create: `src/hooks/useProgress.ts`, `src/hooks/useHighlights.ts`

- [ ] **Step 1: `src/hooks/useProgress.ts`**

```ts
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/** Loads the saved offset for (user, book) and returns a debounced saver. */
export function useProgress(userId: string, bookId: string) {
  const [offset, setOffset] = useState<number | null>(null); // null = loading
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    setOffset(null);
    supabase.from("reading_progress").select("offset").eq("user_id", userId).eq("book_id", bookId).maybeSingle()
      .then(({ data }) => { if (alive) setOffset(data?.offset ?? 0); });
    return () => { alive = false; };
  }, [userId, bookId]);

  const save = (nextOffset: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void supabase.from("reading_progress").upsert(
        { user_id: userId, book_id: bookId, offset: nextOffset, updated_at: new Date().toISOString() },
        { onConflict: "user_id,book_id" },
      );
    }, 600);
  };

  return { offset, save };
}
```

- [ ] **Step 2: `src/hooks/useHighlights.ts`**

```ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Highlight } from "../lib/types";

export function useHighlights(userId: string, bookId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("highlights")
      .select("*").eq("user_id", userId).eq("book_id", bookId)
      .order("start_off", { ascending: true });
    setHighlights((data as Highlight[]) ?? []);
  }, [userId, bookId]);

  useEffect(() => { void reload(); }, [reload]);

  const addHighlight = useCallback(async (startOff: number, endOff: number, quote: string, note: string | null) => {
    const { data } = await supabase.from("highlights")
      .insert({ user_id: userId, book_id: bookId, start_off: startOff, end_off: endOff, quote, note, color: "yellow" })
      .select("*").single();
    if (data) setHighlights((h) => [...h, data as Highlight].sort((a, b) => a.start_off - b.start_off));
    return data as Highlight | null;
  }, [userId, bookId]);

  const updateNote = useCallback(async (id: string, note: string) => {
    await supabase.from("highlights").update({ note }).eq("id", id);
    setHighlights((h) => h.map((x) => (x.id === id ? { ...x, note } : x)));
  }, []);

  const removeHighlight = useCallback(async (id: string) => {
    await supabase.from("highlights").delete().eq("id", id);
    setHighlights((h) => h.filter((x) => x.id !== id));
  }, []);

  return { highlights, addHighlight, updateNote, removeHighlight, reload };
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useProgress.ts src/hooks/useHighlights.ts
git commit -m "feat: progress and highlights data hooks"
```

---

## Task 9: App shell + Library + BookCover

**Files:**
- Create: `src/components/BookCover.tsx`, `src/components/LibraryPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: `src/components/BookCover.tsx`**

```tsx
import type { BookMeta } from "../lib/types";

const PALETTE = ["#7c3aed", "#0891b2", "#b45309", "#be123c", "#15803d", "#4338ca"];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function BookCover({ meta, percent }: { meta: BookMeta; percent: number }) {
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-lg">
      {meta.cover ? (
        <img src={meta.cover} alt={meta.title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-3 text-white"
          style={{ background: colorFor(meta.id) }}>
          <span className="text-sm font-semibold leading-tight">{meta.title}</span>
          <span className="text-xs opacity-80">{meta.author}</span>
        </div>
      )}
      {percent > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-center text-[11px]">
          {percent}%
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/LibraryPage.tsx`**

```tsx
import { useEffect, useState } from "react";
import { books } from "../lib/books";
import { supabase } from "../lib/supabase";
import { progressPercent } from "../lib/reader-math";
import BookCover from "./BookCover";

export default function LibraryPage({ userId, onOpen, onSignOut }:
  { userId: string; onOpen: (bookId: string) => void; onSignOut: () => void }) {
  const [percents, setPercents] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("reading_progress").select("book_id, offset").eq("user_id", userId).then(({ data }) => {
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        const book = books.find((b) => b.meta.id === row.book_id);
        if (book) map[row.book_id] = progressPercent(row.offset, book.length);
      }
      setPercents(map);
    });
  }, [userId]);

  return (
    <div className="mx-auto max-w-2xl p-5">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Library</h1>
        <button className="text-sm text-neutral-400" onClick={onSignOut}>Sign out</button>
      </header>
      {books.length === 0 ? (
        <p className="text-neutral-500">No books yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {books.map((b) => (
            <button key={b.meta.id} onClick={() => onOpen(b.meta.id)} className="text-left">
              <BookCover meta={b.meta} percent={percents[b.meta.id] ?? 0} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `src/App.tsx`** — auth gate + view routing

```tsx
import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthPage from "./components/AuthPage";
import LibraryPage from "./components/LibraryPage";
import ReaderPage from "./components/ReaderPage";
import Spinner from "./components/Spinner";

export default function App() {
  const { session, loading, signIn, signUp, signOut } = useAuth();
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (!session) return <AuthPage onSignIn={signIn} onSignUp={signUp} />;

  if (openBookId) {
    return <ReaderPage userId={session.user.id} bookId={openBookId} onBack={() => setOpenBookId(null)} />;
  }
  return <LibraryPage userId={session.user.id} onOpen={setOpenBookId} onSignOut={signOut} />;
}
```

- [ ] **Step 4: Verify build** (will fail until ReaderPage exists — create a temporary stub)

Create temporary `src/components/ReaderPage.tsx`:
```tsx
export default function ReaderPage({ onBack }: { userId: string; bookId: string; onBack: () => void }) {
  return <button onClick={onBack}>← Back</button>;
}
```
Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BookCover.tsx src/components/LibraryPage.tsx src/App.tsx src/components/ReaderPage.tsx
git commit -m "feat: app shell, library page, book covers"
```

---

## Task 10: ReaderPage — pagination, paging gestures, top bar, font size

Replaces the ReaderPage stub with the full paginated reader (highlights rendering + selection added in Task 11).

**Files:**
- Modify: `src/components/ReaderPage.tsx`

- [ ] **Step 1: Full ReaderPage (without selection/highlights yet)**

```tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getBook } from "../lib/books";
import { paginate } from "../lib/paginate";
import { createMeasurer } from "../lib/measure";
import { loadPages, savePages } from "../lib/pageCache";
import { resolveOffsetToPage, progressPercent } from "../lib/reader-math";
import { useProgress } from "../hooks/useProgress";
import type { PageRange, Block } from "../lib/types";
import Spinner from "./Spinner";

const FONT_SIZES = [17, 20, 24];
const FONT_KEY = "reader:fontSize";
const LINE_HEIGHT = 1.6;
const BLOCK_GAP = 18; // px between blocks — matches CSS margin below

function blocksOnPage(blocks: Block[], page: PageRange): { block: Block; text: string }[] {
  const out: { block: Block; text: string }[] = [];
  for (const b of blocks) {
    const s = Math.max(b.start, page.start);
    const e = Math.min(b.end, page.end);
    if (s < e) out.push({ block: b, text: b.text.slice(s - b.start, e - b.start) });
  }
  return out;
}

export default function ReaderPage({ userId, bookId, onBack }:
  { userId: string; bookId: string; onBack: () => void }) {
  const book = getBook(bookId);
  const { offset, save } = useProgress(userId, bookId);

  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem(FONT_KEY)) || FONT_SIZES[1]);
  const [pages, setPages] = useState<PageRange[] | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const areaRef = useRef<HTMLDivElement>(null);

  // Measure the reading area (content box) once mounted and on resize.
  useEffect(() => {
    const measure = () => {
      const el = areaRef.current;
      if (!el) return;
      setDims({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Compute (or load cached) pages whenever book/font/dims change.
  useEffect(() => {
    if (!book || !dims || dims.w === 0 || dims.h === 0) return;
    const cached = loadPages(bookId, fontSize, dims.w, dims.h);
    if (cached) { setPages(cached); return; }
    const { measure, destroy } = createMeasurer({
      widthPx: dims.w, fontSizePx: fontSize, lineHeight: LINE_HEIGHT, headingScale: 1.3,
    });
    const computed = paginate(book.blocks, measure, dims.h, BLOCK_GAP);
    destroy();
    savePages(bookId, fontSize, dims.w, dims.h, computed);
    setPages(computed);
  }, [book, bookId, fontSize, dims]);

  // When pages and saved offset are both ready, jump to the saved page (once per pages build).
  const restoredFor = useRef<PageRange[] | null>(null);
  useEffect(() => {
    if (pages && offset != null && restoredFor.current !== pages) {
      setPageIndex(resolveOffsetToPage(pages, offset));
      restoredFor.current = pages;
    }
  }, [pages, offset]);

  const goto = useCallback((next: number) => {
    if (!pages) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, next));
    setPageIndex(clamped);
    save(pages[clamped].start);
  }, [pages, save]);

  // Swipe handling
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) goto(pageIndex + (dx < 0 ? 1 : -1));
    touch.current = null;
  };

  const changeFont = (size: number) => {
    setFontSize(size);
    localStorage.setItem(FONT_KEY, String(size));
    setPages(null);
    restoredFor.current = null; // re-restore position onto the new pagination
  };

  const visible = useMemo(
    () => (book && pages ? blocksOnPage(book.blocks, pages[pageIndex]) : []),
    [book, pages, pageIndex],
  );

  if (!book) return <div className="p-6">Book not found. <button onClick={onBack} className="underline">Back</button></div>;

  const percent = pages ? progressPercent(pages[pageIndex].start, book.length) : 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 py-2 text-sm text-neutral-400">
        <button onClick={onBack} aria-label="Back">←</button>
        <span>{percent}%</span>
        <div className="flex items-center gap-3">
          {FONT_SIZES.map((s) => (
            <button key={s} onClick={() => changeFont(s)}
              className={s === fontSize ? "text-neutral-100" : ""}
              style={{ fontSize: `${10 + FONT_SIZES.indexOf(s) * 3}px` }}>A</button>
          ))}
        </div>
      </header>

      <div ref={areaRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        className="relative flex-1 overflow-hidden px-6 py-4"
        style={{ fontSize: `${fontSize}px`, lineHeight: LINE_HEIGHT }}>
        {!pages ? <Spinner /> : (
          <>
            {visible.map(({ block, text }, i) => (
              block.type === "heading"
                ? <h2 key={i} className="font-bold" style={{ fontSize: "1.3em", margin: `${BLOCK_GAP}px 0 0` }}>{text}</h2>
                : <p key={i} className="text-justify" style={{ margin: `${BLOCK_GAP}px 0 0` }}>{text}</p>
            ))}
            {/* tap zones for non-touch / fallback */}
            <button aria-label="Previous page" onClick={() => goto(pageIndex - 1)}
              className="absolute left-0 top-0 h-full w-1/4" />
            <button aria-label="Next page" onClick={() => goto(pageIndex + 1)}
              className="absolute right-0 top-0 h-full w-1/4" />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, open on a narrow (mobile) viewport in the browser (DevTools device mode). With at least one book added (Task 12 adds them; for now use a small test md), verify:
- Text splits into pages; swiping/tapping right advances, left goes back.
- Progress % updates; reload the page → returns to the same page.
- Changing font size re-paginates and keeps you near the same spot.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReaderPage.tsx
git commit -m "feat: paginated reader with swipe paging, progress, font size"
```

---

## Task 11: Text selection → highlight + note, highlight rendering, NotesPanel

**Files:**
- Create: `src/components/SelectionToolbar.tsx`, `src/components/NotesPanel.tsx`
- Modify: `src/components/ReaderPage.tsx`

- [ ] **Step 1: `src/components/SelectionToolbar.tsx`**

```tsx
export default function SelectionToolbar({ x, y, onHighlight, onNote }:
  { x: number; y: number; onHighlight: () => void; onNote: () => void }) {
  return (
    <div className="fixed z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-neutral-900 shadow-xl ring-1 ring-neutral-700"
      style={{ left: x, top: y - 8 }}>
      <button onClick={onHighlight} className="px-3 py-2 text-sm">Highlight</button>
      <button onClick={onNote} className="border-l border-neutral-700 px-3 py-2 text-sm">Note</button>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/NotesPanel.tsx`**

```tsx
import type { Highlight } from "../lib/types";

export default function NotesPanel({ highlights, onJump, onDelete, onClose }:
  { highlights: Highlight[]; onJump: (h: Highlight) => void; onDelete: (id: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-80 max-w-[85%] overflow-y-auto bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Notes & Highlights</h2>
          <button onClick={onClose} className="text-neutral-400">✕</button>
        </div>
        {highlights.length === 0 && <p className="text-sm text-neutral-500">Nothing yet.</p>}
        <ul className="space-y-3">
          {highlights.map((h) => (
            <li key={h.id} className="rounded-lg bg-neutral-800 p-3">
              <button onClick={() => onJump(h)} className="block text-left">
                <span className="border-l-2 border-yellow-400 pl-2 text-sm text-neutral-200">{h.quote}</span>
                {h.note && <p className="mt-2 text-sm text-neutral-400">{h.note}</p>}
              </button>
              <button onClick={() => onDelete(h.id)} className="mt-2 text-xs text-red-400">Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire selection + highlight rendering into ReaderPage**

Add imports at the top of `src/components/ReaderPage.tsx`:
```tsx
import { useHighlights } from "../hooks/useHighlights";
import { highlightSegmentsForBlock } from "../lib/reader-math";
import SelectionToolbar from "./SelectionToolbar";
import NotesPanel from "./NotesPanel";
import type { Highlight } from "../lib/types";
```

Add inside the component body (after `useProgress`):
```tsx
const { highlights, addHighlight, updateNote, removeHighlight } = useHighlights(userId, bookId);
const [sel, setSel] = useState<{ x: number; y: number; start: number; end: number; quote: string } | null>(null);
const [notesOpen, setNotesOpen] = useState(false);

// Read the current DOM selection and map it to absolute book offsets via data-offset spans.
const onSelect = useCallback(() => {
  const s = window.getSelection();
  if (!s || s.isCollapsed || s.rangeCount === 0) { setSel(null); return; }
  const range = s.getRangeAt(0);
  const startEl = (range.startContainer.parentElement)?.closest("[data-start]") as HTMLElement | null;
  const endEl = (range.endContainer.parentElement)?.closest("[data-start]") as HTMLElement | null;
  if (!startEl || !endEl) return;
  const startOff = Number(startEl.dataset.start) + range.startOffset;
  const endOff = Number(endEl.dataset.start) + range.endOffset;
  if (endOff <= startOff) { setSel(null); return; }
  const rect = range.getBoundingClientRect();
  setSel({ x: rect.left + rect.width / 2, y: rect.top, start: startOff, end: endOff, quote: s.toString() });
}, []);

const commitHighlight = async (withNote: boolean) => {
  if (!sel) return;
  const note = withNote ? (window.prompt("Note") ?? null) : null;
  await addHighlight(sel.start, sel.end, sel.quote, note);
  window.getSelection()?.removeAllRanges();
  setSel(null);
};

const jumpTo = (h: Highlight) => {
  if (!pages) return;
  setPageIndex(resolveOffsetToPage(pages, h.start_off));
  save(h.start_off);
  setNotesOpen(false);
};
```

Add `onMouseUp={onSelect} onTouchEnd={(e) => { onTouchEnd(e); onSelect(); }}` to the reading-area div (replace the existing `onTouchEnd`). Render each block wrapped so selection maps to offsets, painting highlight segments. Replace the `visible.map(...)` block with:

```tsx
{visible.map(({ block, text }, i) => {
  const segs = highlightSegmentsForBlock(block, highlights);
  const pageStartLocal = pages![pageIndex].start - block.start; // where this page's slice begins in the block
  const sliceStart = Math.max(0, pageStartLocal);
  // Build children with <mark> for highlighted parts, using block-local coords offset by sliceStart.
  const children: React.ReactNode[] = [];
  let cursor = sliceStart;
  const sliceEnd = sliceStart + text.length;
  for (const seg of segs) {
    const s = Math.max(seg.start, sliceStart), e = Math.min(seg.end, sliceEnd);
    if (s >= e) continue;
    if (s > cursor) children.push(block.text.slice(cursor, s));
    children.push(<mark key={`${seg.id}-${s}`} className="bg-yellow-300/80 text-black">{block.text.slice(s, e)}</mark>);
    cursor = e;
  }
  if (cursor < sliceEnd) children.push(block.text.slice(cursor, sliceEnd));

  const common = { "data-start": block.start + sliceStart } as Record<string, unknown>;
  return block.type === "heading"
    ? <h2 key={i} {...common} className="font-bold" style={{ fontSize: "1.3em", margin: `${BLOCK_GAP}px 0 0` }}>{children}</h2>
    : <p key={i} {...common} className="text-justify" style={{ margin: `${BLOCK_GAP}px 0 0` }}>{children}</p>;
})}
```

> Note: `data-start` holds the absolute offset of this rendered slice's first character, so `Number(dataset.start) + range.offset` yields an absolute book offset. Because a page renders each block's slice as a single text run (plus `<mark>` wrappers that are also plain text nodes), `range.startOffset` within a text node maps linearly — for v1 this is accurate when the selection starts/ends within a single block's text node. Selections spanning marks resolve via the nearest `[data-start]` ancestor.

Add the notes button to the header (next to font sizes):
```tsx
<button onClick={() => setNotesOpen(true)} aria-label="Notes">☰</button>
```

Render the toolbar + panel before the component's closing tag:
```tsx
{sel && <SelectionToolbar x={sel.x} y={sel.y} onHighlight={() => commitHighlight(false)} onNote={() => commitHighlight(true)} />}
{notesOpen && <NotesPanel highlights={highlights} onJump={jumpTo} onDelete={removeHighlight} onClose={() => setNotesOpen(false)} />}
```

Keep `updateNote` exported from the hook for future inline editing (used by Delete now; note-editing UI is a follow-up).

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. On a mobile viewport with a real book:
- Select text → toolbar appears → Highlight paints yellow and persists after reload.
- Note prompts, saves, and shows in the panel.
- Open notes panel (☰) → tap an entry → jumps to that page.
- Delete removes it.

- [ ] **Step 5: Commit**

```bash
git add src/components/SelectionToolbar.tsx src/components/NotesPanel.tsx src/components/ReaderPage.tsx
git commit -m "feat: text selection, highlighting, notes panel"
```

---

## Task 12: Add the two books, PWA manifest, deploy workflow, docs

**Files:**
- Create: `src/books/breakthrough-advertising.md`, `src/books/e5-method.md`, `public/manifest.json`, `public/favicon.svg`, `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Clean + add the two books**

Source files (rough OCR):
- `/Users/galyaacobi/Desktop/Obsidian Vaults/Gal Brain/60 - Books/_OceanofPDF.com_Breakthrough_advertising_-_Eugene_Swartz (1).md`
- `/Users/galyaacobi/Desktop/Obsidian Vaults/Gal Brain/60 - Books/_OceanofPDF.com_E5_Method_-_Todd_Brown.md`

For each: strip the leading OCR cover-junk line(s), then prepend frontmatter. Write to `src/books/<slug>.md`:

`src/books/breakthrough-advertising.md` header:
```
---
id: breakthrough-advertising
title: Breakthrough Advertising
author: Eugene Schwartz
---
```
`src/books/e5-method.md` header:
```
---
id: e5-method
title: The E5 Method
author: Todd Brown
---
```

(The engineer copies the cleaned body under the frontmatter. Keep `##`/`#` headings as chapter markers; blank lines separate paragraphs — the parser handles the rest.)

- [ ] **Step 2: `public/manifest.json` + `public/favicon.svg`**

`public/manifest.json`:
```json
{
  "name": "My Library",
  "short_name": "Library",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a",
  "icons": []
}
```
`public/favicon.svg`: a simple book glyph (any minimal SVG).

- [ ] **Step 3: `.github/workflows/deploy.yml`** (copied from the-living-word)

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 4: `README.md`** — setup notes

Document: create a Supabase project (or reuse), run `supabase/migrations/0001_reader.sql` in the SQL editor, put `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env` locally and in GitHub repo secrets, `npm run dev` locally, push to `main` to deploy. Adding a book = drop a cleaned MD in `src/books/` with frontmatter and commit.

- [ ] **Step 5: Verify full build + tests**

Run: `npm run test && npm run build`
Expected: all tests PASS; build succeeds with both books bundled.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add first two books, PWA manifest, deploy workflow, README"
```

---

## Task 13: Create GitHub repo, wire Supabase, deploy

**Files:** none (ops task)

- [ ] **Step 1:** Create the Supabase project (or reuse the-living-word's) and run `supabase/migrations/0001_reader.sql` in the SQL editor. Confirm `reading_progress` and `highlights` exist with RLS enabled.

- [ ] **Step 2:** Create local `.env` with the Supabase URL + anon key. Run `npm run dev`, sign up, add a highlight, confirm rows appear in Supabase.

- [ ] **Step 3:** `gh repo create tanaor/my-library --private --source . --remote origin --push` (or via UI). Add repo secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. In repo Settings → Pages, set source = GitHub Actions.

- [ ] **Step 4:** Push to `main`; wait for the Pages deploy; open the live URL on the phone, sign in, verify a book reads and a highlight syncs from the desktop session.

- [ ] **Step 5: Commit** any config tweaks discovered during deploy.

---

## Notes on spec coverage

- Library + covers + progress → Tasks 9, 5 (progress math), 6 (loader).
- Paginated reader + swipe + progress % → Tasks 4, 10.
- Remember position (offset-based, cross-device) → Tasks 5, 6 (cache), 8 (useProgress), 10.
- Highlight + note + notes list + jump → Tasks 8, 11.
- Cross-device sync + auth → Tasks 6, 7, 8, 13.
- Font size re-pagination keeping position → Task 10 (`changeFont`).
- Add-book flow (MD in repo, frontmatter, auto cover) → Tasks 3, 6, 9, 12.
- Large-book performance (cache page breaks) → Tasks 6 (pageCache), 10.
```
