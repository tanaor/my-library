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
    expect(pages[0]).toEqual({ start: 0, end: 10 }); // aaa + bbb both fit; page ends at ccc.start
    expect(pages[1]).toEqual({ start: 10, end: 13 }); // ccc alone on page 2
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
