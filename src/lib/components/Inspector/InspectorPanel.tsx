import { useDeferredValue, useState, type ReactNode } from 'react'
import { CATEGORIES } from '../../tailwind/categories'
import type { StateVariant, StyleTarget } from '../../tailwind/variants'
import { useBreakpoint, useEditorSelector } from '../Editor/context'
import type { EditorState } from '../../core/store'
import { InspectorPosition } from '../../fixed/InspectorPosition'
import { InspectorTransform } from '../../fixed/InspectorTransform'
import { InspectorContext, type InspectorContextValue } from './context'
import {
  InspectorAttributes,
  InspectorBody,
  InspectorCategory,
  InspectorClassInput,
  InspectorClassList,
  InspectorEmpty,
  InspectorHeader,
  InspectorSection,
  InspectorVariants,
} from './InspectorParts'
import styles from './InspectorPanel.module.css'

const selectSelectedId = (state: EditorState) => state.selectedId

export function InspectorProvider({ children }: { children: ReactNode }) {
  const selected = useEditorSelector(selectSelectedId)
  const selectedId = useDeferredValue(selected)
  const [state, setState] = useState<StateVariant | null>(null)
  const breakpoint = useBreakpoint()
  const target: StyleTarget = { breakpoint, state }
  const [openCategory, setOpenCategory] = useState<string>(CATEGORIES[0]?.id ?? '')

  const context: InspectorContextValue = {
    selectedId,
    breakpoint,
    state,
    setState,
    target,
    openCategory,
    setOpenCategory,
  }

  return <InspectorContext value={context}>{children}</InspectorContext>
}

export type InspectorPanelProps = {
  className?: string
  children?: ReactNode
}

export function InspectorPanel({ className, children }: InspectorPanelProps) {
  return (
    <InspectorProvider>
      <aside
        className={className ? `${styles.panel} ${className}` : styles.panel}
        aria-label="Styles"
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
      <InspectorEmpty />
      <InspectorVariants />
      <InspectorBody>
        <InspectorPosition />
        <InspectorTransform />
        <InspectorSection title="Classes">
          <InspectorClassInput />
          <InspectorClassList />
        </InspectorSection>
        {CATEGORIES.map((category) => (
          <InspectorCategory key={category.id} id={category.id} />
        ))}
        <InspectorSection title="Attributes">
          <InspectorAttributes />
        </InspectorSection>
      </InspectorBody>
    </>
  )
}
