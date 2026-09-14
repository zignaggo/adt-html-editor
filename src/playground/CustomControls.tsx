import { useState } from 'react'
import { useClassEditing, useInspectorContext, useStyleControl } from '../lib'
import styles from './CustomControls.module.css'

export function MyClassInput() {
  const { selectedId, target } = useInspectorContext()
  const editing = useClassEditing(selectedId ?? '')
  const [draft, setDraft] = useState('')

  if (!selectedId) return null

  const submit = () => {
    const value = draft.trim()
    if (!value) return
    editing.apply(value, target)
    setDraft('')
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="my-class-input">
        Input from another project
      </label>
      <div className={styles.row}>
        <input
          id="my-class-input"
          className={styles.input}
          value={draft}
          placeholder="e.g. rounded-2xl"
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            submit()
          }}
        />
        <button type="button" className={styles.button} onClick={submit}>
          Apply
        </button>
      </div>
    </div>
  )
}

export function MyRadiusSlider() {
  const { selectedId, target } = useInspectorContext()
  const steps = ['rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full']
  const control = useStyleControl(
    selectedId ?? '',
    { roots: ['rounded'], kind: 'options', options: steps.map((value, index) => ({ value, label: String(index) })) },
    target,
  )

  if (!selectedId) return null

  const current = control.value ? steps.indexOf(control.value) : 0

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="my-radius">
        Radius (custom slider) <span className={styles.value}>{control.value ?? 'none'}</span>
      </label>
      <input
        id="my-radius"
        className={styles.slider}
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={current < 0 ? 0 : current}
        onChange={(event) => control.set(steps[Number(event.target.value)])}
      />
    </div>
  )
}
