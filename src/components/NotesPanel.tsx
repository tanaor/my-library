import type { Highlight } from "../lib/types";

export default function NotesPanel({ highlights, onJump, onDelete, onClose }:
  { highlights: Highlight[]; onJump: (h: Highlight) => void; onDelete: (id: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-80 max-w-[85%] overflow-y-auto bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Notes &amp; Highlights</h2>
          <button onClick={onClose} className="text-neutral-400">✕</button>
        </div>
        {highlights.length === 0 && <p className="text-sm text-neutral-500">Nothing yet.</p>}
        <ul className="space-y-3">
          {highlights.map((h) => (
            <li key={h.id} className="rounded-lg bg-neutral-800 p-3">
              <button onClick={() => onJump(h)} className="block text-left">
                <span className="border-l-2 border-yellow-400 pl-2 text-sm text-neutral-200">{h.quote}</span>
                {h.note && <p className="mt-2 text-sm text-neutral-400">{h.note}</p>}
              </button>
              <button onClick={() => onDelete(h.id)} className="mt-2 text-xs text-red-400">Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
