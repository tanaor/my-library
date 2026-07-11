import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/** Loads the saved offset for a book and returns a debounced saver. Single-user app. */
export function useProgress(bookId: string) {
  const [offset, setOffset] = useState<number | null>(null); // null = loading
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    setOffset(null);
    supabase.from("reading_progress").select("offset").eq("book_id", bookId).maybeSingle()
      .then(({ data }) => { if (alive) setOffset(data?.offset ?? 0); });
    return () => { alive = false; };
  }, [bookId]);

  const save = (nextOffset: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // NB: supabase-js builders are lazy — must call .then()/await to actually send.
      supabase
        .from("reading_progress")
        .upsert(
          { book_id: bookId, offset: nextOffset, updated_at: new Date().toISOString() },
          { onConflict: "book_id" },
        )
        .then(({ error }) => {
          if (error) console.error("Failed to save reading progress:", error.message);
        });
    }, 600);
  };

  return { offset, save };
}
