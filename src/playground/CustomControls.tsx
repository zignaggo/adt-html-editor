import { useState } from 'react'
import { useClassEditing, useInspectorContext, useStyleControl } from '../lib'

const FIELD_CLASS = 'flex flex-col gap-1.5'
const LABEL_CLASS = 'flex items-center justify-between gap-2 text-[11px] text-muted-foreground'
const VALUE_CLASS = 'font-mono text-foreground tabular-nums'

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
    <div className={FIELD_CLASS}>
      <label className={LABEL_CLASS} htmlFor="my-class-input">
        Input from another project
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
        <input
          id="my-class-input"
          className="min-h-7 rounded-lg border border-dashed border-purple-500 bg-purple-500/8 px-2 font-mono text-[11px] text-inherit"
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
        <button
          type="button"
          className="min-h-7 cursor-pointer rounded-lg border-0 bg-purple-500 px-2.5 font-[inherit] text-[11px] text-white transition-[scale,background-color] duration-100 ease-out active:scale-95"
          onClick={submit}
        >
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
    <div className={FIELD_CLASS}>
      <label className={LABEL_CLASS} htmlFor="my-radius">
        Radius (custom slider) <span className={VALUE_CLASS}>{control.value ?? 'none'}</span>
      </label>
      <input
        id="my-radius"
        className="w-full accent-purple-500"
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
