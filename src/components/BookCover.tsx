import type { BookMeta } from "../lib/types";

const PALETTE = ["#7c3aed", "#0891b2", "#b45309", "#be123c", "#15803d", "#4338ca"];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function BookCover({ meta, percent }: { meta: BookMeta; percent: number }) {
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-lg">
      {meta.cover ? (
        <img src={meta.cover} alt={meta.title} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-3 text-white"
          style={{ background: colorFor(meta.id) }}
        >
          <span className="text-sm font-semibold leading-tight">{meta.title}</span>
          <span className="text-xs opacity-80">{meta.author}</span>
        </div>
      )}
      {percent > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-center text-[11px]">
          {percent}%
        </div>
      )}
    </div>
  );
}
