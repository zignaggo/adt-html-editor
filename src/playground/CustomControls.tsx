import { useState } from 'react'
import { useClassEditing, useInspectorContext, useStyleControl } from '../lib'
import styles from './CustomControls.module.css'

export function MyClassInput() {
  const { selectedId, variant } = useInspectorContext()
  const editing = useClassEditing(selectedId ?? '')
  const [draft, setDraft] = useState('')

  if (!selectedId) return null

  const submit = () => {
    const value = draft.trim()
    if (!value) return
    editing.apply(value, variant)
    setDraft('')
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="my-class-input">
        Input do outro projeto
      </label>
      <div className={styles.row}>
        <input
          id="my-class-input"
          className={styles.input}
          value={draft}
          placeholder="ex.: rounded-2xl"
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            submit()
          }}
        />
        <button type="button" className={styles.button} onClick={submit}>
          Aplicar
        </button>
      </div>
    </div>
  )
}

export function MyRadiusSlider() {
  const { selectedId, variant } = useInspectorContext()
  const steps = ['rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full']
  const control = useStyleControl(
    selectedId ?? '',
    { roots: ['rounded'], kind: 'options', options: steps.map((value, index) => ({ value, label: String(index) })) },
    variant,
  )

  if (!selectedId) return null

  const current = control.value ? steps.indexOf(control.value) : 0

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="my-radius">
        Raio (slider próprio) <span className={styles.value}>{control.value ?? 'nenhum'}</span>
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
