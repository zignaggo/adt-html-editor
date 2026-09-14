import type { AnyNode } from '../../core/model'
import styles from './LayerRow.module.css'

export function LayerLabel({ node }: { node: AnyNode }) {
  if (node.kind === 'element' || node.kind === 'opaque') {
    const id = node.attrs.id
    return (
      <span className={styles.label}>
        <span className={styles.tag}>{node.tag}</span>
        {id ? <span className={styles.hash}>#{id}</span> : null}
      </span>
    )
  }

  return (
    <span className={styles.label}>
      {node.kind === 'comment' ? <span className={styles.kind}>comment</span> : null}
      <span className={styles.text}>{node.value.trim() || 'text'}</span>
    </span>
  )
}
