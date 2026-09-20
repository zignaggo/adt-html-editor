import { Fragment, createElement, startTransition, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CornerLeftUpIcon,
  LockIcon,
  LockOpenIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon,
} from 'lucide-react'
import { useNode } from '../../../lib/components/Editor/context'
import { useInspectorContext } from '../../../lib/components/Inspector/context'
import { InspectorProvider } from '../../../lib/components/Inspector/InspectorPanel'
import { useAttributeFields } from '../../../lib/components/Inspector/useAttributeFields'
import { useClassEditing } from '../../../lib/components/Inspector/useClassEditing'
import { useClassSuggestions } from '../../../lib/components/Inspector/useClassSuggestions'
import { useNodeSummary, type NodeSummary } from '../../../lib/components/Inspector/useNodeSummary'
import { useVariantBar } from '../../../lib/components/Inspector/useVariantBar'
import { useStyleControl } from '../../../lib/components/Inspector/controls/useStyleControl'
import type { NodeId } from '../../../lib/core/ids'
import { isStyled } from '../../../lib/core/model'
import { CATEGORIES, COLOR_SWATCHES, PALETTE_COLORS, type ControlSpec } from '../../../lib/tailwind/categories'
import {
  matchesTarget,
  stripVariants,
  type BreakpointId,
  type StateVariant,
  type StyleTarget,
} from '../../../lib/tailwind/variants'
import { cn } from '../../lib/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion'
import { Badge } from '../../ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../ui/breadcrumb'
import { Button } from '../../ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../ui/combobox'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '../../ui/empty'
import { Field, FieldGroup, FieldLabel } from '../../ui/field'
import { Input } from '../../ui/input'
import { ScrollArea } from '../../ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { Textarea } from '../../ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { elementIconFor, kindLabelFor } from './elementIcon'
import { MultiSelectedHeader } from './MultiSelectedHeader'
import { InspectorPosition } from './InspectorPosition'
import { InspectorTransform } from './InspectorTransform'
import { InspectorStyles } from './sections/InspectorStyles'

export type InspectorPanelProps = {
  className?: string
  children?: ReactNode
}

export function InspectorPanel({ className, children }: InspectorPanelProps) {
  return (
    <InspectorProvider>
      <aside
        aria-label="Styles"
        className={cn('flex min-h-0 flex-col border-l bg-background text-foreground', className)}
      >
        {children ?? <DefaultInspector />}
      </aside>
    </InspectorProvider>
  )
}

function DefaultInspector() {
  return (
    <>
      <InspectorHeader />
      <InspectorVariants />
      <InspectorEmpty />
      <InspectorBody>
        <InspectorSection title="Classes">
          <InspectorClassInput />
          <InspectorClassList />
        </InspectorSection>
        <InspectorPosition />
        <InspectorTransform />
        <InspectorStyles />
      </InspectorBody>
    </>
  )
}

export function InspectorHeader({ children }: { children?: ReactNode }) {
  const { selectedId, selectedIds } = useInspectorContext()
  return (
    <div className="flex min-h-10 shrink-0 flex-col justify-center px-3">
      {children ?? <HeaderContent selectedId={selectedId} selectedIds={selectedIds} />}
    </div>
  )
}

function HeaderContent({
  selectedId,
  selectedIds,
}: {
  selectedId: NodeId | null
  selectedIds: readonly NodeId[]
}) {
  if (selectedIds.length > 1) return <MultiSelectedHeader ids={selectedIds} />
  if (selectedId) return <SelectedHeader id={selectedId} />
  return (
    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      Styles
    </span>
  )
}

function SelectedHeader({ id }: { id: NodeId }) {
  const summary = useNodeSummary(id)
  if (!summary) return null
  const meta = [kindLabelFor(summary.node)]
  if (summary.classCount > 0) meta.push(`${summary.classCount} ${summary.classCount === 1 ? 'class' : 'classes'}`)
  if (summary.childCount > 0) meta.push(`${summary.childCount} ${summary.childCount === 1 ? 'child' : 'children'}`)

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        >
          {createElement(elementIconFor(summary.node), { className: 'size-4' })}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-baseline gap-1 font-mono text-sm">
            <span className="truncate font-semibold">{summary.tag ?? summary.label}</span>
            {summary.attrId ? <span className="truncate text-muted-foreground">#{summary.attrId}</span> : null}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{meta.join(' · ')}</div>
        </div>
        <HeaderActions summary={summary} />
      </div>
      <AncestorCrumbs summary={summary} />
      {summary.textPreview ? (
        <p className="truncate text-xs text-muted-foreground italic" title={summary.textPreview}>
          “{summary.textPreview}”
        </p>
      ) : null}
    </div>
  )
}

