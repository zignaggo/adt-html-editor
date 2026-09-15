import { useLayerRow, type LayerRowInfo } from '../lib'

export function MyTreeRow({ row, isFocusable }: { row: LayerRowInfo; isFocusable: boolean }) {
  const { setElement, node, label, classes, indent, isDragging, isCollapsed, rowProps, chevronProps } =
    useLayerRow({
      id: row.id,
      level: row.level,
      mode: row.mode,
      hasChildren: row.hasChildren,
      isMatch: row.isMatch,
      isFocusable,
    })

  if (!node) return null

  return (
    <div
      ref={setElement}
      {...rowProps}
      className="flex min-h-[30px] cursor-default items-center gap-1.5 rounded-lg px-2 transition-[background-color,opacity] duration-100 ease-out select-none hover:bg-orange-500/12 data-selected:bg-orange-500/22 data-dragging:opacity-40"
      style={{ marginInlineStart: `${indent}px` }}
      data-dragging={isDragging || undefined}
    >
      {row.hasChildren ? (
        <button
          {...chevronProps}
          className="grid size-5 cursor-default place-items-center rounded-md border-0 bg-orange-500/20 p-0 font-[inherit] text-xs leading-none text-orange-500"
        >
          {isCollapsed ? '+' : '−'}
        </button>
      ) : (
        <span className="size-5" aria-hidden="true" />
      )}
      <span className="overflow-hidden font-mono text-[11px] text-ellipsis whitespace-nowrap text-foreground">
        {label}
      </span>
      {classes.length > 0 ? (
        <span className="ms-auto rounded-full bg-orange-500/18 px-1.5 text-[10px] text-orange-500 tabular-nums">
          {classes.length}
        </span>
      ) : null}
    </div>
  )
}
