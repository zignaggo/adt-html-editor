import type { ReactNode } from 'react'
import { isStyled, labelOf } from '../../core/model'
import { CATEGORIES, type ControlSpec } from '../../tailwind/categories'
import { useNode } from '../Editor/context'
import { AttributeFields } from './AttributeFields'
import { ClassChips } from './ClassChips'
import { ClassCombobox } from './ClassCombobox'
import { useInspectorContext } from './context'
import { ControlGroup } from './controls/ControlGroup'
import { useVariantBar } from './useVariantBar'
import styles from './InspectorPanel.module.css'

export function InspectorHeader({ children }: { children?: ReactNode }) {
  const { selectedId } = useInspectorContext()
  if (children) return <div className={styles.header}>{children}</div>
  if (!selectedId) {
    return (
      <div className={styles.header}>
        <span className={styles.title}>Styles</span>
      </div>
    )
  }
  return <SelectedHeader id={selectedId} />
}

function SelectedHeader({ id }: { id: string }) {
  const node = useNode(id)
  if (!node) return null
  return (
    <div className={styles.header}>
      <span className={styles.title}>{labelOf(node)}</span>
      {isStyled(node) ? <span className={styles.count}>{node.classes.length}</span> : null}
    </div>
  )
}

export function InspectorEmpty({ children }: { children?: ReactNode }) {
  const { selectedId } = useInspectorContext()
  if (selectedId) return null
  return (
    <p className={styles.empty}>{children ?? 'Select an element to edit its styles.'}</p>
  )
}

export function InspectorVariants() {
  const bar = useVariantBar()
  if (!bar.selectedId) return null

  return (
    <div className={styles.variantBar} role="group" aria-label="State">
      <span className={styles.variantBreakpoint}>{bar.breakpoint.label}</span>
      {bar.states.map((entry) => (
        <button
          key={entry}
          type="button"
          aria-pressed={bar.isActive(entry)}
          className={styles.variantButton}
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
  return <div className={styles.scroll}>{children}</div>
}

export function InspectorSection({
  title,
  children,
}: {
  title?: string
  children?: ReactNode
}) {
  return (
    <section className={styles.section}>
      {title ? <h3 className={styles.sectionTitle}>{title}</h3> : null}
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
    <section className={styles.section}>
      <button
        type="button"
        className={styles.accordionButton}
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
          className={styles.accordionChevron}
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
      <div id={`adt-panel-${id}`} hidden={!isOpen} className={styles.accordionBody}>
        {category.controls.map((control) => (
          <ControlGroup key={control.id} id={selectedId} control={control} target={target} />
        ))}
      </div>
    </section>
  )
}
