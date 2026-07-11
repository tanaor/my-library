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
