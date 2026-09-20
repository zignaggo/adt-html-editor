import type { ReactNode } from 'react'
import type { NodeId } from '../../core/ids'
import { isStyled, labelOf } from '../../core/model'
import { CATEGORIES, type ControlSpec } from '../../tailwind/categories'
import { useNode } from '../Editor/context'
import { useSelectionSummary } from './useSelectionSummary'
import { AttributeFields } from './AttributeFields'
import { ClassChips } from './ClassChips'
import { ClassCombobox } from './ClassCombobox'
import { useInspectorContext } from './context'
import { ControlGroup } from './controls/ControlGroup'
import { useVariantBar } from './useVariantBar'
import {
  ACCORDION_BODY_CLASS,
  ACCORDION_BUTTON_CLASS,
  ACCORDION_CHEVRON_CLASS,
  COUNT_CLASS,
  EMPTY_CLASS,
  HEADER_ACTIONS_CLASS,
  HEADER_BUTTON_CLASS,
  HEADER_CLASS,
  SCROLL_CLASS,
  SECTION_CLASS,
  SECTION_TITLE_CLASS,
  TITLE_CLASS,
  VARIANT_BAR_CLASS,
  VARIANT_BREAKPOINT_CLASS,
  VARIANT_BUTTON_CLASS,
} from './inspectorStyles'

export function InspectorHeader({ children }: { children?: ReactNode }) {
  const { selectedId, selectedIds } = useInspectorContext()
  if (children) return <div className={HEADER_CLASS}>{children}</div>
  if (selectedIds.length > 1) return <MultiSelectedHeader ids={selectedIds} />
  if (!selectedId) {
    return (
      <div className={HEADER_CLASS}>
        <span className={TITLE_CLASS}>Styles</span>
      </div>
    )
  }
  return <SelectedHeader id={selectedId} />
}

function MultiSelectedHeader({ ids }: { ids: readonly NodeId[] }) {
  const summary = useSelectionSummary(ids)
  if (!summary) return null
  return (
    <div className={HEADER_CLASS}>
      <span className={TITLE_CLASS}>{summary.count} elements</span>
      <span className={COUNT_CLASS}>
        {summary.tags.map((entry) => (entry.count > 1 ? `${entry.tag} ×${entry.count}` : entry.tag)).join(' · ')}
      </span>
      <div className={HEADER_ACTIONS_CLASS}>
        <button
          type="button"
          className={HEADER_BUTTON_CLASS}
          onClick={summary.duplicate}
          aria-label={`Duplicate ${summary.count} elements`}
        >
          Duplicate
        </button>
        <button
          type="button"
          className={HEADER_BUTTON_CLASS}
          onClick={summary.remove}
          aria-label={`Delete ${summary.count} elements`}
        >
          Delete
        </button>
        <button
          type="button"
          className={HEADER_BUTTON_CLASS}
          aria-pressed={summary.allLocked}
          onClick={() => summary.setLocked(!summary.allLocked)}
          aria-label={`${summary.allLocked ? 'Unlock' : 'Lock'} ${summary.count} elements`}
        >
          {summary.allLocked ? 'Unlock' : 'Lock'}
        </button>
        <button
          type="button"
          className={HEADER_BUTTON_CLASS}
          disabled={!summary.commonParentId}
          onClick={summary.selectParent}
          aria-label="Select parent"
        >
          Parent
        </button>
      </div>
    </div>
  )
}

function SelectedHeader({ id }: { id: string }) {
  const node = useNode(id)
  if (!node) return null
  return (
    <div className={HEADER_CLASS}>
      <span className={TITLE_CLASS}>{labelOf(node)}</span>
      {isStyled(node) ? <span className={COUNT_CLASS}>{node.classes.length}</span> : null}
    </div>
  )
}

export function InspectorEmpty({ children }: { children?: ReactNode }) {
  const { selectedIds } = useInspectorContext()
  if (selectedIds.length > 0) return null
  return (
    <p className={EMPTY_CLASS}>{children ?? 'Select an element to edit its styles.'}</p>
  )
}

export function InspectorVariants() {
  const bar = useVariantBar()
  if (!bar.selectedId) return null

  return (
    <div className={VARIANT_BAR_CLASS} role="group" aria-label="State">
      <span className={VARIANT_BREAKPOINT_CLASS}>{bar.breakpoint.label}</span>
      {bar.states.map((entry) => (
        <button
          key={entry}
          type="button"
          aria-pressed={bar.isActive(entry)}
          className={VARIANT_BUTTON_CLASS}
          data-active={bar.isActive(entry) || undefined}
          onClick={() => bar.toggle(entry)}
        >
          {entry}
        </button>
      ))}
    </div>
  )
}

export function InspectorBody({ children }: { children?: ReactNode }) {
  const { selectedId } = useInspectorContext()
  if (!selectedId) return null
  return <div className={SCROLL_CLASS}>{children}</div>
}

export function InspectorSection({
  title,
  children,
}: {
  title?: string
  children?: ReactNode
}) {
  return (
    <section className={SECTION_CLASS}>
      {title ? <h3 className={SECTION_TITLE_CLASS}>{title}</h3> : null}
      {children}
    </section>
  )
}

export function InspectorClassInput() {
  const { selectedId, target } = useInspectorContext()
  if (!selectedId) return null
  return <ClassCombobox id={selectedId} target={target} />
}

export function InspectorClassList() {
  const { selectedId, target } = useInspectorContext()
  if (!selectedId) return null
  return <ClassChips id={selectedId} target={target} />
}

export function InspectorAttributes() {
  const { selectedId } = useInspectorContext()
  if (!selectedId) return null
  return <AttributeFields id={selectedId} />
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

  const isOpen = openCategory === id

  return (
    <section className={SECTION_CLASS}>
      <button
        type="button"
        className={ACCORDION_BUTTON_CLASS}
        aria-expanded={isOpen}
        aria-controls={`adt-panel-${id}`}
        onClick={() => setOpenCategory(isOpen ? '' : id)}
      >
        <span>{title ?? category.label}</span>
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
          className={ACCORDION_CHEVRON_CLASS}
          data-open={isOpen || undefined}
        >
          <path
            d="M3 4.5 L6 7.5 L9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div id={`adt-panel-${id}`} hidden={!isOpen} className={ACCORDION_BODY_CLASS}>
        {category.controls.map((control) => (
          <ControlGroup key={control.id} id={selectedId} control={control} target={target} />
        ))}
      </div>
    </section>
  )
}
