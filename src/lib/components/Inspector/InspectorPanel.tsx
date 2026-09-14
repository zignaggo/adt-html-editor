import { useState, type ReactNode } from 'react'
import { CATEGORIES, type VariantId } from '../../tailwind/categories'
import { useEditorSelector } from '../Editor/context'
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

export type InspectorPanelProps = {
  className?: string
  children?: ReactNode
}

export function InspectorPanel({ className, children }: InspectorPanelProps) {
  const selectedId = useEditorSelector((state) => state.selectedId)
  const [variant, setVariant] = useState<VariantId>('base')
  const [openCategory, setOpenCategory] = useState<string>(CATEGORIES[0]?.id ?? '')

  const context: InspectorContextValue = {
    selectedId,
    variant,
    setVariant,
    openCategory,
    setOpenCategory,
  }

  return (
    <InspectorContext.Provider value={context}>
      <aside
        className={className ? `${styles.panel} ${className}` : styles.panel}
        aria-label="Styles"
      >
        {children ?? <DefaultInspector />}
      </aside>
    </InspectorContext.Provider>
  )
}

function DefaultInspector() {
  return (
    <>
      <InspectorHeader />
      <InspectorEmpty />
      <InspectorVariants />
      <InspectorBody>
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
