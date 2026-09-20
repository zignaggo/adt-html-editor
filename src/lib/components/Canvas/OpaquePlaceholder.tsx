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
      className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1 font-mono text-2xs text-muted-foreground ring-1 ring-border ring-inset"
      title={`<${tag}> preserved, not rendered in the editor`}
    >
      <code>{`<${tag}>`}</code>
    </div>
  )
}
