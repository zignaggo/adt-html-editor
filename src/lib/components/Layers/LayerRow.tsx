import type { ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import type { NodeId } from '../../core/ids'
import { cn } from 'cn'
import { LayerLabel } from './LayerLabel'
import { useLayerRow } from './useLayerRow'

export type LayerRowProps = {
  id: NodeId
  level: number
  mode: ItemMode
  hasChildren: boolean
  isFocusable: boolean
  isMatch?: boolean
}

export function LayerRow({ id, level, mode, hasChildren, isFocusable, isMatch }: LayerRowProps) {
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
      className={cn(
        'group mx-1 flex h-7.5 cursor-default items-center gap-1.5 rounded-sm pe-2 text-foreground select-none',
        '[content-visibility:auto] [contain-intrinsic-size:auto_30px]',
        'transition-[background-color,opacity,scale] duration-100 ease-out',
        'hover:bg-accent active:scale-[0.995]',
        'data-selected:bg-primary/10 data-dragging:opacity-40 data-muted:opacity-50',
      )}
      style={{ paddingInlineStart: `${indent}px` }}
    >
      {hasChildren ? (
        <button
          {...chevronProps}
          className={cn(
            '-ms-1.5 grid size-7.5 flex-none cursor-default place-items-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground',
            'transition-[color,background-color] duration-100 ease-out hover:bg-accent hover:text-foreground',
            '[&_svg]:rotate-90 [&_svg]:transition-[rotate] [&_svg]:duration-200 [&_svg]:ease-out',
            'data-collapsed:[&_svg]:rotate-0',
          )}
        >
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
        <span className="w-6 flex-none" aria-hidden="true" />
      )}

      <LayerLabel node={node} />

      {classes.length > 0 ? (
        <span
          className="min-w-0 flex-1 overflow-hidden text-end font-mono text-2xs text-ellipsis whitespace-nowrap text-muted-foreground/70 [direction:rtl]"
          title={classes.join(' ')}
        >
          {classes.join(' ')}
        </span>
      ) : null}
    </div>
  )
}
