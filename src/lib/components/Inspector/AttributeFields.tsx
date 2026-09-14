import { useState } from 'react'
import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { useEditor, useNode } from '../Editor/context'
import styles from './InspectorPanel.module.css'

const COMMON_ATTRS: Record<string, string[]> = {
  a: ['id', 'href', 'target', 'rel', 'title'],
  img: ['id', 'src', 'alt', 'width', 'height', 'loading'],
  input: ['id', 'type', 'name', 'placeholder', 'value'],
  button: ['id', 'type', 'name', 'disabled'],
  default: ['id', 'title'],
}

export function AttributeFields({ id }: { id: NodeId }) {
  const node = useNode(id)
  const { setAttr, setText } = useEditor()

  if (!node) return null

  if (node.kind === 'text' || node.kind === 'comment') {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{node.kind === 'text' ? 'Text' : 'Comment'}</span>
        <textarea
          key={node.id}
          className={styles.textarea}
          defaultValue={node.value}
          rows={3}
          spellCheck={false}
          onBlur={(event) => setText(id, event.target.value)}
        />
      </label>
    )
  }

  if (!isStyled(node)) return null

  const names = COMMON_ATTRS[node.tag] ?? COMMON_ATTRS.default
  const known = new Set(names)
  const extras = Object.keys(node.attrs).filter((name) => !known.has(name))

  return (
    <div className={styles.fields}>
      {[...names, ...extras].map((name) => (
        <label key={`${node.id}:${name}`} className={styles.field}>
          <span className={styles.fieldLabel}>{name}</span>
          <input
            type="text"
            className={styles.input}
            defaultValue={node.attrs[name] ?? ''}
            spellCheck={false}
            onBlur={(event) => setAttr(id, name, event.target.value || null)}
          />
        </label>
      ))}
      <NewAttribute id={id} />
    </div>
  )
}

function NewAttribute({ id }: { id: NodeId }) {
  const { setAttr } = useEditor()
  const [name, setName] = useState('')
  const [value, setValue] = useState('')

  const commit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setAttr(id, trimmed, value)
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
