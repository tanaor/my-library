export default function SelectionToolbar({ x, y, onHighlight, onNote }:
  { x: number; y: number; onHighlight: () => void; onNote: () => void }) {
  return (
    <div
      className="fixed z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-neutral-900 shadow-xl ring-1 ring-neutral-700"
      style={{ left: x, top: y - 8 }}
    >
      <button onClick={onHighlight} className="px-3 py-2 text-sm">Highlight</button>
      <button onClick={onNote} className="border-l border-neutral-700 px-3 py-2 text-sm">Note</button>
    </div>
  );
}
