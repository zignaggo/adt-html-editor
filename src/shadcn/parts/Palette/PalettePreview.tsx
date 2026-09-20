import type { ComponentType } from 'react'
import { ImageIcon } from 'lucide-react'
import type { NodeTemplate } from '../../../lib/core/store'
import { cn } from '../../lib/utils'

export type PalettePreviewProps = {
  template: NodeTemplate
  className?: string
}

type PreviewKind = 'heading' | 'text' | 'button' | 'link' | 'media' | 'list' | 'grid' | 'flex' | 'box' | 'tag'

const HEADING_SIZE: Record<string, string> = {
  h1: 'text-base',
  h2: 'text-sm',
  h3: 'text-xs',
  h4: 'text-[11px]',
  h5: 'text-[10px]',
  h6: 'text-[10px]',
}

const KIND_BY_TAG: Record<string, PreviewKind> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  p: 'text',
  span: 'text',
  button: 'button',
  a: 'link',
  img: 'media',
  picture: 'media',
  video: 'media',
  ul: 'list',
  ol: 'list',
  div: 'box',
  section: 'box',
  article: 'box',
  main: 'box',
  aside: 'box',
  header: 'box',
  footer: 'box',
  nav: 'box',
}

function previewKindOf(template: NodeTemplate): PreviewKind {
  const classes = template.classes ?? []
  if (classes.includes('grid')) return 'grid'
  if (classes.includes('flex')) return 'flex'
  return KIND_BY_TAG[template.tag] ?? 'tag'
}

function Line({ width }: { width: string }) {
  return <span className="block h-1 rounded-full bg-foreground/25" style={{ width }} />
}

function Block({ className }: { className?: string }) {
  return <span className={cn('block rounded-sm border border-dashed border-foreground/40 bg-foreground/5', className)} />
}

type PreviewProps = { template: NodeTemplate }

function HeadingPreview({ template }: PreviewProps) {
  return (
    <span className={cn('truncate font-bold leading-none', HEADING_SIZE[template.tag])}>
      {template.text || 'Heading'}
    </span>
  )
}

function TextPreview({ template }: PreviewProps) {
  return (
    <span className="flex w-full flex-col gap-1.5 px-2">
      <Line width="100%" />
      <Line width="85%" />
      {template.tag === 'p' ? <Line width="60%" /> : null}
    </span>
  )
}

function ButtonPreview({ template }: PreviewProps) {
  return (
    <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] leading-none font-medium text-primary-foreground">
      {template.text || 'Button'}
    </span>
  )
}

function LinkPreview({ template }: PreviewProps) {
  return <span className="text-[11px] leading-none text-primary underline underline-offset-2">{template.text || 'link'}</span>
}

function MediaPreview() {
  return <ImageIcon className="size-5 text-foreground/50" />
}

function ListPreview() {
  return (
    <span className="flex w-full flex-col gap-1.5 px-2">
      {[0, 1, 2].map((index) => (
        <span key={index} className="flex items-center gap-1.5">
          <span className="size-1 shrink-0 rounded-full bg-foreground/40" />
          <Line width={index === 1 ? '70%' : '90%'} />
        </span>
      ))}
    </span>
  )
}

function GridPreview() {
  return (
    <span className="grid size-full grid-cols-2 gap-1 p-1">
      <Block className="h-3" />
      <Block className="h-3" />
      <Block className="h-3" />
      <Block className="h-3" />
    </span>
  )
}

function FlexPreview({ template }: PreviewProps) {
  const column = (template.classes ?? []).includes('flex-col')
  const item = column ? 'h-2 w-full' : 'h-6 flex-1'
  return (
    <span className={cn('flex size-full gap-1 p-1', column ? 'flex-col' : 'flex-row')}>
      <Block className={item} />
      <Block className={item} />
      <Block className={item} />
    </span>
  )
}

function BoxPreview() {
  return (
    <span className="block size-full p-1">
      <Block className="size-full" />
    </span>
  )
}

function TagPreview({ template }: PreviewProps) {
  return <span className="font-mono text-[11px] text-foreground/70">&lt;{template.tag}&gt;</span>
}

const PREVIEWS: Record<PreviewKind, ComponentType<PreviewProps>> = {
  heading: HeadingPreview,
  text: TextPreview,
  button: ButtonPreview,
  link: LinkPreview,
  media: MediaPreview,
  list: ListPreview,
  grid: GridPreview,
  flex: FlexPreview,
  box: BoxPreview,
  tag: TagPreview,
}

export function PalettePreview({ template, className }: PalettePreviewProps) {
  const Preview = PREVIEWS[previewKindOf(template)]
  return (
    <span className={cn('flex size-full items-center justify-center', className)}>
      <Preview template={template} />
    </span>
  )
}
