import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react'
import { useClassMapControl } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import { useComputedStyles } from '../../../../lib/components/Inspector/controls/useComputedStyles'
import type { NodeId } from '../../../../lib/core/ids'
import { alignName, lineHeightRatio, parsePx, rgbToHex, weightName } from '../../../../lib/style/computed'
import type { StyleTarget } from '../../../../lib/tailwind/variants'
import {
  FONT_SIZE_TOKENS_LIST,
  FONT_WEIGHT_VALUES,
  fontFamilyClassMap,
  fontSizeClassMap,
  fontWeightClassMap,
  lineHeightClassMap,
  textAlignClassMap,
  textColorClassMap,
  textDecorationClassMap,
} from '../../../../lib/tailwind/classMaps/typography'
import { ColorInput } from '../controls/ColorInput'
import { NumericInput } from '../controls/NumericInput'
import { StyleRow } from '../controls/StyleRow'
import { StyleSection } from '../controls/StyleSection'
import { StyleSelect, type StyleSelectOption } from '../controls/StyleSelect'
import { TokenInput } from '../controls/TokenInput'
import { pickSingle } from '../controls/fieldStyles'
import { IconToggleGroup } from '../controls/IconToggleGroup'
import { useStyledSelection } from './useStyledSelection'

const WEIGHT_CLASS: Record<string, string> = {
  thin: 'font-thin',
  extralight: 'font-extralight',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
}

const WEIGHT_OPTIONS: readonly StyleSelectOption<string>[] = FONT_WEIGHT_VALUES.map((value) => ({
  value,
  label: value,
  preview: <span className={WEIGHT_CLASS[value]}>Aa</span>,
}))

const FAMILY_OPTIONS: readonly StyleSelectOption<string>[] = [
  { value: 'sans', label: 'sans', preview: <span className="font-sans">Aa</span> },
  { value: 'serif', label: 'serif', preview: <span className="font-serif">Aa</span> },
  { value: 'mono', label: 'mono', preview: <span className="font-mono">Aa</span> },
]

const DECORATION_ITEMS = [
  { value: 'italic', icon: ItalicIcon, label: 'Italic' },
  { value: 'underline', icon: UnderlineIcon, label: 'Underline' },
  { value: 'strike', icon: StrikethroughIcon, label: 'Strikethrough' },
]

const ALIGN_ITEMS = [
  { value: 'left', icon: AlignLeftIcon, label: 'Align left' },
  { value: 'center', icon: AlignCenterIcon, label: 'Align center' },
  { value: 'right', icon: AlignRightIcon, label: 'Align right' },
  { value: 'justify', icon: AlignJustifyIcon, label: 'Justify' },
]

const COMPUTED_PROPS = ['font-family', 'font-size', 'font-weight', 'text-align', 'line-height', 'color']
const NO_DECORATION: string[] = []

export function InspectorTypography({ title = 'Typography' }: { title?: string }) {
  const selection = useStyledSelection()
  if (!selection) return null
  return <TypographyFields key={selection.id} id={selection.id} target={selection.target} title={title} />
}

function TypographyFields({ id, target, title }: { id: NodeId; target: StyleTarget; title: string }) {
  const computed = useComputedStyles(id, COMPUTED_PROPS)
  const computedSize = parsePx(computed?.['font-size'])
  const computedWeight = weightName(computed?.['font-weight'])
  const computedAlign = alignName(computed?.['text-align'])
  const computedLeading = lineHeightRatio(computed?.['line-height'], computed?.['font-size'])
  const computedColor = rgbToHex(computed?.color)

  const family = useClassMapControl(id, fontFamilyClassMap, '', target)
  const size = useClassMapControl(id, fontSizeClassMap, computedSize ?? 16, target)
  const weight = useClassMapControl(id, fontWeightClassMap, computedWeight ?? 'normal', target)
  const decoration = useClassMapControl(id, textDecorationClassMap, NO_DECORATION, target)
  const align = useClassMapControl(id, textAlignClassMap, computedAlign ?? 'left', target)
  const leading = useClassMapControl(id, lineHeightClassMap, computedLeading ?? 1.5, target)
  const color = useClassMapControl(id, textColorClassMap, computedColor ?? '', target)

  return (
    <StyleSection title={title}>
      <StyleRow label="Font" override={family.override} inherited={!family.isExplicit && Boolean(computed?.['font-family'])}>
        <StyleSelect
          aria-label="Font family"
          value={family.value}
          onChange={family.setValue}
          options={FAMILY_OPTIONS}
          placeholder={computed?.['font-family']?.split(',')[0]?.replace(/["']/g, '') || 'inherit'}
        />
      </StyleRow>
      <StyleRow label="Size" override={size.override} inherited={!size.isExplicit && computedSize !== null}>
        <TokenInput
          aria-label="Font size"
          value={size.value}
          onChange={size.setValue}
          tokens={FONT_SIZE_TOKENS_LIST}
          suffix="px"
          renderPreview={(token) => <span style={{ fontSize: Math.min(token.value, 22) }}>Aa</span>}
        />
      </StyleRow>
      <StyleRow label="Weight" override={weight.override} inherited={!weight.isExplicit && computedWeight !== null}>
        <StyleSelect aria-label="Font weight" value={weight.value} onChange={weight.setValue} options={WEIGHT_OPTIONS} />
      </StyleRow>
      <StyleRow label="Style" override={decoration.override}>
        <IconToggleGroup
          label="Text style"
          multiple
          value={decoration.value}
          items={DECORATION_ITEMS}
          onChange={decoration.setValue}
        />
      </StyleRow>
      <StyleRow label="Align" override={align.override} inherited={!align.isExplicit && computedAlign !== null}>
        <IconToggleGroup
          label="Text align"
          value={align.value}
          items={ALIGN_ITEMS}
          onChange={(next) => align.setValue(pickSingle(next, align.value))}
        />
      </StyleRow>
      <StyleRow label="Leading" override={leading.override} inherited={!leading.isExplicit && computedLeading !== null}>
        <NumericInput aria-label="Line height" value={leading.value} onCommit={leading.setValue} suffix="×" min={0} />
      </StyleRow>
      <StyleRow label="Text colour" override={color.override} inherited={!color.isExplicit && computedColor !== null}>
        <ColorInput aria-label="Text colour" value={color.value} onChange={color.setValue} />
      </StyleRow>
    </StyleSection>
  )
}
