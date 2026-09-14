import { useState } from 'react'
import { useClassMapControl } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import type { NodeId } from '../../../../lib/core/ids'
import type { VariantId } from '../../../../lib/tailwind/categories'
import { backgroundColorClassMap, opacityClassMap, shadowClassMap } from '../../../../lib/tailwind/classMaps/appearance'
import { Slider } from '../../../ui/slider'
import { ColorInput } from '../controls/ColorInput'
import { StyleRow } from '../controls/StyleRow'
import { StyleSection } from '../controls/StyleSection'
import { StyleSelect, type StyleSelectOption } from '../controls/StyleSelect'
import { useStyledSelection } from './useStyledSelection'

const SHADOW_OPTIONS: readonly StyleSelectOption<string>[] = [
  { value: 'none', label: 'None' },
  { value: 'xs', label: 'xs' },
  { value: 'sm', label: 'sm' },
  { value: 'DEFAULT', label: 'Default' },
  { value: 'md', label: 'md' },
  { value: 'lg', label: 'lg' },
  { value: 'xl', label: 'xl' },
  { value: '2xl', label: '2xl' },
  { value: 'inner', label: 'inner' },
]

export function InspectorAppearance({ title = 'Appearance' }: { title?: string }) {
  const selection = useStyledSelection()
  if (!selection) return null
  return <AppearanceFields key={selection.id} id={selection.id} variant={selection.variant} title={title} />
}

function AppearanceFields({ id, variant, title }: { id: NodeId; variant: VariantId; title: string }) {
  const background = useClassMapControl(id, backgroundColorClassMap, '', variant)
  const opacity = useClassMapControl(id, opacityClassMap, 100, variant)
  const shadow = useClassMapControl(id, shadowClassMap, 'none', variant)

  return (
    <StyleSection title={title}>
      <StyleRow label="Background" override={background.override}>
        <ColorInput aria-label="Background colour" value={background.value} onChange={background.setValue} />
      </StyleRow>
      <StyleRow label="Opacity" override={opacity.override}>
        <OpacitySlider value={opacity.value} onCommit={opacity.setValue} />
      </StyleRow>
      <StyleRow label="Shadow" override={shadow.override}>
        <StyleSelect aria-label="Shadow" value={shadow.value} onChange={shadow.setValue} options={SHADOW_OPTIONS} />
      </StyleRow>
    </StyleSection>
  )
}

function OpacitySlider({ value, onCommit }: { value: number; onCommit: (next: number) => void }) {
  const [dragging, setDragging] = useState<number | null>(null)
  const shown = dragging ?? value
  return (
    <>
      <Slider
        aria-label="Opacity"
        min={0}
        max={100}
        step={5}
        value={[shown]}
        onValueChange={(next) => setDragging(Array.isArray(next) ? next[0] : next)}
        onValueCommitted={(next) => {
          setDragging(null)
          const committed = Array.isArray(next) ? next[0] : next
          if (committed !== value) onCommit(committed)
        }}
        className="flex-1"
      />
      <span className="w-9 text-right text-[11px] text-muted-foreground tabular-nums">{shown}%</span>
    </>
  )
}
