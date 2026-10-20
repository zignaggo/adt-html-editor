import { useEffect, useRef, useState } from 'react'
import { FlowIcon } from '../flowIcons'
import {
  LAYOUT_ITEM_CLASS,
  LAYOUT_LIST_CLASS,
  LAYOUT_POPOVER_CLASS,
  LAYOUT_REASON_CLASS,
  TOOLBAR_BUTTON_CLASS,
} from '../flowStyles'
import type { FlowTarget } from '../useFlowSelection'
import { useLayoutMenu, type LayoutAction } from './useLayoutMenu'

export function LayoutControls({ target }: { target: FlowTarget }) {
  const menu = useLayoutMenu(target)
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

  if (!menu) return null

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        aria-label="Layout"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
      >
        <FlowIcon name="layout" />
      </button>
      {isOpen ? (
        <LayoutPanel
          key={target.id}
          actions={menu.actions}
          onPick={(action) => {
            action.run()
            setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

function LayoutPanel({
  actions,
  onPick,
}: {
  actions: readonly LayoutAction[]
  onPick: (action: LayoutAction) => void
}) {
  return (
    <div className={LAYOUT_POPOVER_CLASS}>
      <ul className={LAYOUT_LIST_CLASS} aria-label="Layout presets">
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              className={LAYOUT_ITEM_CLASS}
              disabled={action.blocked !== null}
              aria-label={action.blocked ? `${action.label}, ${action.blocked}` : action.label}
              onClick={() => onPick(action)}
            >
              <span>{action.label}</span>
              {action.blocked ? (
                <span className={LAYOUT_REASON_CLASS}>{action.blocked}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
