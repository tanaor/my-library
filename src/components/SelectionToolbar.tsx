export default function SelectionToolbar({ x, y, onHighlight, onNote }:
  { x: number; y: number; onHighlight: () => void; onNote: () => void }) {
  // Act on pointerdown + preventDefault so tapping the toolbar doesn't collapse the
  // text selection (which would otherwise disappear before the action runs on mobile).
  const act = (fn: () => void) => (e: React.PointerEvent) => { e.preventDefault(); fn(); };
  return (
    <div
      className="fixed z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-neutral-900 shadow-xl ring-1 ring-neutral-700"
      style={{ left: x, top: y - 8 }}
    >
      <button onPointerDown={act(onHighlight)} className="px-4 py-2 text-sm">Highlight</button>
      <button onPointerDown={act(onNote)} className="border-l border-neutral-700 px-4 py-2 text-sm">Note</button>
    </div>
  );
}
