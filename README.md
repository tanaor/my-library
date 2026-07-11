# My Library

A personal, always-live web reading app. Pick a book from a library, read it page
by page with swipe navigation, highlight passages, and attach notes — all synced
across devices.

## Stack

React 19 + Vite + Tailwind 4 + TypeScript, Supabase (auth + Postgres), deployed to
GitHub Pages via GitHub Actions.

## One-time setup

1. **Supabase** — create a project (or reuse an existing one). In the SQL editor, run
   `supabase/migrations/0001_reader.sql`. Confirm the `reading_progress` and
   `highlights` tables exist with Row-Level Security enabled.
2. **Env** — copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. **GitHub** — create the repo, add the same two values as repo **secrets**
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), and set Settings → Pages →
   Source = **GitHub Actions**.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run test     # unit tests (parsing, pagination, reader math)
npm run build    # type-check + production build
```

Push to `main` to deploy.

## Adding a book

Books are Markdown files in `src/books/`. Each file starts with frontmatter:

```
---
id: my-book-slug
title: My Book Title
author: Author Name
cover: https://optional-cover-image-url   # optional
---

## Chapter One

Paragraph text...
```

- `id` is the permanent key that highlights and reading position are stored against —
  never change it after you've started reading.
- Headings (`#`, `##`) become chapter markers; blank lines separate paragraphs.
- If `cover` is omitted, the library shows a generated text cover.

Drop the file in `src/books/`, commit, and push — the book appears within a minute.

## How position & highlights survive everything

Reading position and highlights are stored as **character offsets into the book's
normalized text**, not page numbers. That makes them robust across screen sizes,
devices, and font-size changes. Page breaks are computed on-device and cached in
`localStorage`, so large books only pay the pagination cost once per font size.
