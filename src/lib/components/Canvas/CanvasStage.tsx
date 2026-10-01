import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch'
import { cn } from 'cn'
import { useCanvasContext } from './context'
import { CanvasStageContext, EMPTY_STAGE_SIZE, STAGE_PADDING, useCanvasStage } from './stage'
import { useCanvasAutoPan } from './useCanvasAutoPan'
import { useCanvasPanGesture } from './useCanvasPanGesture'
import { notifyCanvasViewport } from './viewport'

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const SCALE_EPSILON = 0.001
const ZOOM_DURATION = 160

const isZoomKey = (keys: string[]) => keys.includes('Control') || keys.includes('Meta')

const WHEEL_ZOOM_PER_PIXEL = 0.0008

const WHEEL = { activationKeys: isZoomKey, step: WHEEL_ZOOM_PER_PIXEL }
const TRACK_PAD = { disabled: false, activationKeys: (keys: string[]) => !isZoomKey(keys) }
const PANNING = { excluded: ['adt-canvas'], velocityDisabled: true }
const DOUBLE_CLICK = { disabled: true }
const WRAPPER_STYLE = { width: '100%', height: '100%' }

const PAN_CURSOR_CLASS =
  'data-[adt-pan=active]:cursor-grab data-[adt-pan=active]:[&_*]:cursor-grab! ' +
  'data-[adt-pan=panning]:cursor-grabbing data-[adt-pan=panning]:[&_*]:cursor-grabbing! ' +
  'data-[adt-pan=panning]:select-none'

export type CanvasStageProps = {
  className?: string
  children?: ReactNode
  ref?: RefObject<HTMLDivElement | null>
}

export function CanvasStage({ className, children, ref }: CanvasStageProps) {
  const { width, zoom, setZoom } = useCanvasContext()
  const localRef = useRef<HTMLDivElement | null>(null)
  const stageRef = ref ?? localRef
  const appliedRef = useRef<number | null>(null)
  const [size, setSize] = useState(EMPTY_STAGE_SIZE)

  useLayoutEffect(() => {
    const element = stageRef.current
    if (!element) return
    const measure = () => {
      setSize((current) =>
        current.width === element.clientWidth && current.height === element.clientHeight
          ? current
          : { width: element.clientWidth, height: element.clientHeight },
      )
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [stageRef])

  const target = zoom === 'fit' ? fitScale(size.width, width) : zoom

  const onUserZoom = (instance: ReactZoomPanPinchRef) => {
    const { scale } = instance.state
    if (appliedRef.current !== null && Math.abs(appliedRef.current - scale) < SCALE_EPSILON) return
    appliedRef.current = scale
    setZoom(scale)
  }

  return (
    <div
      ref={stageRef}
      data-adt-canvas-scroll=""
      className={cn('relative flex min-h-0 flex-1 overflow-hidden', PAN_CURSOR_CLASS, className)}
    >
      <TransformWrapper
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        centerZoomedOut
        wheel={WHEEL}
        trackPadPanning={TRACK_PAD}
        panning={PANNING}
        doubleClick={DOUBLE_CLICK}
        onWheelStop={onUserZoom}
        onPinchStop={onUserZoom}
      >
        <CanvasStageContext value={size}>
          <CanvasStageSync
            stageRef={stageRef}
            target={target}
            appliedRef={appliedRef}
            measured={size.width > 0}
          />
          {children}
        </CanvasStageContext>
      </TransformWrapper>
    </div>
  )
}

export function CanvasStageContent({ children }: { children?: ReactNode }) {
  const { width, height } = useCanvasStage()

  return (
    <TransformComponent
      wrapperStyle={WRAPPER_STYLE}
      contentStyle={{ width: width || undefined, minHeight: height || undefined }}
    >
      {children}
    </TransformComponent>
  )
}

function CanvasStageSync({
  stageRef,
  target,
  appliedRef,
  measured,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  target: number
  appliedRef: RefObject<number | null>
  measured: boolean
}) {
  const controls = useControls()
  const controlsRef = useRef(controls)

  useEffect(() => {
    controlsRef.current = controls
  })

  useTransformEffect(notifyCanvasViewport)
  useCanvasAutoPan(stageRef)
  useCanvasPanGesture(stageRef)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !measured || target <= 0) return
    if (appliedRef.current !== null && Math.abs(appliedRef.current - target) < SCALE_EPSILON) return

    const first = appliedRef.current === null
    appliedRef.current = target

    if (first) {
      controlsRef.current.setTransform(0, 0, target, 0)
      return
    }

    const rect = stage.getBoundingClientRect()
    controlsRef.current.zoomToPoint(
      target,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      ZOOM_DURATION,
    )
  }, [target, measured, stageRef, appliedRef])

  return null
}

function fitScale(stageWidth: number, pageWidth: number): number {
  if (!pageWidth || !stageWidth) return 1
  const available = stageWidth - STAGE_PADDING * 2
  return Math.min(1, Math.max(MIN_SCALE, available / pageWidth))
}
