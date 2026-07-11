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
  end: number; // exclusive (== start + text.length)
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
