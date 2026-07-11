import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { getBook } from "../lib/books";
import { paginate } from "../lib/paginate";
import { createMeasurer } from "../lib/measure";
import { loadPages, savePages } from "../lib/pageCache";
import { resolveOffsetToPage, progressPercent, highlightSegmentsForBlock } from "../lib/reader-math";
import { useProgress } from "../hooks/useProgress";
import { useHighlights } from "../hooks/useHighlights";
import type { PageRange, Block, Highlight } from "../lib/types";
import Spinner from "./Spinner";
import SelectionToolbar from "./SelectionToolbar";
import NotesPanel from "./NotesPanel";

const FONT_SIZES = [17, 20, 24];
const FONT_KEY = "reader:fontSize";
const LINE_HEIGHT = 1.6;
const HEADING_SCALE = 1.3;
const BLOCK_GAP = 18; // px between blocks — matches the marginTop below

/** The visible [text slice, block] for each block that intersects the page. */
function blocksOnPage(blocks: Block[], page: PageRange): { block: Block; text: string }[] {
  const out: { block: Block; text: string }[] = [];
  for (const b of blocks) {
    const s = Math.max(b.start, page.start);
    const e = Math.min(b.end, page.end);
    if (s < e) out.push({ block: b, text: b.text.slice(s - b.start, e - b.start) });
  }
  return out;
}

/** Total text length before `node` (at `offset`) within `root`, walking text nodes in order. */
function textOffsetWithin(root: HTMLElement, node: Node, offset: number): number {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n === node) return total + offset;
    total += (n.textContent ?? "").length;
  }
  return total;
}

export default function ReaderPage({ userId, bookId, onBack }:
  { userId: string; bookId: string; onBack: () => void }) {
  const book = getBook(bookId);
  const { offset, save } = useProgress(userId, bookId);
  const { highlights, addHighlight, removeHighlight } = useHighlights(userId, bookId);

  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem(FONT_KEY)) || FONT_SIZES[1]);
  const [pages, setPages] = useState<PageRange[] | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [sel, setSel] = useState<{ x: number; y: number; start: number; end: number; quote: string } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);

  // Measure the (padding-free) reading area on mount and resize.
  useEffect(() => {
    const measure = () => {
      const el = areaRef.current;
      if (el) setDims({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Compute (or load cached) pages whenever book / font / dims change.
  useEffect(() => {
    if (!book || !dims || dims.w === 0 || dims.h === 0) return;
    const cached = loadPages(bookId, fontSize, dims.w, dims.h);
    if (cached) { setPages(cached); return; }
    const { measure, destroy } = createMeasurer({
      widthPx: dims.w, fontSizePx: fontSize, lineHeight: LINE_HEIGHT, headingScale: HEADING_SCALE,
    });
    const computed = paginate(book.blocks, measure, dims.h, BLOCK_GAP);
    destroy();
    savePages(bookId, fontSize, dims.w, dims.h, computed);
    setPages(computed);
  }, [book, bookId, fontSize, dims]);

  // When pages and saved offset are both ready, jump to the saved page once per pagination build.
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
    setSel(null);
  }, [pages, save]);

  // Read the current DOM selection and map it to absolute book offsets.
  const readSelection = useCallback(() => {
    const s = window.getSelection();
    if (!s || s.isCollapsed || s.rangeCount === 0) { setSel(null); return; }
    const range = s.getRangeAt(0);
    const startEl = (range.startContainer.parentElement)?.closest("[data-start]") as HTMLElement | null;
    const endEl = (range.endContainer.parentElement)?.closest("[data-start]") as HTMLElement | null;
    if (!startEl || !endEl) { setSel(null); return; }
    const startOff = Number(startEl.dataset.start) + textOffsetWithin(startEl, range.startContainer, range.startOffset);
    const endOff = Number(endEl.dataset.start) + textOffsetWithin(endEl, range.endContainer, range.endOffset);
    if (endOff <= startOff) { setSel(null); return; }
    const rect = range.getBoundingClientRect();
    setSel({ x: rect.left + rect.width / 2, y: rect.top, start: startOff, end: endOff, quote: s.toString() });
  }, []);

  // Swipe handling
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (t) {
      const dx = e.changedTouches[0].clientX - t.x;
      const dy = e.changedTouches[0].clientY - t.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { goto(pageIndex + (dx < 0 ? 1 : -1)); return; }
    }
    readSelection();
  };

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

  const changeFont = (size: number) => {
    setFontSize(size);
    localStorage.setItem(FONT_KEY, String(size));
    setPages(null);
    restoredFor.current = null; // re-restore position onto the new pagination
  };

  const page = pages ? pages[pageIndex] : null;
  const visible = useMemo(
    () => (book && page ? blocksOnPage(book.blocks, page) : []),
    [book, page],
  );

  if (!book) {
    return <div className="p-6">Book not found. <button onClick={onBack} className="underline">Back</button></div>;
  }

  const percent = page ? progressPercent(page.start, book.length) : 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 py-2 text-sm text-neutral-400">
        <button onClick={onBack} aria-label="Back" className="text-lg">←</button>
        <span>{percent}%</span>
        <div className="flex items-center gap-3">
          {FONT_SIZES.map((s, i) => (
            <button
              key={s} onClick={() => changeFont(s)}
              className={s === fontSize ? "text-neutral-100" : ""}
              style={{ fontSize: `${11 + i * 3}px` }}
            >A</button>
          ))}
          <button onClick={() => setNotesOpen(true)} aria-label="Notes" className="text-lg">☰</button>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden p-6">
        <div
          ref={areaRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseUp={readSelection}
          className="h-full w-full overflow-hidden"
          style={{ fontSize: `${fontSize}px`, lineHeight: LINE_HEIGHT }}
        >
          {!pages || !page ? <Spinner /> : (
            visible.map(({ block, text }, i) => {
              const sliceStart = Math.max(block.start, page.start) - block.start;
              const sliceEnd = sliceStart + text.length;
              const dataStart = block.start + sliceStart;
              const segs = highlightSegmentsForBlock(block, highlights);

              const children: ReactNode[] = [];
              let cursor = sliceStart;
              for (const seg of segs) {
                const s = Math.max(seg.start, cursor);
                const e = Math.min(seg.end, sliceEnd);
                if (s >= e) continue;
                if (s > cursor) children.push(block.text.slice(cursor, s));
                children.push(<mark key={`${seg.id}-${s}`} className="bg-yellow-300/80 text-black">{block.text.slice(s, e)}</mark>);
                cursor = e;
              }
              if (cursor < sliceEnd) children.push(block.text.slice(cursor, sliceEnd));

              const style = { marginTop: i === 0 ? 0 : BLOCK_GAP } as React.CSSProperties;
              return block.type === "heading" ? (
                <h2 key={i} data-start={dataStart} className="font-bold" style={{ ...style, fontSize: "1.3em" }}>{children}</h2>
              ) : (
                <p key={i} data-start={dataStart} className="text-justify" style={style}>{children}</p>
              );
            })
          )}
        </div>
      </div>

      {sel && <SelectionToolbar x={sel.x} y={sel.y} onHighlight={() => commitHighlight(false)} onNote={() => commitHighlight(true)} />}
      {notesOpen && <NotesPanel highlights={highlights} onJump={jumpTo} onDelete={removeHighlight} onClose={() => setNotesOpen(false)} />}
    </div>
  );
}
