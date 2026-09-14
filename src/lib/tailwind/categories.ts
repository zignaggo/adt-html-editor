export type ControlKind = 'options' | 'scale' | 'color' | 'text'

export type ControlSpec = {
  id: string
  label: string
  kind: ControlKind
  roots: string[]
  options?: { value: string; label: string }[]
  prefixes?: string[]
}

export type CategorySpec = {
  id: string
  label: string
  controls: ControlSpec[]
}

const SPACING_SCALE = ['0', '0.5', '1', '1.5', '2', '3', '4', '5', '6', '8', '10', '12', '16']

function scaleOptions(prefix: string, scale: string[] = SPACING_SCALE) {
  return scale.map((value) => ({ value: `${prefix}-${value}`, label: value }))
}

export const CATEGORIES: CategorySpec[] = [
  {
    id: 'layout',
    label: 'Layout',
    controls: [
      {
        id: 'display',
        label: 'Display',
        kind: 'options',
        roots: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'contents'],
        options: [
          { value: 'block', label: 'block' },
          { value: 'inline-block', label: 'inline-block' },
          { value: 'inline', label: 'inline' },
          { value: 'flex', label: 'flex' },
          { value: 'grid', label: 'grid' },
          { value: 'hidden', label: 'hidden' },
        ],
      },
      {
        id: 'position',
        label: 'Position',
        kind: 'options',
        roots: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
        options: [
          { value: 'static', label: 'static' },
          { value: 'relative', label: 'relative' },
          { value: 'absolute', label: 'absolute' },
          { value: 'fixed', label: 'fixed' },
          { value: 'sticky', label: 'sticky' },
        ],
      },
      {
        id: 'overflow',
        label: 'Overflow',
        kind: 'options',
        roots: ['overflow'],
        options: [
          { value: 'overflow-visible', label: 'visible' },
          { value: 'overflow-hidden', label: 'hidden' },
          { value: 'overflow-auto', label: 'auto' },
          { value: 'overflow-clip', label: 'clip' },
          { value: 'overflow-scroll', label: 'scroll' },
        ],
      },
    ],
  },
  {
    id: 'flex',
    label: 'Flex & Grid',
    controls: [
      {
        id: 'flex-direction',
        label: 'Direction',
        kind: 'options',
        roots: ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'],
        options: [
          { value: 'flex-row', label: 'row' },
          { value: 'flex-col', label: 'col' },
          { value: 'flex-row-reverse', label: 'row-rev' },
          { value: 'flex-col-reverse', label: 'col-rev' },
        ],
      },
      {
        id: 'justify',
        label: 'Justify',
        kind: 'options',
        roots: ['justify'],
        options: [
          { value: 'justify-start', label: 'start' },
          { value: 'justify-center', label: 'center' },
          { value: 'justify-end', label: 'end' },
          { value: 'justify-between', label: 'between' },
          { value: 'justify-around', label: 'around' },
        ],
      },
      {
        id: 'items',
        label: 'Align',
        kind: 'options',
        roots: ['items'],
        options: [
          { value: 'items-start', label: 'start' },
          { value: 'items-center', label: 'center' },
          { value: 'items-end', label: 'end' },
          { value: 'items-stretch', label: 'stretch' },
          { value: 'items-baseline', label: 'baseline' },
        ],
      },
      { id: 'gap', label: 'Gap', kind: 'scale', roots: ['gap'], options: scaleOptions('gap') },
      {
        id: 'wrap',
        label: 'Wrap',
        kind: 'options',
        roots: ['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse'],
        options: [
          { value: 'flex-wrap', label: 'wrap' },
          { value: 'flex-nowrap', label: 'nowrap' },
        ],
      },
      {
        id: 'grid-cols',
        label: 'Columns',
        kind: 'options',
        roots: ['grid-cols'],
        options: [1, 2, 3, 4, 6, 12].map((n) => ({ value: `grid-cols-${n}`, label: String(n) })),
      },
    ],
  },
  {
    id: 'spacing',
    label: 'Spacing',
    controls: [
      { id: 'p', label: 'Padding', kind: 'scale', roots: ['p'], options: scaleOptions('p') },
      { id: 'px', label: 'Padding X', kind: 'scale', roots: ['px'], options: scaleOptions('px') },
      { id: 'py', label: 'Padding Y', kind: 'scale', roots: ['py'], options: scaleOptions('py') },
      { id: 'm', label: 'Margin', kind: 'scale', roots: ['m'], options: scaleOptions('m') },
      { id: 'mx', label: 'Margin X', kind: 'scale', roots: ['mx'], options: scaleOptions('mx') },
      { id: 'my', label: 'Margin Y', kind: 'scale', roots: ['my'], options: scaleOptions('my') },
    ],
  },
  {
    id: 'sizing',
    label: 'Sizing',
    controls: [
      {
        id: 'w',
        label: 'Width',
        kind: 'text',
        roots: ['w'],
        options: [
          { value: 'w-full', label: 'full' },
          { value: 'w-auto', label: 'auto' },
          { value: 'w-fit', label: 'fit' },
          { value: 'w-screen', label: 'screen' },
        ],
      },
      {
        id: 'h',
        label: 'Height',
        kind: 'text',
        roots: ['h'],
        options: [
          { value: 'h-full', label: 'full' },
          { value: 'h-auto', label: 'auto' },
          { value: 'h-fit', label: 'fit' },
          { value: 'h-screen', label: 'screen' },
        ],
      },
      { id: 'max-w', label: 'Max width', kind: 'text', roots: ['max-w'] },
      { id: 'min-h', label: 'Min height', kind: 'text', roots: ['min-h'] },
    ],
  },
  {
    id: 'typography',
    label: 'Typography',
    controls: [
      {
        id: 'text-size',
        label: 'Size',
        kind: 'options',
        roots: ['text'],
        options: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'].map((value) => ({
          value: `text-${value}`,
          label: value,
        })),
      },
      {
        id: 'font-weight',
        label: 'Weight',
        kind: 'options',
        roots: ['font'],
        options: ['normal', 'medium', 'semibold', 'bold'].map((value) => ({
          value: `font-${value}`,
          label: value,
        })),
      },
      {
        id: 'text-align',
        label: 'Alignment',
        kind: 'options',
        roots: ['text-left', 'text-center', 'text-right', 'text-justify'],
        options: [
          { value: 'text-left', label: 'left' },
          { value: 'text-center', label: 'center' },
          { value: 'text-right', label: 'right' },
        ],
      },
      {
        id: 'leading',
        label: 'Line height',
        kind: 'options',
        roots: ['leading'],
        options: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'].map((value) => ({
          value: `leading-${value}`,
          label: value,
        })),
      },
    ],
  },
  {
    id: 'color',
    label: 'Colors',
    controls: [
      { id: 'bg', label: 'Background', kind: 'color', roots: ['bg'] },
      { id: 'text-color', label: 'Text', kind: 'color', roots: ['text'] },
      { id: 'border-color', label: 'Border', kind: 'color', roots: ['border'] },
    ],
  },
  {
    id: 'border',
    label: 'Border',
    controls: [
      {
        id: 'border-width',
        label: 'Width',
        kind: 'options',
        roots: ['border'],
        options: ['border', 'border-0', 'border-2', 'border-4', 'border-8'].map((value) => ({
          value,
          label: value === 'border' ? '1' : value.replace('border-', ''),
        })),
      },
      {
        id: 'rounded',
        label: 'Radius',
        kind: 'options',
        roots: ['rounded'],
        options: ['rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'].map(
          (value) => ({ value, label: value.replace('rounded-', '') }),
        ),
      },
    ],
  },
  {
    id: 'effects',
    label: 'Effects',
    controls: [
      {
        id: 'shadow',
        label: 'Shadow',
        kind: 'options',
        roots: ['shadow'],
        options: ['shadow-none', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'].map(
          (value) => ({ value, label: value.replace('shadow-', '') }),
        ),
      },
      {
        id: 'opacity',
        label: 'Opacity',
        kind: 'options',
        roots: ['opacity'],
        options: [0, 25, 50, 75, 100].map((n) => ({ value: `opacity-${n}`, label: String(n) })),
      },
    ],
  },
]

