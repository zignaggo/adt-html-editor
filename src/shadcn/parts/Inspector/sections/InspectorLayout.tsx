import {
  AlignHorizontalJustifyCenterIcon,
  AlignHorizontalJustifyEndIcon,
  AlignHorizontalJustifyStartIcon,
  AlignHorizontalSpaceAroundIcon,
  AlignHorizontalSpaceBetweenIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  StretchHorizontalIcon,
} from 'lucide-react'
import { useClassMapControl } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import type { NodeId } from '../../../../lib/core/ids'
import type { VariantId } from '../../../../lib/tailwind/categories'
import {
  alignItemsClassMap,
  displayClassMap,
  flexDirectionClassMap,
  gapClassMap,
  justifyContentClassMap,
} from '../../../../lib/tailwind/classMaps/layout'
import { pickSingle } from '../controls/fieldStyles'
import { IconToggleGroup, type IconOption } from '../controls/IconToggleGroup'
import { NumericInput } from '../controls/NumericInput'
import { StyleRow } from '../controls/StyleRow'
import { StyleSection } from '../controls/StyleSection'
import { StyleSelect, type StyleSelectOption } from '../controls/StyleSelect'
import { useStyledSelection } from './useStyledSelection'

const DISPLAY_OPTIONS: readonly StyleSelectOption<string>[] = [
  'block',
  'inline-block',
  'inline',
  'flex',
  'inline-flex',
  'grid',
  'hidden',
].map((value) => ({ value, label: value }))

const DIRECTION_ITEMS: readonly IconOption[] = [
  { value: 'row', icon: ArrowRightIcon, label: 'Row' },
  { value: 'row-reverse', icon: ArrowLeftIcon, label: 'Row reverse' },
  { value: 'col', icon: ArrowDownIcon, label: 'Column' },
  { value: 'col-reverse', icon: ArrowUpIcon, label: 'Column reverse' },
]

const JUSTIFY_ROW: readonly IconOption[] = [
  { value: 'start', icon: AlignHorizontalJustifyStartIcon, label: 'Start' },
  { value: 'center', icon: AlignHorizontalJustifyCenterIcon, label: 'Center' },
  { value: 'end', icon: AlignHorizontalJustifyEndIcon, label: 'End' },
  { value: 'between', icon: AlignHorizontalSpaceBetweenIcon, label: 'Space between' },
  { value: 'around', icon: AlignHorizontalSpaceAroundIcon, label: 'Space around' },
]

const JUSTIFY_COLUMN: readonly IconOption[] = [
  { value: 'start', icon: AlignVerticalJustifyStartIcon, label: 'Start' },
  { value: 'center', icon: AlignVerticalJustifyCenterIcon, label: 'Center' },
  { value: 'end', icon: AlignVerticalJustifyEndIcon, label: 'End' },
  { value: 'between', icon: AlignHorizontalSpaceBetweenIcon, label: 'Space between' },
  { value: 'around', icon: AlignHorizontalSpaceAroundIcon, label: 'Space around' },
]

const ALIGN_ROW: readonly IconOption[] = [
  { value: 'start', icon: AlignVerticalJustifyStartIcon, label: 'Start' },
  { value: 'center', icon: AlignVerticalJustifyCenterIcon, label: 'Center' },
  { value: 'end', icon: AlignVerticalJustifyEndIcon, label: 'End' },
  { value: 'stretch', icon: StretchHorizontalIcon, label: 'Stretch' },
]

const ALIGN_COLUMN: readonly IconOption[] = [
  { value: 'start', icon: AlignHorizontalJustifyStartIcon, label: 'Start' },
  { value: 'center', icon: AlignHorizontalJustifyCenterIcon, label: 'Center' },
  { value: 'end', icon: AlignHorizontalJustifyEndIcon, label: 'End' },
  { value: 'stretch', icon: StretchHorizontalIcon, label: 'Stretch' },
]

export function InspectorLayout({ title = 'Layout' }: { title?: string }) {
  const selection = useStyledSelection()
  if (!selection) return null
  return <LayoutFields key={selection.id} id={selection.id} variant={selection.variant} title={title} />
}

function LayoutFields({ id, variant, title }: { id: NodeId; variant: VariantId; title: string }) {
  const display = useClassMapControl(id, displayClassMap, 'block', variant)
  const direction = useClassMapControl(id, flexDirectionClassMap, 'row', variant)
  const justify = useClassMapControl(id, justifyContentClassMap, 'start', variant)
  const align = useClassMapControl(id, alignItemsClassMap, 'stretch', variant)
  const gap = useClassMapControl(id, gapClassMap, 0, variant)

  const isFlexLike = ['flex', 'inline-flex', 'grid', 'inline-grid'].includes(display.value)
  const isColumn = direction.value === 'col' || direction.value === 'col-reverse'

  return (
    <StyleSection title={title}>
      <StyleRow label="Display" override={display.override}>
        <StyleSelect aria-label="Display" value={display.value} onChange={display.setValue} options={DISPLAY_OPTIONS} />
      </StyleRow>
      {isFlexLike ? (
        <>
          <StyleRow label="Direction" override={direction.override}>
            <IconToggleGroup
              label="Direction"
              value={direction.value}
              items={DIRECTION_ITEMS}
              onChange={(next) => direction.setValue(pickSingle(next, direction.value))}
            />
          </StyleRow>
          <StyleRow label="Justify" override={justify.override}>
            <IconToggleGroup
              label="Justify"
              value={justify.value}
              items={isColumn ? JUSTIFY_COLUMN : JUSTIFY_ROW}
              onChange={(next) => justify.setValue(pickSingle(next, justify.value))}
            />
          </StyleRow>
          <StyleRow label="Align" override={align.override}>
            <IconToggleGroup
              label="Align items"
              value={align.value}
              items={isColumn ? ALIGN_COLUMN : ALIGN_ROW}
              onChange={(next) => align.setValue(pickSingle(next, align.value))}
            />
          </StyleRow>
          <StyleRow label="Gap" override={gap.override}>
            <NumericInput aria-label="Gap" value={gap.value} onCommit={gap.setValue} suffix="px" min={0} />
          </StyleRow>
        </>
      ) : null}
    </StyleSection>
  )
}
