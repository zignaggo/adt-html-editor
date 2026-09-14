import { useClassMapControl } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import type { NodeId } from '../../../../lib/core/ids'
import type { VariantId } from '../../../../lib/tailwind/categories'
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
  return <SpacingFields key={selection.id} id={selection.id} variant={selection.variant} title={title} />
}

function SpacingFields({ id, variant, title }: { id: NodeId; variant: VariantId; title: string }) {
  const padding = useClassMapControl(id, paddingClassMap, ZERO, variant)
  const margin = useClassMapControl(id, marginClassMap, ZERO, variant)

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
