import { useEffect, useRef } from 'react'
import type { NodeId } from '../../core/ids'
import { subscribeHovered } from '../../core/hover'
import { labelOf } from '../../core/model'
import { useEditorContext, useEditorStoreApi } from '../Editor/context'
import { subscribeCanvasViewport } from './viewport'

const clipClass = 'pointer-events-none fixed top-0 left-0 z-30 overflow-hidden'

const overlayClass =
  'pointer-events-none absolute top-0 left-0 rounded-sm will-change-transform ' +
  'transition-opacity duration-100 ease-out data-[visible=false]:opacity-0 data-[visible=true]:opacity-100'

const selectionClass = `${overlayClass} ring-[1.5px] ring-primary`
const outlineClass = `${overlayClass} ring-1 ring-primary`
const hoverClass = `${overlayClass} ring-1 ring-primary/55`

const labelClass =
  'absolute -top-[18px] -left-[1.5px] rounded-t-sm bg-primary px-1.5 py-px font-mono text-[10px] ' +
  'leading-4 whitespace-nowrap text-primary-foreground ' +
  'data-[flip=below]:top-full data-[flip=below]:rounded-t-none data-[flip=below]:rounded-b-sm'

export function SelectionOverlay() {
  const { canvasRootRef } = useEditorContext()
  const store = useEditorStoreApi()
  const selectionRef = useRef<HTMLDivElement | null>(null)
  const hoverRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLSpanElement | null>(null)
  const poolRef = useRef<HTMLDivElement | null>(null)
  const clipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = canvasRootRef.current
    const poolRoot = poolRef.current
    if (!root || !poolRoot) return

    let selectedIds = store.state.selectedIds
    let hoveredId: NodeId | null = null
    let frame = 0
    let origin = { x: 0, y: 0 }
    const pool = new Map<NodeId, HTMLDivElement>()

    const placeRect = (box: HTMLDivElement, rect: DOMRect) => {
      box.dataset.visible = 'true'
      box.style.transform = `translate3d(${rect.left - origin.x}px, ${rect.top - origin.y}px, 0)`
      box.style.width = `${rect.width}px`
      box.style.height = `${rect.height}px`
    }

    const place = (box: HTMLDivElement | null, id: NodeId | null, withLabel: boolean) => {
      if (!box) return
      const target = id ? root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`) : null
      if (!target) {
        box.dataset.visible = 'false'
        return
      }
      const rect = target.getBoundingClientRect()
      placeRect(box, rect)
      if (withLabel && labelRef.current && id) {
        const node = store.state.doc.nodes[id]
        labelRef.current.textContent = node ? labelOf(node) : ''
        labelRef.current.dataset.flip = rect.top - origin.y < 24 ? 'below' : 'above'
      }
    }

    const syncPool = (ids: readonly NodeId[]) => {
      const wanted = new Set(ids)
      for (const [id, box] of pool) {
        if (wanted.has(id)) continue
        box.remove()
        pool.delete(id)
      }
      for (const id of ids) {
        const target = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
        let box = pool.get(id)
        if (!target) {
          if (box) box.dataset.visible = 'false'
          continue
        }
        if (!box) {
          box = document.createElement('div')
          box.className = outlineClass
          box.dataset.visible = 'false'
          box.setAttribute('data-adt-selection-outline', '')
          poolRoot.appendChild(box)
          pool.set(id, box)
        }
        placeRect(box, target.getBoundingClientRect())
      }
    }

    const viewport = root.closest('[data-adt-canvas-scroll]') ?? root

    const placeClip = () => {
      const clip = clipRef.current
      if (!clip) return
      const rect = viewport.getBoundingClientRect()
      origin = { x: rect.left, y: rect.top }
      clip.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
      clip.style.width = `${rect.width}px`
      clip.style.height = `${rect.height}px`
    }

    const sync = () => {
      frame = 0
      placeClip()
      const delegated = root.hasAttribute('data-adt-handles')
      const many = selectedIds.length > 1
      place(selectionRef.current, delegated || many ? null : (selectedIds[0] ?? null), true)
      syncPool(many ? selectedIds : EMPTY_IDS)
      place(hoverRef.current, hoveredId && selectedIds.includes(hoveredId) ? null : hoveredId, false)
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(sync)
    }

    const storeSubscription = store.subscribe((state) => {
      if (state.selectedIds === selectedIds) return
      selectedIds = state.selectedIds
      schedule()
    })

    const unsubscribeHover = subscribeHovered((id) => {
      hoveredId = id
      schedule()
    })

    const observer = new ResizeObserver(schedule)
    observer.observe(root)

    const scrollParent = viewport
    scrollParent.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const unsubscribeViewport = subscribeCanvasViewport(schedule)

    const mutation = new MutationObserver(schedule)
    mutation.observe(root, { childList: true, subtree: true, attributes: true })

    schedule()

    return () => {
      cancelAnimationFrame(frame)
      storeSubscription.unsubscribe()
      unsubscribeHover()
      unsubscribeViewport()
      observer.disconnect()
      mutation.disconnect()
      scrollParent.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      for (const box of pool.values()) box.remove()
      pool.clear()
    }
  }, [canvasRootRef, store])

  return (
    <div ref={clipRef} className={clipClass} aria-hidden="true">
      <div ref={hoverRef} className={hoverClass} data-visible="false" />
      <div ref={selectionRef} className={selectionClass} data-visible="false">
        <span ref={labelRef} className={labelClass} />
      </div>
      <div ref={poolRef} />
    </div>
  )
}

const EMPTY_IDS: readonly NodeId[] = []
