import type { AnyNode } from '../../core/model'

const labelClass = 'flex max-w-[60%] min-w-0 flex-none items-baseline gap-1'
const detailClass = 'overflow-hidden text-xs text-ellipsis whitespace-nowrap text-muted-foreground'

export function LayerLabel({ node }: { node: AnyNode }) {
  if (node.kind === 'element' || node.kind === 'opaque') {
    const id = node.attrs.id
    return (
      <span className={labelClass}>
        <span className="font-mono text-xs font-medium whitespace-nowrap text-foreground">{node.tag}</span>
        {id ? (
          <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
            #{id}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span className={labelClass}>
      {node.kind === 'comment' ? <span className={`${detailClass} italic`}>comment</span> : null}
      <span className={detailClass}>{node.value.trim() || 'text'}</span>
    </span>
  )
}
