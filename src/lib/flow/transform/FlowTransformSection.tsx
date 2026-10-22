import { useDirectControls, useLayoutMode } from '../../components/Editor/context'
import { useFlowSelection } from '../useFlowSelection'
import { TransformControls } from './TransformControls'

/**
 * The inspector half of free transform: the offset in numbers, next to the canvas half that
 * drags it. Flow only — a fixed-layout page has `Inspector.Position` instead.
 */
export function FlowTransformSection({ title = 'Position' }: { title?: string }) {
  const layout = useLayoutMode()
  const direct = useDirectControls()
  if (layout !== 'flow' || !direct) return null
  return <FlowTransformFields title={title} />
}

function FlowTransformFields({ title }: { title: string }) {
  const target = useFlowSelection()
  if (!target) return null

  return (
    <section className="flex flex-col gap-2 border-b border-border px-3 py-3 font-sans">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <TransformControls target={target} />
    </section>
  )
}
