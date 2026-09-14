import { useState } from 'react'
import type { NodeId } from '../../core/ids'
import { useAttributeFields } from './useAttributeFields'
import styles from './InspectorPanel.module.css'

export function AttributeFields({ id }: { id: NodeId }) {
  const fields = useAttributeFields(id)

  if (fields.kind === 'none') return null

  if (fields.kind === 'text') {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{fields.label}</span>
        <textarea
          key={fields.node.id}
          className={styles.textarea}
          defaultValue={fields.value}
          rows={3}
          spellCheck={false}
          onBlur={(event) => fields.setValue(event.target.value)}
        />
      </label>
    )
  }

  return (
    <div className={styles.fields}>
      {fields.fields.map((field) => (
        <label key={`${fields.node.id}:${field.name}`} className={styles.field}>
          <span className={styles.fieldLabel}>{field.name}</span>
          <input
            type="text"
            className={styles.input}
            defaultValue={field.value}
            spellCheck={false}
            onBlur={(event) => fields.setAttribute(field.name, event.target.value)}
          />
        </label>
      ))}
      <NewAttribute onAdd={fields.addAttribute} />
    </div>
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
    <div className={styles.newAttribute}>
      <input
        type="text"
        className={styles.input}
        placeholder="attribute"
        aria-label="New attribute name"
        value={name}
        spellCheck={false}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        type="text"
        className={styles.input}
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
      <button type="button" className={styles.addButton} onClick={commit}>
        Add
      </button>
    </div>
  )
}
