import { useClassMapControl } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import { useOptionalFields, type OptionalField } from '../../../../lib/components/Inspector/controls/useOptionalFields'
import type { NodeId } from '../../../../lib/core/ids'
import type { VariantId } from '../../../../lib/tailwind/categories'
import {
  heightClassMap,
  maxHeightClassMap,
  maxWidthClassMap,
  minHeightClassMap,
  minWidthClassMap,
  widthClassMap,
} from '../../../../lib/tailwind/classMaps/sizing'
import type { UnitValue } from '../../../../lib/tailwind/classMaps/types'
import { AddFieldButton } from '../controls/AddFieldButton'
import { StyleRow } from '../controls/StyleRow'
import { StyleSection } from '../controls/StyleSection'
import { UnitInput } from '../controls/UnitInput'
import { useStyledSelection } from './useStyledSelection'

const AUTO: UnitValue = { value: 'auto', unit: 'auto' }
const NONE: UnitValue = { value: 'none', unit: 'none' }
const DIMENSION_UNITS = ['px', '%', 'auto'] as const
const MAX_UNITS = ['px', '%', 'none'] as const

type SizingOptional = 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight'

const OPTIONALS: readonly OptionalField<SizingOptional>[] = [
  { key: 'minWidth', classMatch: /(?:^|:)min-w-/ },
  { key: 'minHeight', classMatch: /(?:^|:)min-h-/ },
  { key: 'maxWidth', classMatch: /(?:^|:)max-w-/ },
  { key: 'maxHeight', classMatch: /(?:^|:)max-h-/ },
]

const LABELS: Record<SizingOptional, string> = {
  minWidth: 'Min width',
  minHeight: 'Min height',
  maxWidth: 'Max width',
  maxHeight: 'Max height',
}

export function InspectorSizing({ title = 'Sizing' }: { title?: string }) {
  const selection = useStyledSelection()
  if (!selection) return null
  return (
    <SizingFields
      key={selection.id}
      id={selection.id}
      variant={selection.variant}
      classes={selection.classes}
      title={title}
    />
  )
}

function SizingFields({
  id,
  variant,
  classes,
  title,
}: {
  id: NodeId
  variant: VariantId
  classes: readonly string[]
  title: string
}) {
  const optional = useOptionalFields(OPTIONALS, classes, id)
  const width = useClassMapControl(id, widthClassMap, AUTO, variant)
  const height = useClassMapControl(id, heightClassMap, AUTO, variant)
  const minWidth = useClassMapControl(id, minWidthClassMap, AUTO, variant)
  const minHeight = useClassMapControl(id, minHeightClassMap, AUTO, variant)
  const maxWidth = useClassMapControl(id, maxWidthClassMap, NONE, variant)
  const maxHeight = useClassMapControl(id, maxHeightClassMap, NONE, variant)

  return (
    <StyleSection
      title={title}
      actions={
        <AddFieldButton
          aria-label="Add sizing field"
          options={optional.available.map((key) => ({ value: key, label: LABELS[key] }))}
          onSelect={optional.enable}
        />
      }
    >
      <StyleRow label="Width" override={width.override}>
        <UnitInput aria-label="Width" value={width.value} onChange={width.setValue} units={DIMENSION_UNITS} />
      </StyleRow>
      <StyleRow label="Height" override={height.override}>
        <UnitInput aria-label="Height" value={height.value} onChange={height.setValue} units={DIMENSION_UNITS} />
      </StyleRow>
      {optional.has('minWidth') ? (
        <StyleRow label={LABELS.minWidth} override={minWidth.override}>
          <UnitInput aria-label={LABELS.minWidth} value={minWidth.value} onChange={minWidth.setValue} units={DIMENSION_UNITS} />
        </StyleRow>
      ) : null}
      {optional.has('minHeight') ? (
        <StyleRow label={LABELS.minHeight} override={minHeight.override}>
          <UnitInput aria-label={LABELS.minHeight} value={minHeight.value} onChange={minHeight.setValue} units={DIMENSION_UNITS} />
        </StyleRow>
      ) : null}
      {optional.has('maxWidth') ? (
        <StyleRow label={LABELS.maxWidth} override={maxWidth.override}>
          <UnitInput aria-label={LABELS.maxWidth} value={maxWidth.value} onChange={maxWidth.setValue} units={MAX_UNITS} />
        </StyleRow>
      ) : null}
      {optional.has('maxHeight') ? (
        <StyleRow label={LABELS.maxHeight} override={maxHeight.override}>
          <UnitInput aria-label={LABELS.maxHeight} value={maxHeight.value} onChange={maxHeight.setValue} units={MAX_UNITS} />
        </StyleRow>
      ) : null}
    </StyleSection>
  )
}
