import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/** Loads the saved offset for (user, book) and returns a debounced saver. */
export function useProgress(userId: string, bookId: string) {
  const [offset, setOffset] = useState<number | null>(null); // null = loading
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    setOffset(null);
    supabase.from("reading_progress").select("offset").eq("user_id", userId).eq("book_id", bookId).maybeSingle()
      .then(({ data }) => { if (alive) setOffset(data?.offset ?? 0); });
    return () => { alive = false; };
  }, [userId, bookId]);

  const save = (nextOffset: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void supabase.from("reading_progress").upsert(
        { user_id: userId, book_id: bookId, offset: nextOffset, updated_at: new Date().toISOString() },
        { onConflict: "user_id,book_id" },
      );
    }, 600);
  };

  return { offset, save };
}
