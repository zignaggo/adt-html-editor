import { useState } from 'react'
import type { NodeId } from '../../core/ids'
import { useAttributeFields } from './useAttributeFields'
import {
  ADD_BUTTON_CLASS,
  FIELDS_CLASS,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_CLASS,
  NEW_ATTRIBUTE_CLASS,
  TEXTAREA_CLASS,
} from './inspectorStyles'

export function AttributeFields({ id }: { id: NodeId }) {
  const fields = useAttributeFields(id)

  if (fields.kind === 'none') return null

  if (fields.kind === 'text') {
    return (
      <label className={FIELD_CLASS}>
        <span className={FIELD_LABEL_CLASS}>{fields.label}</span>
        <textarea
          key={fields.node.id}
          className={TEXTAREA_CLASS}
          defaultValue={fields.value}
          rows={3}
          spellCheck={false}
          onBlur={(event) => fields.setValue(event.target.value)}
        />
      </label>
    )
  }

  return (
    <div className={FIELDS_CLASS}>
      {fields.fields.map((field) => (
        <label key={`${fields.node.id}:${field.name}`} className={FIELD_CLASS}>
          <span className={FIELD_LABEL_CLASS}>{field.name}</span>
          <input
            type="text"
            className={INPUT_CLASS}
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
    <div className={NEW_ATTRIBUTE_CLASS}>
      <input
        type="text"
        className={INPUT_CLASS}
        placeholder="attribute"
        aria-label="New attribute name"
        value={name}
        spellCheck={false}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        type="text"
        className={INPUT_CLASS}
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
      <button type="button" className={ADD_BUTTON_CLASS} onClick={commit}>
        Add
      </button>
    </div>
  )
}
