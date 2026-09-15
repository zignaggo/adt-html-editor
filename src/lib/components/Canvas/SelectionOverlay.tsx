import { useEffect, useRef } from 'react'
import type { NodeId } from '../../core/ids'
import { subscribeHovered } from '../../core/hover'
import { labelOf } from '../../core/model'
import { useEditorContext, useEditorStoreApi } from '../Editor/context'
import styles from './SelectionOverlay.module.css'

export function SelectionOverlay() {
  const { canvasRootRef } = useEditorContext()
  const store = useEditorStoreApi()
  const selectionRef = useRef<HTMLDivElement | null>(null)
  const hoverRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLSpanElement | null>(null)
  const poolRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = canvasRootRef.current
    const poolRoot = poolRef.current
    if (!root || !poolRoot) return

    let selectedIds = store.state.selectedIds
    let hoveredId: NodeId | null = null
    let frame = 0
    const pool = new Map<NodeId, HTMLDivElement>()

    const placeRect = (box: HTMLDivElement, rect: DOMRect) => {
      box.dataset.visible = 'true'
      box.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
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
        labelRef.current.dataset.flip = rect.top < 24 ? 'below' : 'above'
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
          box.className = styles.outline
          box.dataset.visible = 'false'
          box.setAttribute('data-adt-selection-outline', '')
          poolRoot.appendChild(box)
          pool.set(id, box)
        }
        placeRect(box, target.getBoundingClientRect())
      }
    }

    const sync = () => {
      frame = 0
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

    const scrollParent = root.closest('[data-adt-canvas-scroll]') ?? root
    scrollParent.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    const mutation = new MutationObserver(schedule)
    mutation.observe(root, { childList: true, subtree: true, attributes: true })

    schedule()

    return () => {
      cancelAnimationFrame(frame)
      storeSubscription.unsubscribe()
      unsubscribeHover()
      observer.disconnect()
      mutation.disconnect()
      scrollParent.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      for (const box of pool.values()) box.remove()
      pool.clear()
    }
  }, [canvasRootRef, store])

  return (
    <>
      <div ref={hoverRef} className={styles.hover} data-visible="false" aria-hidden="true" />
      <div ref={selectionRef} className={styles.selection} data-visible="false" aria-hidden="true">
        <span ref={labelRef} className={styles.label} />
      </div>
      <div ref={poolRef} aria-hidden="true" />
    </>
  )
}

const EMPTY_IDS: readonly NodeId[] = []
