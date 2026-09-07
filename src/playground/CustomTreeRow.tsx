import { useLayerRow, type LayerRowInfo } from '../lib'
import styles from './CustomTreeRow.module.css'

export function MyTreeRow({ row, isFocusable }: { row: LayerRowInfo; isFocusable: boolean }) {
  const { setElement, node, label, classes, indent, isDragging, isCollapsed, rowProps, chevronProps } =
    useLayerRow({
      id: row.id,
      level: row.level,
      mode: row.mode,
      hasChildren: row.hasChildren,
      isFocusable,
    })

  if (!node) return null

  return (
    <div
      ref={setElement}
      {...rowProps}
      className={styles.row}
      style={{ marginInlineStart: `${indent}px` }}
      data-dragging={isDragging || undefined}
    >
      {row.hasChildren ? (
        <button {...chevronProps} className={styles.toggle}>
          {isCollapsed ? '+' : '−'}
        </button>
      ) : (
        <span className={styles.bullet} aria-hidden="true" />
      )}
      <span className={styles.name}>{label}</span>
      {classes.length > 0 ? <span className={styles.badge}>{classes.length}</span> : null}
    </div>
  )
}
