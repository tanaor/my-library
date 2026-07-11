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
