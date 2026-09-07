import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import type { EditorDocument } from '../../core/model'
import { serializeHtml } from '../../core/html/serialize'
import { createEditorStore } from '../../core/store'
import { EditorContext, type EditorContextValue, type StyleMode } from './context'
import { useEditorDropMonitor } from '../../dnd/useEditorDropMonitor'

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
  handleRef?: Ref<HtmlEditorHandle>
  children: ReactNode
}

export function EditorProvider({
  defaultValue = '',
  value,
  onChange,
  changeDebounceMs = 0,
  styleMode = 'tailwind',
  handleRef,
  children,
}: EditorProviderProps) {
  const [store] = useState(() => createEditorStore(value ?? defaultValue))
  const canvasRootRef = useRef<HTMLElement | null>(null)
  const lastEmittedRef = useRef<string | null>(null)
  const onChangeRef = useRef(onChange)

  const context: EditorContextValue = { store, styleMode, canvasRootRef }

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (lastEmittedRef.current === null) {
      lastEmittedRef.current = serializeHtml(store.getState().doc)
    }
  }, [store])

  useEffect(() => {
    const schedule = createScheduler(changeDebounceMs)

    const emit = (doc: EditorDocument) => {
      const html = serializeHtml(doc)
      lastEmittedRef.current = html
      onChangeRef.current?.(html, doc)
    }

    const unsubscribe = store.subscribe((state, previous) => {
      if (state.doc === previous.doc) return
      const { doc } = state
      schedule.run(() => emit(doc))
    })

    return () => {
      schedule.cancel()
      unsubscribe()
    }
  }, [store, changeDebounceMs])

  useEffect(() => {
    if (value === undefined) return
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    store.getState().replaceDocument(value)
  }, [store, value])

  useImperativeHandle(
    handleRef,
    (): HtmlEditorHandle => ({
      getHtml: () => serializeHtml(store.getState().doc),
      setHtml: (html) => store.getState().replaceDocument(html),
      getDocument: () => store.getState().doc,
      undo: () => store.getState().undo(),
      redo: () => store.getState().redo(),
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
