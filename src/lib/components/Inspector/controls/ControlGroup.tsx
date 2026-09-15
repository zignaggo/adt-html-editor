import { startTransition, useState } from 'react'
import type { NodeId } from '../../../core/ids'
import { COLOR_SWATCHES, PALETTE_COLORS, type ControlSpec } from '../../../tailwind/categories'
import type { StyleTarget } from '../../../tailwind/variants'
import { useStyleControl } from './useStyleControl'
import {
  CLEAR_BUTTON_CLASS,
  CONTROL_CLASS,
  CONTROL_LABEL_CLASS,
  CONTROL_OPTIONS_CLASS,
  INLINE_INPUT_CLASS,
  OPTION_BUTTON_CLASS,
  SWATCHES_CLASS,
  SWATCH_CLASS,
} from '../inspectorStyles'

export type ControlGroupProps = {
  id: NodeId
  control: ControlSpec
  target: StyleTarget
}

export function ControlGroup(props: ControlGroupProps) {
  if (props.control.kind === 'color') return <ColorControl {...props} />
  if (props.control.kind === 'text') return <TextControl {...props} />
  return <OptionsControl {...props} />
}

function OptionsControl({ id, control, target }: ControlGroupProps) {
  const { value, options, toggle } = useStyleControl(id, control, target)

  return (
    <div className={CONTROL_CLASS}>
      <span className={CONTROL_LABEL_CLASS}>{control.label}</span>
      <div className={CONTROL_OPTIONS_CLASS} role="group" aria-label={control.label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={OPTION_BUTTON_CLASS}
            data-active={value === option.value || undefined}
            aria-pressed={value === option.value}
            onClick={() => startTransition(() => toggle(option.value))}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColorControl({ id, control, target }: ControlGroupProps) {
  const { value, toggle, clear } = useStyleControl(id, control, target)

  return (
    <div className={CONTROL_CLASS}>
      <span className={CONTROL_LABEL_CLASS}>
        {control.label}
        {value ? (
          <button
            type="button"
            className={CLEAR_BUTTON_CLASS}
            onClick={() => startTransition(clear)}
          >
            clear
          </button>
        ) : null}
      </span>
      <div className={SWATCHES_CLASS} role="group" aria-label={control.label}>
        {PALETTE_COLORS.map((color) => {
          const candidate = `${control.roots[0]}-${color}`
          return (
            <button
              key={color}
              type="button"
              className={SWATCH_CLASS}
              data-active={value === candidate || undefined}
              aria-pressed={value === candidate}
              aria-label={color}
              title={color}
              onClick={() => startTransition(() => toggle(candidate))}
            >
              <span style={{ background: COLOR_SWATCHES[color] }} data-color={color} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TextControl({ id, control, target }: ControlGroupProps) {
  const { value, options, set, clear } = useStyleControl(id, control, target)
  const [draft, setDraft] = useState('')

  return (
    <div className={CONTROL_CLASS}>
      <span className={CONTROL_LABEL_CLASS}>
        {control.label}
        {value ? (
          <button
            type="button"
            className={CLEAR_BUTTON_CLASS}
            onClick={() => startTransition(clear)}
          >
            clear
          </button>
        ) : null}
      </span>
      <div className={CONTROL_OPTIONS_CLASS}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={OPTION_BUTTON_CLASS}
            data-active={value === option.value || undefined}
            aria-pressed={value === option.value}
            onClick={() => startTransition(() => set(option.value))}
          >
            {option.label}
          </button>
        ))}
        <input
          type="text"
          className={INLINE_INPUT_CLASS}
          placeholder={value ?? `${control.roots[0]}-…`}
          value={draft}
          spellCheck={false}
          aria-label={`Custom ${control.label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            const next = draft.trim()
            if (!next) return
            const className = next.startsWith(control.roots[0])
              ? next
              : `${control.roots[0]}-[${next}]`
            startTransition(() => set(className))
            setDraft('')
          }}
        />
      </div>
    </div>
  )
}
