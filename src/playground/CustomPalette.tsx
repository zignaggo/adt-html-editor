import { PALETTE_ENTRIES, usePaletteDraggable, type PaletteEntry } from '../lib'

export function MyPaletteCard({ entry }: { entry: PaletteEntry }) {
  const { setElement, isDragging, title } = usePaletteDraggable(entry)

  return (
    <article
      ref={setElement}
      className="flex cursor-grab flex-col gap-0.5 rounded-[10px] border border-dashed border-sky-500 bg-sky-500/8 px-2 py-1.5 transition-[scale,background-color,opacity] duration-100 ease-out active:scale-95 active:cursor-grabbing data-dragging:opacity-40"
      data-dragging={isDragging || undefined}
      title={title}
    >
      <span className="font-mono text-[10px] text-sky-500">{`<${entry.template.tag}>`}</span>
      <span className="text-[11px] text-foreground">{entry.label}</span>
    </article>
  )
}

export function MyPalette() {
  const featured = PALETTE_ENTRIES.filter((entry) =>
    ['section', 'flex', 'h1', 'p', 'button', 'img'].includes(entry.id),
  )

  return (
    <div className="flex flex-col gap-1.5 p-2">
      <p className="m-0 text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        Palette from another project
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
        {featured.map((entry) => (
          <MyPaletteCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
