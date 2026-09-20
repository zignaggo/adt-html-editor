import { useClassMapControl } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import type { NodeId } from '../../../../lib/core/ids'
import type { StyleTarget } from '../../../../lib/tailwind/variants'
import { marginClassMap, paddingClassMap } from '../../../../lib/tailwind/classMaps/spacing'
import type { BoxValue } from '../../../../lib/tailwind/classMaps/types'
import { BoxInput } from '../controls/BoxInput'
import { StyleRow } from '../controls/StyleRow'
import { StyleSection } from '../controls/StyleSection'
import { useStyledSelection } from './useStyledSelection'

const ZERO: BoxValue = { t: 0, r: 0, b: 0, l: 0 }

export function InspectorSpacing({ title = 'Spacing' }: { title?: string }) {
  const selection = useStyledSelection()
  if (!selection) return null
  return <SpacingFields key={selection.id} id={selection.id} target={selection.target} title={title} />
}

function SpacingFields({ id, target, title }: { id: NodeId; target: StyleTarget; title: string }) {
  const padding = useClassMapControl(id, paddingClassMap, ZERO, target)
  const margin = useClassMapControl(id, marginClassMap, ZERO, target)

  return (
    <StyleSection title={title}>
      <StyleRow label="Padding" override={padding.override}>
        <BoxInput label="Padding" value={padding.value} onChange={padding.setValue} />
      </StyleRow>
      <StyleRow label="Margin" override={margin.override}>
        <BoxInput label="Margin" value={margin.value} onChange={margin.setValue} />
      </StyleRow>
    </StyleSection>
  )
}
