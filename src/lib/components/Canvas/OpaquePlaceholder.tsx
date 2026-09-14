import type { NodeId } from '../../core/ids'
import styles from './Canvas.module.css'

export type OpaquePlaceholderProps = {
  setElement: (element: HTMLElement | null) => void
  id: NodeId
  tag: string
}

export function OpaquePlaceholder({ setElement, id, tag }: OpaquePlaceholderProps) {
  return (
    <div
      ref={setElement}
      data-adt-id={id}
      className={styles.opaque}
      title={`<${tag}> preserved, not rendered in the editor`}
    >
      <code>{`<${tag}>`}</code>
    </div>
  )
}
