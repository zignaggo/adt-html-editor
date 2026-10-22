import { useSelector } from '@tanstack/react-store'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { ITEM_CLASS, MENU_CLASS, SEPARATOR_CLASS } from './contextMenuStyles'
import { contextMenu } from './contextMenuStore'
import { MenuIcon } from './menuIcons'
import { useContextMenu, type ContextMenu } from './useContextMenu'

const EDGE_GAP = 8

/**
 * Only the open flag is read here. The menu's own state — the document, the selection, the
 * locks — is subscribed one level down, so a closed menu does not re-render on every edit.
 */
export function CanvasContextMenu() {
  const open = useSelector(contextMenu, (state) => state.open)
  if (!open) return null
  return <ContextMenuContent />
}

function ContextMenuContent() {
  const menu = useContextMenu()
  if (!menu.open) return null
  return <ContextMenuSurface menu={menu} />
}

function ContextMenuSurface({ menu }: { menu: ContextMenu }) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const element = menuRef.current
    if (!element) return
    const { offsetWidth: width, offsetHeight: height } = element
    const left = Math.min(menu.x, Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP))
    const top = Math.min(menu.y, Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP))
    element.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`
    element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [menu.x, menu.y])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) menu.close()
    }
    const onBlur = () => menu.close()

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onBlur)
    window.addEventListener('scroll', onBlur, { capture: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onBlur)
      window.removeEventListener('scroll', onBlur, { capture: true })
    }
  }, [menu])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      menu.close()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    const next = (current + step + items.length) % items.length
    items[next].focus()
  }

  return (
    <div
      ref={menuRef}
      className={MENU_CLASS}
      role="menu"
      aria-label="Element actions"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {menu.actions.map((action) => (
        <div key={action.id} className="contents">
          {action.separatorBefore ? <span className={SEPARATOR_CLASS} aria-hidden="true" /> : null}
          <button
            type="button"
            role="menuitem"
            className={ITEM_CLASS}
            disabled={action.disabled}
            onClick={() => menu.run(action.id)}
          >
            <MenuIcon name={action.icon} />
            {action.label}
          </button>
        </div>
      ))}
    </div>
  )
}
