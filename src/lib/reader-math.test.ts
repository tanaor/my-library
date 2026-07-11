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
