import { startTransition, useState } from 'react'
import type { NodeId } from '../../../core/ids'
import {
  COLOR_SWATCHES,
  PALETTE_COLORS,
  type ControlSpec,
  type VariantId,
} from '../../../tailwind/categories'
import { useStyleControl } from './useStyleControl'
import styles from '../InspectorPanel.module.css'

export type ControlGroupProps = {
  id: NodeId
  control: ControlSpec
  variant: VariantId
}

export function ControlGroup(props: ControlGroupProps) {
  if (props.control.kind === 'color') return <ColorControl {...props} />
  if (props.control.kind === 'text') return <TextControl {...props} />
  return <OptionsControl {...props} />
}

function OptionsControl({ id, control, variant }: ControlGroupProps) {
  const { value, options, toggle } = useStyleControl(id, control, variant)

  return (
    <div className={styles.control}>
      <span className={styles.controlLabel}>{control.label}</span>
      <div className={styles.controlOptions} role="group" aria-label={control.label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.optionButton}
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

function ColorControl({ id, control, variant }: ControlGroupProps) {
  const { value, toggle, clear } = useStyleControl(id, control, variant)

  return (
    <div className={styles.control}>
      <span className={styles.controlLabel}>
        {control.label}
        {value ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => startTransition(clear)}
          >
            clear
          </button>
        ) : null}
      </span>
      <div className={styles.swatches} role="group" aria-label={control.label}>
        {PALETTE_COLORS.map((color) => {
          const candidate = `${control.roots[0]}-${color}`
          return (
            <button
              key={color}
              type="button"
              className={styles.swatch}
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

function TextControl({ id, control, variant }: ControlGroupProps) {
  const { value, options, set, clear } = useStyleControl(id, control, variant)
  const [draft, setDraft] = useState('')

  return (
    <div className={styles.control}>
      <span className={styles.controlLabel}>
        {control.label}
        {value ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => startTransition(clear)}
          >
            clear
          </button>
        ) : null}
      </span>
      <div className={styles.controlOptions}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.optionButton}
            data-active={value === option.value || undefined}
            aria-pressed={value === option.value}
            onClick={() => startTransition(() => set(option.value))}
          >
            {option.label}
          </button>
        ))}
        <input
          type="text"
          className={styles.inlineInput}
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
