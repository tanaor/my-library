# My Library — Personal Reading App

**Date:** 2026-07-11
**Owner:** Gal Yaacobi
**Status:** Design approved pending review

## Purpose

A personal, always-live web reading app that replaces reading books as raw PDFs.
Gal opens a permanent URL from any device, picks a book from his library, and reads
it in a clean mobile-first interface that remembers where he stopped, lets him
highlight passages, and attach notes he can revisit later. Modeled on the Israeli
"עברית" e-reader app (reference screenshots provided).

## Goals (v1)

1. **Library** — grid of the user's books with per-book reading progress.
2. **Paginated reader** — text split into screen-sized pages, swipe left/right to
   turn pages, live progress %.
3. **Remember position** — reopen a book exactly where you stopped, on any device.
4. **Highlight + note** — tap-select text, highlight it (yellow), optionally attach a
   note. Reopen all highlights/notes for a book from a list and jump to any of them.
5. **Cross-device sync** — one login (email/password); progress, highlights, and
   notes live in Supabase and follow the user everywhere.
6. **Adjustable font size** — reader re-paginates automatically.

## Explicit Non-Goals (v1)

Sharing highlights externally, in-book search, day/night theme, offline mode,
in-app book upload. All are easy follow-ups; v1 ships the core above.

## Stack & Hosting

Mirror the existing `the-living-word` setup so there is zero new infrastructure:

- **React 19 + Vite + TypeScript + Tailwind 4**
- **Supabase** — auth + Postgres (data), same client pattern as the-living-word
- **GitHub Pages** via GitHub Actions (same deploy workflow), repo under `tanaor` org
- Repo/local path: `/Users/galyaacobi/projects/my-library` (mirrors into the vault's
  `projects/` folder like the-living-word)
- Product name: **My Library** (UI in English)

## Books: how they're stored & added

- Books are **Markdown files committed into the repo** under `src/books/`.
- Each book file gets **YAML frontmatter**: `title`, `author`, `id` (stable slug),
  optional `cover` (image URL). The `id` is the permanent key for highlights/progress.
- Adding a book = Gal sends the MD → Claude lightly cleans it (strip OCR cover junk,
  add frontmatter), drops it in `src/books/`, commits → it appears in the library
  within a minute.
- A generated `books manifest` (built at compile time) lists all books for the library
  grid, so no book table is needed in the database.
- If no `cover` is provided, the library renders a clean auto-generated text cover
  (title + author on a colored card).
- **First two books:** Breakthrough Advertising (Eugene Schwartz), E5 Method
  (Todd Brown). Both are large (~330–430K chars) rough-OCR conversions — cleaned on
  add.

## Screens / Components

1. **AuthPage** — email + password sign in (reused pattern). Shown once; session
   persists.
2. **LibraryPage** — grid of book covers, each showing a progress ring/%. Tap → open
   reader at last position.
3. **ReaderPage** — the paginated reader:
   - Top bar: back to library, book progress %, font-size control, notes-list icon.
   - Page body: current page of text, justified, large readable type.
   - Gestures: swipe/drag left → next page, right → previous page (also tap
     left/right edges as a fallback).
   - Text selection → floating toolbar → **Highlight** / **Add note**.
4. **NotesPanel** — slide-over listing all highlights + notes for the current book;
   tap an entry to jump to its page.

## Data Model & the "remember position" mechanism (the important part)

The robustness of position + highlights comes from anchoring everything to
**character offsets into the book's normalized plain text**, NOT to page numbers or
DOM ranges. This survives different screen sizes, devices, and font sizes.

Pipeline per book:

1. At build time, each MD → a normalized text representation: an ordered list of
   blocks (headings, paragraphs) plus the concatenated plain text. Every character has
   a stable global index.
2. **Pagination** (client, per book + font size + viewport): render blocks into a
   hidden measuring container and compute page break offsets — each page is a
   `[startOffset, endOffset)` slice. Page breaks are **cached** (keyed by
   book id + font size + viewport width) in localStorage so re-opening is instant;
   large books only pay the measuring cost once.
3. **Reading position** = the `startOffset` of the current page. On open, find the
   page whose range contains the saved offset. Saved to Supabase (debounced) on every
   page turn.
4. **Highlights** = `[startOffset, endOffset)` ranges over the same text + optional
   note. To render, intersect each highlight range with the current page range and
   wrap the matching substrings in `<mark>`. Tapping a highlight/note in the panel
   maps its offset back to a page.

### Supabase tables

```
reading_progress
  user_id   uuid    (fk auth.users)
  book_id   text
  offset    int     -- character offset of last page start
  updated_at timestamptz
  PK (user_id, book_id)

highlights
  id         uuid    pk
  user_id    uuid    (fk auth.users)
  book_id    text
  start_off  int
  end_off    int
  quote      text    -- the highlighted text (for the notes list)
  note       text    -- nullable
  color      text    -- 'yellow' for v1
  created_at timestamptz
```

Row-Level Security: users can only read/write rows where `user_id = auth.uid()`.
(Reused `profiles` table from the-living-word is optional; not required for v1.)

## Reading experience details

- **Font-size control**: a few discrete sizes; changing it clears the cached page
  breaks for that book and re-paginates, then re-resolves the current offset to the new
  page. Position never lost.
- **Progress %** = `currentPageStartOffset / totalTextLength`.
- **Direction**: content is English/LTR. Book direction can be derived from
  frontmatter later if Hebrew books are ever added.

## Testing

- Unit tests (vitest, already configured) for the pure logic:
  - offset ↔ page resolution (given page ranges, a saved offset lands on the right
    page; boundary offsets).
  - highlight ↔ page intersection (a highlight spanning a page boundary renders on
    both pages; fully-inside and edge cases).
  - book parsing: MD → blocks + plain text produces stable, monotonic offsets.
- Manual verification on a phone-width viewport: swipe paging, select→highlight→note,
  reopen at position, change font size and confirm position holds.

## Open questions

None blocking. Repo name (`my-library`) and product name ("My Library") are
placeholders Gal can rename anytime.
