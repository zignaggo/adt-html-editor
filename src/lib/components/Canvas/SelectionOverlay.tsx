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

  useEffect(() => {
    const root = canvasRootRef.current
    if (!root) return

    let selectedId = store.state.selectedId
    let hoveredId: NodeId | null = null
    let frame = 0

    const place = (box: HTMLDivElement | null, id: NodeId | null, withLabel: boolean) => {
      if (!box) return
      const target = id ? root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`) : null
      if (!target) {
        box.dataset.visible = 'false'
        return
      }
      const rect = target.getBoundingClientRect()
      box.dataset.visible = 'true'
      box.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
      box.style.width = `${rect.width}px`
      box.style.height = `${rect.height}px`
      if (withLabel && labelRef.current && id) {
        const node = store.state.doc.nodes[id]
        labelRef.current.textContent = node ? labelOf(node) : ''
        labelRef.current.dataset.flip = rect.top < 24 ? 'below' : 'above'
      }
    }

    const sync = () => {
      frame = 0
      const delegated = root.hasAttribute('data-adt-handles')
      place(selectionRef.current, delegated ? null : selectedId, true)
      place(hoverRef.current, hoveredId === selectedId ? null : hoveredId, false)
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(sync)
    }

    const storeSubscription = store.subscribe((state) => {
      if (state.selectedId === selectedId) return
      selectedId = state.selectedId
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
    }
  }, [canvasRootRef, store])

  return (
    <>
      <div ref={hoverRef} className={styles.hover} data-visible="false" aria-hidden="true" />
      <div ref={selectionRef} className={styles.selection} data-visible="false" aria-hidden="true">
        <span ref={labelRef} className={styles.label} />
      </div>
    </>
  )
}
