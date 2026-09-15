import { memo } from 'react'
import type { ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import type { NodeId } from '../../core/ids'
import { LayerLabel } from './LayerLabel'
import { useLayerRow } from './useLayerRow'
import styles from './LayerRow.module.css'

export type LayerRowProps = {
  id: NodeId
  level: number
  mode: ItemMode
  hasChildren: boolean
  isFocusable: boolean
  isMatch?: boolean
}

export const LayerRow = memo(function LayerRow({ id, level, mode, hasChildren, isFocusable, isMatch }: LayerRowProps) {
  const { setElement, node, classes, indent, rowProps, chevronProps } = useLayerRow({
    id,
    level,
    mode,
    hasChildren,
    isFocusable,
    isMatch,
  })

  if (!node) return null

  return (
    <div
      ref={setElement}
      {...rowProps}
      className={styles.row}
      style={{ paddingInlineStart: `${indent}px` }}
    >
      {hasChildren ? (
        <button {...chevronProps} className={styles.chevron}>
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path
              d="M4.5 2.5 L8 6 L4.5 9.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <span className={styles.chevronSpacer} aria-hidden="true" />
      )}

      <LayerLabel node={node} />

      {classes.length > 0 ? (
        <span className={styles.classes} title={classes.join(' ')}>
          {classes.join(' ')}
        </span>
      ) : null}
    </div>
  )
})
