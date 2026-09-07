import { PALETTE_ENTRIES, usePaletteDraggable, type PaletteEntry } from '../lib'
import styles from './CustomPalette.module.css'

export function MyPaletteCard({ entry }: { entry: PaletteEntry }) {
  const { setElement, isDragging, title } = usePaletteDraggable(entry)

  return (
    <article
      ref={setElement}
      className={styles.card}
      data-dragging={isDragging || undefined}
      title={title}
    >
      <span className={styles.cardTag}>{`<${entry.template.tag}>`}</span>
      <span className={styles.cardLabel}>{entry.label}</span>
    </article>
  )
}

export function MyPalette() {
  const featured = PALETTE_ENTRIES.filter((entry) =>
    ['section', 'flex', 'h1', 'p', 'button', 'img'].includes(entry.id),
  )

  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>Paleta do outro projeto</p>
      <div className={styles.cards}>
        {featured.map((entry) => (
          <MyPaletteCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
