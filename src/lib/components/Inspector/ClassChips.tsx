import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { stripVariants, variantOf, type VariantId } from '../../tailwind/categories'
import { useNode } from '../Editor/context'
import { useClassEditing } from './useClassEditing'
import styles from './InspectorPanel.module.css'

export type ClassChipsProps = {
  id: NodeId
  variant: VariantId
}

export function ClassChips({ id, variant }: ClassChipsProps) {
  const node = useNode(id)
  const editing = useClassEditing(id)

  if (!node || !isStyled(node)) return null

  const visible: { className: string; index: number }[] = []
  for (let index = 0; index < node.classes.length; index += 1) {
    const className = node.classes[index]
    if (variantOf(className) === variant) visible.push({ className, index })
  }

  if (visible.length === 0) {
    return <p className={styles.hint}>Nenhuma classe nesta variante.</p>
  }

  return (
    <ul className={styles.chips}>
      {visible.map(({ className, index }) => (
        <li key={className} className={styles.chip}>
          <span className={styles.chipLabel}>{stripVariants(className)}</span>
          <span className={styles.chipActions}>
            <button
              type="button"
              className={styles.chipButton}
              aria-label={`Mover ${className} para cima`}
              disabled={index === 0}
              onClick={() => editing.reorder(index, index - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.chipButton}
              aria-label={`Mover ${className} para baixo`}
              disabled={index === node.classes.length - 1}
              onClick={() => editing.reorder(index, index + 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className={styles.chipButton}
              data-danger=""
              aria-label={`Remover ${className}`}
              onClick={() => editing.remove(className)}
            >
              ×
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}