function HeaderActions({ summary }: { summary: NodeSummary }) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={summary.isLocked ? 'Unlock element' : 'Lock element'}
              aria-pressed={summary.isLocked}
              className={summary.isLocked ? 'text-foreground' : 'text-muted-foreground'}
              onClick={() => summary.setLocked(!summary.isLocked)}
            />
          }
        >
          {summary.isLocked ? <LockIcon /> : <LockOpenIcon />}
        </TooltipTrigger>
        <TooltipContent>{summary.isLocked ? 'Unlock position' : 'Lock position'}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Select parent"
              className="text-muted-foreground"
              disabled={!summary.parentId}
              onClick={summary.selectParent}
            />
          }
        >
          <CornerLeftUpIcon />
        </TooltipTrigger>
        <TooltipContent>Select parent</TooltipContent>
      </Tooltip>
    </>
  )
}

function AncestorCrumbs({ summary }: { summary: NodeSummary }) {
  if (summary.ancestors.length === 0) return null
  return (
    <Breadcrumb aria-label="Ancestors">
      <BreadcrumbList className="flex-nowrap gap-0.5 overflow-hidden text-[11px] sm:gap-0.5">
        {summary.ancestors.map((crumb) => (
          <Fragment key={crumb.id}>
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink
                render={<button type="button" />}
                className="truncate font-mono"
                onClick={() => summary.select(crumb.id)}
              >
                {crumb.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="[&>svg]:size-3" />
          </Fragment>
        ))}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate font-mono">{summary.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function InspectorEmpty({ children }: { children?: ReactNode }) {
  const { selectedIds } = useInspectorContext()
  if (selectedIds.length > 0) return null
  return (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle className="text-sm">Nothing selected</EmptyTitle>
        <EmptyDescription>{children ?? 'Select an element to edit its styles.'}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

const BREAKPOINT_ICONS: Record<BreakpointId, typeof MonitorIcon> = {
  desktop: MonitorIcon,
  tablet: TabletIcon,
  mobile: SmartphoneIcon,
}

const STATE_ITEMS = [
  { value: 'hover', label: 'hover' },
  { value: 'focus', label: 'focus' },
  { value: 'active', label: 'active' },
  { value: 'dark', label: 'dark' },
]

export function InspectorVariants() {
  const bar = useVariantBar()
  if (!bar.selectedId) return null
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-3">
      <Badge
        variant="outline"
        className="h-8 shrink-0 gap-1.5 px-2"
        title={`Styling the ${bar.breakpoint.label.toLowerCase()} breakpoint`}
      >
        {createElement(BREAKPOINT_ICONS[bar.breakpoint.id])}
        {bar.breakpoint.label}
      </Badge>
      <Select
        value={bar.active}
        items={STATE_ITEMS}
        onValueChange={(value) => bar.setActive(typeof value === 'string' ? (value as StateVariant) : null)}
      >
        <SelectTrigger className="min-w-0 flex-1" aria-label="State">
          <SelectValue placeholder="Default state" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {bar.states.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {bar.active ? (
        <Button variant="ghost" size="icon-sm" aria-label="Clear state" onClick={bar.clear}>
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}

export function InspectorBody({ children }: { children?: ReactNode }) {
  const { selectedId } = useInspectorContext()
  if (!selectedId) return null
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 p-3">{children}</div>
    </ScrollArea>
  )
}

export function InspectorSection({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {title ? <h3 className="text-xs font-medium text-muted-foreground">{title}</h3> : null}
      {children}
    </section>
  )
}

export function InspectorClassInput() {
  const { selectedId, target } = useInspectorContext()
  if (!selectedId) return null
  return <ClassCombobox id={selectedId} target={target} />
}

function ClassCombobox({ id, target }: { id: NodeId; target: StyleTarget }) {
  const editing = useClassEditing(id)
  const [query, setQuery] = useState('')
  const suggestions = useClassSuggestions(query)
  const highlighted = useRef<string | undefined>(undefined)

  const commit = (className: string) => {
    if (!className.trim()) return
    startTransition(() => editing.apply(className, target))
    setQuery('')
  }

  return (
    <Combobox
      items={suggestions}
      filter={null}
      autoHighlight
      value={null}
      onValueChange={(value) => {
        if (typeof value === 'string') commit(value)
      }}
      inputValue={query}
      onInputValueChange={(value, details) => setQuery(details.reason === 'item-press' ? '' : value)}
      onItemHighlighted={(value) => {
        highlighted.current = typeof value === 'string' ? value : undefined
      }}
    >
      <ComboboxInput
        placeholder="Add class…"
        aria-label="Add class"
        showTrigger={false}
        className="w-full font-mono text-xs"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || highlighted.current !== undefined) return
          event.preventDefault()
          commit(suggestions[0] ?? query)
        }}
      />
      <ComboboxContent>
        <ComboboxEmpty>{query ? 'No matching class.' : 'Type to search classes.'}</ComboboxEmpty>
        <ComboboxList>
          {(className: string) => (
            <ComboboxItem key={className} value={className} className="font-mono text-xs">
              {className}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function InspectorClassList() {
  const { selectedId, target } = useInspectorContext()
  if (!selectedId) return null
  return <ClassChips id={selectedId} target={target} />
}

function ClassChips({ id, target }: { id: NodeId; target: StyleTarget }) {
  const node = useNode(id)
  const editing = useClassEditing(id)
  if (!node || !isStyled(node)) return null

  const visible: { className: string; index: number }[] = []
  for (let index = 0; index < node.classes.length; index += 1) {
    const className = node.classes[index]
    if (matchesTarget(className, target)) visible.push({ className, index })
  }

  if (visible.length === 0) {
    return <p className="text-xs text-muted-foreground">No classes for this target.</p>
  }

  return (
    <ul className="flex flex-col gap-1">
      {visible.map(({ className, index }) => (
        <li key={className} className="flex items-center gap-1">
          <Badge variant="secondary" className="min-w-0 flex-1 justify-start font-mono">
            <span className="truncate">{stripVariants(className)}</span>
          </Badge>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Move ${className} up`}
            disabled={index === 0}
            onClick={() => editing.reorder(index, index - 1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Move ${className} down`}
            disabled={index === node.classes.length - 1}
            onClick={() => editing.reorder(index, index + 1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive"
            aria-label={`Remove ${className}`}
            onClick={() => editing.remove(className)}
          >
            <XIcon />
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function InspectorAttributes() {
  const { selectedId } = useInspectorContext()
  if (!selectedId) return null
  return <AttributeFields id={selectedId} />
}

function AttributeFields({ id }: { id: NodeId }) {
  const fields = useAttributeFields(id)
  if (fields.kind === 'none') return null

  if (fields.kind === 'text') {
    return (
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`adt-attr-${id}-text`}>{fields.label}</FieldLabel>
          <Textarea
            id={`adt-attr-${id}-text`}
            key={fields.node.id}
            defaultValue={fields.value}
            rows={3}
            spellCheck={false}
            onBlur={(event) => fields.setValue(event.target.value)}
          />
        </Field>
      </FieldGroup>
    )
  }

  return (
    <FieldGroup className="gap-2">
      {fields.fields.map((field) => (
        <Field key={`${fields.node.id}:${field.name}`} orientation="horizontal">
          <FieldLabel htmlFor={`adt-attr-${id}-${field.name}`} className="w-20 shrink-0 font-mono text-xs">
            {field.name}
          </FieldLabel>
          <Input
            id={`adt-attr-${id}-${field.name}`}
            className="h-7 text-xs"
            defaultValue={field.value}
            spellCheck={false}
            onBlur={(event) => fields.setAttribute(field.name, event.target.value)}
          />
        </Field>
      ))}
      <NewAttribute onAdd={fields.addAttribute} />
    </FieldGroup>
  )
}

function NewAttribute({ onAdd }: { onAdd: (name: string, value: string) => boolean }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')

  const commit = () => {
    if (!onAdd(name, value)) return
    setName('')
    setValue('')
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-7 text-xs"
        placeholder="attribute"
        aria-label="New attribute name"
        value={name}
        spellCheck={false}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        className="h-7 text-xs"
        placeholder="value"
        aria-label="New attribute value"
        value={value}
        spellCheck={false}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          commit()
        }}
      />
      <Button variant="outline" size="sm" onClick={commit}>
        Add
      </Button>
    </div>
  )
}

export type InspectorControlProps =
  | { id: string; control?: never }
  | { control: ControlSpec; id?: never }

export function InspectorControl({ id, control }: InspectorControlProps) {
  const { selectedId, target } = useInspectorContext()
  const resolved =
    control ??
    CATEGORIES.flatMap((category) => category.controls).find((entry) => entry.id === id)
  if (!selectedId || !resolved) return null
  return <ControlGroup id={selectedId} control={resolved} target={target} />
}

export function InspectorCategory({ id, title }: { id: string; title?: string }) {
  const { selectedId, target, openCategory, setOpenCategory } = useInspectorContext()
  const category = CATEGORIES.find((entry) => entry.id === id)
  if (!selectedId || !category) return null

  return (
    <Accordion
      value={openCategory === id ? [id] : []}
      onValueChange={(value) => setOpenCategory((value as string[])[0] ?? '')}
    >
      <AccordionItem value={id} className="border-b-0">
        <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
          {title ?? category.label}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3 pb-2">
          {category.controls.map((control) => (
            <ControlGroup key={control.id} id={selectedId} control={control} target={target} />
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

type ControlGroupProps = { id: NodeId; control: ControlSpec; target: StyleTarget }

function ControlGroup(props: ControlGroupProps) {
  if (props.control.kind === 'color') return <ColorControl {...props} />
  if (props.control.kind === 'text') return <TextControl {...props} />
  return <OptionsControl {...props} />
}

function ControlLabel({ label, onClear }: { label: string; onClear?: (() => void) | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {onClear ? (
        <Button variant="link" size="xs" className="h-auto p-0 text-xs" onClick={onClear}>
          clear
        </Button>
      ) : null}
    </div>
  )
}

function OptionsControl({ id, control, target }: ControlGroupProps) {
  const { value, options, toggle } = useStyleControl(id, control, target)
  return (
    <div className="flex flex-col gap-1">
      <ControlLabel label={control.label} />
      <ToggleGroup
        value={value ? [value] : []}
        onValueChange={(next) => {
          const target = (next as string[])[0] ?? value
          if (target) startTransition(() => toggle(target))
        }}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label={control.label}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

function ColorControl({ id, control, target }: ControlGroupProps) {
  const { value, toggle, clear } = useStyleControl(id, control, target)
  return (
    <div className="flex flex-col gap-1">
      <ControlLabel label={control.label} onClear={value ? () => startTransition(clear) : null} />
      <div className="flex flex-wrap gap-1" role="group" aria-label={control.label}>
        {PALETTE_COLORS.map((color) => {
          const candidate = `${control.roots[0]}-${color}`
          const active = value === candidate
          return (
            <button
              key={color}
              type="button"
              className={cn(
                'size-5 rounded-full border border-border ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                active && 'ring-2 ring-ring ring-offset-1',
              )}
              style={{ background: COLOR_SWATCHES[color] }}
              aria-pressed={active}
              aria-label={color}
              title={color}
              onClick={() => startTransition(() => toggle(candidate))}
            />
          )
        })}
      </div>
    </div>
  )
}

function TextControl({ id, control, target }: ControlGroupProps) {
  const { value, options, set, clear } = useStyleControl(id, control, target)
  const [draft, setDraft] = useState('')
  return (
    <div className="flex flex-col gap-1">
      <ControlLabel label={control.label} onClear={value ? () => startTransition(clear) : null} />
      <div className="flex flex-wrap items-center gap-1">
        {options.length > 0 ? (
          <ToggleGroup
            value={value ? [value] : []}
            onValueChange={(next) => {
              const picked = (next as string[])[0]
              if (picked) startTransition(() => set(picked))
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label={control.label}
            className="flex-wrap"
          >
            {options.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : null}
        <Input
          className="h-7 min-w-24 flex-1 font-mono text-xs"
          placeholder={value ?? `${control.roots[0]}-…`}
          value={draft}
          spellCheck={false}
          aria-label={`Custom ${control.label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            const next = draft.trim()
            if (!next) return
            const className = next.startsWith(control.roots[0]) ? next : `${control.roots[0]}-[${next}]`
            startTransition(() => set(className))
            setDraft('')
          }}
        />
      </div>
    </div>
  )
}
