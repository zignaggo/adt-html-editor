import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { useSelector } from '@tanstack/react-store'
import type { NodeId } from '../../core/ids'
import type { EditorDocument } from '../../core/model'
import { serializeHtml } from '../../core/html/serialize'
import { createEditorStore, type EditorState } from '../../core/store'
import { detectLayout, pageSizeOf, type PageSize } from '../../fixed/detect'
import { pageContainerOf } from '../../fixed/pageContainer'
import {
  EditorContext,
  type EditorContextValue,
  type FixedLayoutConfig,
  type LayoutMode,
  type StyleMode,
} from './context'
import { useEditorDropMonitor } from '../../dnd/useEditorDropMonitor'

export type FixedLayoutOptions = {
  page?: PageSize
  pageContainer?: (doc: EditorDocument) => NodeId
  precision?: number
  snapThreshold?: number
  keepStacking?: boolean
  resolveAsset?: (url: string) => string
}

const DEFAULT_PAGE: PageSize = { width: 1200, height: 1600 }
const DEFAULT_PRECISION = 1
const DEFAULT_SNAP_THRESHOLD = 4

type ResolvedLayout = {
  layout: LayoutMode
  pageWidth: number
  pageHeight: number
  pageContainerId: NodeId
}

function sameLayout(a: ResolvedLayout, b: ResolvedLayout): boolean {
  return (
    a.layout === b.layout &&
    a.pageWidth === b.pageWidth &&
    a.pageHeight === b.pageHeight &&
    a.pageContainerId === b.pageContainerId
  )
}

function createScheduler(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    run(task: () => void) {
      if (delayMs <= 0) {
        task()
        return
      }
      clearTimeout(timer)
      timer = setTimeout(task, delayMs)
    },
    cancel() {
      clearTimeout(timer)
    },
  }
}

export type HtmlEditorHandle = {
  getHtml: () => string
  setHtml: (html: string) => void
  getDocument: () => EditorDocument
  undo: () => void
  redo: () => void
}

export type EditorProviderProps = {
  defaultValue?: string
  value?: string
  onChange?: (html: string, doc: EditorDocument) => void
  changeDebounceMs?: number
  styleMode?: StyleMode
  layout?: LayoutMode | 'auto'
  fixedLayout?: FixedLayoutOptions
  handleRef?: Ref<HtmlEditorHandle>
  children: ReactNode
}

const NO_FIXED_OPTIONS: FixedLayoutOptions = {}

export function EditorProvider({
  defaultValue = '',
  value,
  onChange,
  changeDebounceMs = 0,
  styleMode = 'tailwind',
  layout = 'auto',
  fixedLayout = NO_FIXED_OPTIONS,
  handleRef,
  children,
}: EditorProviderProps) {
  const [store] = useState(() => createEditorStore(value ?? defaultValue))
  const canvasRootRef = useRef<HTMLElement | null>(null)
  const lastEmittedRef = useRef<string | null>(null)
  const onChangeRef = useRef(onChange)

  const { pageContainer, page: pageOverride } = fixedLayout
  const resolved = useSelector(
    store,
    (state: EditorState): ResolvedLayout => {
      const { doc } = state
      const page = pageOverride ?? pageSizeOf(doc) ?? DEFAULT_PAGE
      return {
        layout: layout === 'auto' ? detectLayout(doc) : layout,
        pageWidth: page.width,
        pageHeight: page.height,
        pageContainerId: pageContainer ? pageContainer(doc) : pageContainerOf(doc),
      }
    },
    { compare: sameLayout },
  )

  const fixedConfig: FixedLayoutConfig = {
    page: { width: resolved.pageWidth, height: resolved.pageHeight },
    pageContainerId: resolved.pageContainerId,
    precision: fixedLayout.precision ?? DEFAULT_PRECISION,
    snapThreshold: fixedLayout.snapThreshold ?? DEFAULT_SNAP_THRESHOLD,
    keepStacking: fixedLayout.keepStacking ?? false,
    resolveAsset: fixedLayout.resolveAsset,
  }

  const context: EditorContextValue = {
    store,
    styleMode,
    layout: resolved.layout,
    fixedLayout: fixedConfig,
    canvasRootRef,
  }

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (lastEmittedRef.current === null) {
      lastEmittedRef.current = serializeHtml(store.state.doc)
    }
  }, [store])

  useEffect(() => {
    const schedule = createScheduler(changeDebounceMs)

    const emit = (doc: EditorDocument) => {
      const html = serializeHtml(doc)
      lastEmittedRef.current = html
      onChangeRef.current?.(html, doc)
    }

    let previousDoc = store.state.doc
    const subscription = store.subscribe((state) => {
      if (state.doc === previousDoc) return
      previousDoc = state.doc
      const { doc } = state
      schedule.run(() => emit(doc))
    })

    return () => {
      schedule.cancel()
      subscription.unsubscribe()
    }
  }, [store, changeDebounceMs])

  useEffect(() => {
    if (value === undefined) return
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    store.actions.replaceDocument(value)
  }, [store, value])

  useImperativeHandle(
    handleRef,
    (): HtmlEditorHandle => ({
      getHtml: () => serializeHtml(store.state.doc),
      setHtml: (html) => store.actions.replaceDocument(html),
      getDocument: () => store.state.doc,
      undo: () => store.actions.undo(),
      redo: () => store.actions.redo(),
    }),
    [store],
  )

  return (
    <EditorContext.Provider value={context}>
      <EditorDropMonitor />
      {children}
    </EditorContext.Provider>
  )
}

function EditorDropMonitor() {
  useEditorDropMonitor()
  return null
}
