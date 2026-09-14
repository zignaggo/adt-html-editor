import { useClassMapControl } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import type { NodeId } from '../../../../lib/core/ids'
import type { VariantId } from '../../../../lib/tailwind/categories'
import { borderColorClassMap, borderRadiusClassMap, borderWidthClassMap } from '../../../../lib/tailwind/classMaps/borders'
import type { BoxValue } from '../../../../lib/tailwind/classMaps/types'
import { BoxInput } from '../controls/BoxInput'
import { ColorInput } from '../controls/ColorInput'
import { StyleRow } from '../controls/StyleRow'
import { StyleSection } from '../controls/StyleSection'
import { useStyledSelection } from './useStyledSelection'

const ZERO: BoxValue = { t: 0, r: 0, b: 0, l: 0 }

export function InspectorBorders({ title = 'Borders' }: { title?: string }) {
  const selection = useStyledSelection()
  if (!selection) return null
  return <BorderFields key={selection.id} id={selection.id} variant={selection.variant} title={title} />
}

function BorderFields({ id, variant, title }: { id: NodeId; variant: VariantId; title: string }) {
  const width = useClassMapControl(id, borderWidthClassMap, ZERO, variant)
  const radius = useClassMapControl(id, borderRadiusClassMap, ZERO, variant)
  const color = useClassMapControl(id, borderColorClassMap, '', variant)

  return (
    <StyleSection title={title}>
      <StyleRow label="Width" override={width.override}>
        <BoxInput label="Border width" value={width.value} onChange={width.setValue} />
      </StyleRow>
      <StyleRow label="Radius" override={radius.override}>
        <BoxInput label="Border radius" variant="corners" value={radius.value} onChange={radius.setValue} />
      </StyleRow>
      <StyleRow label="Colour" override={color.override}>
        <ColorInput aria-label="Border colour" value={color.value} onChange={color.setValue} />
      </StyleRow>
    </StyleSection>
  )
}
