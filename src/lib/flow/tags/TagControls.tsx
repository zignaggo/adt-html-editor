import { useEffect, useRef, useState } from 'react'
import { FlowIcon } from '../flowIcons'
import {
  POPOVER_CLASS,
  TAG_LIST_CLASS,
  TAG_NAME_CLASS,
  TAG_OPTION_CLASS,
  TAG_REASON_CLASS,
  TOOLBAR_BUTTON_CLASS,
} from '../flowStyles'
import type { FlowTarget } from '../useFlowSelection'
import type { RetagBlock } from './retag'
import { useRetag, type Retag } from './useRetag'

const REASONS: Record<RetagBlock, string> = {
  unsupported: 'not valid here',
  locked: 'locked',
  editing: 'editing text',
}

export function TagControls({ target }: { target: FlowTarget }) {
  const retag = useRetag(target.id)
  const [isOpen, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const wrapper = wrapperRef.current
      if (wrapper && !wrapper.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  if (!retag.tag || !retag.canRetag) return null

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        aria-label={`Tag: ${retag.tag}`}
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
      >
        <FlowIcon name="tag" />
        <span className="font-mono">{retag.tag}</span>
      </button>
      {isOpen ? (
        <TagPanel
          key={target.id}
          retag={retag}
          onPick={(tag) => {
            retag.setTag(tag)
            setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

function TagPanel({ retag, onPick }: { retag: Retag; onPick: (tag: string) => void }) {
  return (
    <div className={POPOVER_CLASS}>
      <ul className={TAG_LIST_CLASS} aria-label="Change tag">
        {retag.options.map((option) => (
          <li key={option.tag}>
            <button
              type="button"
              className={TAG_OPTION_CLASS}
              disabled={option.blocked !== null}
              aria-current={option.current}
              aria-label={option.blocked ? `${option.tag}, ${REASONS[option.blocked]}` : option.tag}
              onClick={() => onPick(option.tag)}
            >
              <span className={TAG_NAME_CLASS}>{option.tag}</span>
              {option.blocked ? (
                <span className={TAG_REASON_CLASS}>{REASONS[option.blocked]}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
