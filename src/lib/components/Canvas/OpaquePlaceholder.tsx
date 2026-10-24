import type { NodeId } from '../../core/ids'

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
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
      title={`<${tag}> preserved, not rendered in the editor`}
    >
      <code>{`<${tag}>`}</code>
    </div>
  )
}
