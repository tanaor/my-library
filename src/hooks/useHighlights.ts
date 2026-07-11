import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Highlight } from "../lib/types";

export function useHighlights(userId: string, bookId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("highlights")
      .select("*").eq("user_id", userId).eq("book_id", bookId)
      .order("start_off", { ascending: true });
    setHighlights((data as Highlight[]) ?? []);
  }, [userId, bookId]);

  useEffect(() => { void reload(); }, [reload]);

  const addHighlight = useCallback(async (startOff: number, endOff: number, quote: string, note: string | null) => {
    const { data } = await supabase.from("highlights")
      .insert({ user_id: userId, book_id: bookId, start_off: startOff, end_off: endOff, quote, note, color: "yellow" })
      .select("*").single();
    if (data) setHighlights((h) => [...h, data as Highlight].sort((a, b) => a.start_off - b.start_off));
    return data as Highlight | null;
  }, [userId, bookId]);

  const updateNote = useCallback(async (id: string, note: string) => {
    await supabase.from("highlights").update({ note }).eq("id", id);
    setHighlights((h) => h.map((x) => (x.id === id ? { ...x, note } : x)));
  }, []);

  const removeHighlight = useCallback(async (id: string) => {
    await supabase.from("highlights").delete().eq("id", id);
    setHighlights((h) => h.filter((x) => x.id !== id));
  }, []);

  return { highlights, addHighlight, updateNote, removeHighlight, reload };
}