export const PALETTE_COLORS = [
  'white',
  'black',
  'transparent',
  'slate-100',
  'slate-300',
  'slate-500',
  'slate-700',
  'slate-900',
  'red-500',
  'orange-500',
  'amber-500',
  'lime-500',
  'emerald-500',
  'teal-500',
  'sky-500',
  'blue-500',
  'indigo-500',
  'violet-500',
  'fuchsia-500',
  'pink-500',
]

export const VARIANTS = ['base', 'sm', 'md', 'lg', 'xl', 'hover', 'focus', 'dark'] as const
export type VariantId = (typeof VARIANTS)[number]

export function withVariant(className: string, variant: VariantId): string {
  return variant === 'base' ? className : `${variant}:${className}`
}

export function variantOf(className: string): VariantId {
  const parts = className.split(':')
  if (parts.length === 1) return 'base'
  const found = VARIANTS.find((variant) => variant !== 'base' && parts.includes(variant))
  return found ?? 'base'
}

export function stripVariants(className: string): string {
  const parts = className.split(':')
  return parts[parts.length - 1]
}

export const COLOR_SWATCHES: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  'slate-100': '#f1f5f9',
  'slate-300': '#cbd5e1',
  'slate-500': '#64748b',
  'slate-700': '#334155',
  'slate-900': '#0f172a',
  'red-500': '#ef4444',
  'orange-500': '#f97316',
  'amber-500': '#f59e0b',
  'lime-500': '#84cc16',
  'emerald-500': '#10b981',
  'teal-500': '#14b8a6',
  'sky-500': '#0ea5e9',
  'blue-500': '#3b82f6',
  'indigo-500': '#6366f1',
  'violet-500': '#8b5cf6',
  'fuchsia-500': '#d946ef',
  'pink-500': '#ec4899',
}
