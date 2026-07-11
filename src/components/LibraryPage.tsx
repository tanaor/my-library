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
