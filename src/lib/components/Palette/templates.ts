import type { NodeTemplate } from '../../core/store'

export type PaletteEntry = {
  id: string
  label: string
  template: NodeTemplate
}

export const PALETTE_ENTRIES: PaletteEntry[] = [
  { id: 'div', label: 'div', template: { tag: 'div', classes: ['p-4'] } },
  { id: 'section', label: 'section', template: { tag: 'section', classes: ['p-6'] } },
  { id: 'flex', label: 'flex row', template: { tag: 'div', classes: ['flex', 'gap-4'] } },
  { id: 'grid', label: 'grid', template: { tag: 'div', classes: ['grid', 'grid-cols-2', 'gap-4'] } },
  { id: 'h1', label: 'h1', template: { tag: 'h1', classes: ['text-3xl', 'font-bold'], text: 'Heading' } },
  { id: 'h2', label: 'h2', template: { tag: 'h2', classes: ['text-2xl', 'font-semibold'], text: 'Subheading' } },
  { id: 'h3', label: 'h3', template: { tag: 'h3', classes: ['text-xl', 'font-semibold'], text: 'Section' } },
  { id: 'p', label: 'p', template: { tag: 'p', text: 'Sample paragraph.' } },
  { id: 'span', label: 'span', template: { tag: 'span', text: 'text' } },
  {
    id: 'button',
    label: 'button',
    template: {
      tag: 'button',
      attrs: { type: 'button' },
      classes: ['rounded-lg', 'bg-blue-500', 'px-4', 'py-2', 'text-white'],
      text: 'Button',
    },
  },
  { id: 'a', label: 'link', template: { tag: 'a', attrs: { href: '#' }, classes: ['underline'], text: 'link' } },
  { id: 'img', label: 'img', template: { tag: 'img', attrs: { src: '', alt: '' }, classes: ['w-full'] } },
  {
    id: 'ul',
    label: 'list',
    template: {
      tag: 'ul',
      classes: ['list-disc', 'pl-6'],
      children: [
        { tag: 'li', text: 'Item one' },
        { tag: 'li', text: 'Item two' },
      ],
    },
  },
]
