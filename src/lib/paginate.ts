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
