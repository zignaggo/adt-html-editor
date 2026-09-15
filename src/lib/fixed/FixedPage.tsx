import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { useCanvasContext } from '../components/Canvas/context'
import { useCanvasInteractions } from '../components/Canvas/useCanvasInteractions'
import { CanvasNode } from '../components/Canvas/CanvasNode'
import { SelectionOverlay } from '../components/Canvas/SelectionOverlay'
import { useChildren, useEditorContext, useFixedLayout, useRootId } from '../components/Editor/context'
import { useDocumentStylesheet } from './stylesheet/useDocumentStylesheet'
import { useFixedDropMonitor } from './useFixedDropMonitor'
import { useFixedNudge } from './useFixedNudge'
import { useTransformKeys } from './transform/useTransformKeys'
import { useFixedPageDropTarget } from './useFixedPageDropTarget'
import { ghostLayerClass } from './ghost/ghostStyles'
import { cn } from 'cn'
import { CANVAS_CLASS, CANVAS_FIXED_CLASS } from '../styles/canvasStyles'

const FIT_PADDING = 48
const MIN_FIT = 0.05

export type FixedPageProps = {
  className?: string
  children?: ReactNode
}

export function FixedPage({ className, children }: FixedPageProps) {
  const { canvasRootRef } = useEditorContext()
  const { page } = useFixedLayout()
  const { isDark, stylesReady, zoom, registerGhostLayer } = useCanvasContext()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [fitScale, setFitScale] = useState(1)
  const rootId = useRootId()
  const nodeIds = useChildren(rootId)
  const interactions = useCanvasInteractions()
  const nudge = useFixedNudge()
  const transformKeys = useTransformKeys()

  useDocumentStylesheet()
  useFixedPageDropTarget(scrollRef)
  useFixedDropMonitor()

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth - FIT_PADDING
      const height = element.clientHeight - FIT_PADDING
      const next = Math.max(MIN_FIT, Math.min(width / page.width, height / page.height))
      setFitScale((current) => (Math.abs(current - next) < 0.001 ? current : next))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [page.width, page.height])

  const scale = zoom === 'fit' ? fitScale : zoom

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!nudge(event) && !transformKeys(event)) interactions.onKeyDown(event)
  }

  return (
    <div
      ref={scrollRef}
      data-adt-canvas-scroll=""
      className={cn('flex min-h-0 flex-1 items-start overflow-auto p-4', className)}
    >
      <div
        className="relative mx-auto flex-none"
        style={{ width: `${page.width * scale}px`, height: `${page.height * scale}px` }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left bg-white shadow-lg"
          style={{
            width: `${page.width}px`,
            height: `${page.height}px`,
            transform: `scale(${scale})`,
          }}
        >
          <div
            ref={canvasRootRef as RefObject<HTMLDivElement>}
            role="group"
            aria-label="Editable page"
            tabIndex={0}
            className={cn(
              CANVAS_CLASS,
              CANVAS_FIXED_CLASS,
              'relative h-full w-full overflow-visible',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              isDark && 'adt-dark',
            )}
            data-adt-canvas=""
            data-adt-layout="fixed"
            data-adt-styles={stylesReady ? 'ready' : 'pending'}
            aria-busy={!stylesReady || undefined}
            onPointerMove={interactions.onPointerMove}
            onPointerLeave={interactions.onPointerLeave}
            onMouseDown={interactions.onMouseDown}
            onClick={interactions.onClick}
            onDoubleClick={interactions.onDoubleClick}
            onKeyDown={onKeyDown}
          >
            {nodeIds.map((childId) => (
              <CanvasNode key={childId} id={childId} />
            ))}
            <div
              ref={(element) => registerGhostLayer(element)}
              className={ghostLayerClass}
              aria-hidden="true"
            />
            {children}
          </div>
        </div>
      </div>
      <SelectionOverlay />
    </div>
  )
}
