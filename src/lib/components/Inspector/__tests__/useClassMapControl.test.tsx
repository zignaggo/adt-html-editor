import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { EditorStore } from '../../../core/store'
import type { ClassMap } from '../../../tailwind/classMaps'
import { fontWeightClassMap, opacityClassMap, paddingClassMap } from '../../../tailwind/classMaps'
import { BASE_TARGET, type StyleTarget } from '../../../tailwind/variants'
import { EditorProvider } from '../../Editor/EditorProvider'
import { useEditorStoreApi } from '../../Editor/context'
import { useClassMapControl } from '../controls/useClassMapControl'
import { useOptionalFields } from '../controls/useOptionalFields'

const ZERO = { t: 0, r: 0, b: 0, l: 0 }
const TABLET: StyleTarget = { breakpoint: 'tablet', state: null }
const MOBILE: StyleTarget = { breakpoint: 'mobile', state: null }
const HOVER: StyleTarget = { breakpoint: 'desktop', state: 'hover' }

function h1Of(store: EditorStore) {
  const node = Object.values(store.state.doc.nodes).find((entry) => entry.kind === 'element' && entry.tag === 'h1')
  if (!node) throw new Error('no <h1>')
  return node.id
}

function renderControl<TValue>(
  html: string,
  classMap: ClassMap<TValue>,
  fallback: TValue,
  target: () => StyleTarget,
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <EditorProvider defaultValue={html}>{children}</EditorProvider>
  )
  const rendered = renderHook(
    () => {
      const store = useEditorStoreApi()
      const id = h1Of(store)
      return { store, control: useClassMapControl(id, classMap, fallback, target()) }
    },
    { wrapper },
  )
  const classesOf = () => {
    const { store } = rendered.result.current
    const node = store.state.doc.nodes[h1Of(store)]
    return node.kind === 'element' ? node.classes : []
  }
  return { ...rendered, classesOf, control: () => rendered.result.current.control }
}

describe('useClassMapControl', () => {
  it('reads and writes base classes', () => {
    const { control, classesOf } = renderControl(
      '<h1 class="p-4 text-lg">Title</h1>',
      paddingClassMap,
      ZERO,
      () => BASE_TARGET,
    )
    expect(control().value).toEqual({ t: 16, r: 16, b: 16, l: 16 })
    expect(control().isExplicit).toBe(true)
    act(() => control().setValue({ t: 8, r: 16, b: 8, l: 16 }))
    expect(classesOf()).toEqual(['text-lg', 'px-4', 'py-2'])
  })

  it('removes classes when the value equals the fallback', () => {
    const { control, classesOf } = renderControl('<h1 class="p-4">Title</h1>', paddingClassMap, ZERO, () => BASE_TARGET)
    act(() => control().setValue(ZERO))
    expect(classesOf()).toEqual([])
    expect(control().isExplicit).toBe(false)
    expect(control().value).toEqual(ZERO)
  })

  it('cascades desktop-first breakpoints and reports overrides', () => {
    let target: StyleTarget = MOBILE
    const { control, classesOf, rerender } = renderControl(
      '<h1 class="font-bold max-lg:font-medium">Title</h1>',
      fontWeightClassMap,
      'normal',
      () => target,
    )
    expect(control().value).toBe('medium')
    expect(control().override).toBeNull()

    act(() => control().setValue('medium'))
    expect(classesOf()).toEqual(['font-bold', 'max-lg:font-medium'])

    act(() => control().setValue('light'))
    expect(classesOf()).toEqual(['font-bold', 'max-lg:font-medium', 'max-sm:font-light'])
    expect(control().override).toMatchObject({
      target: MOBILE,
      classes: ['max-sm:font-light'],
      fallbackTarget: TABLET,
      fallbackClasses: ['max-lg:font-medium'],
    })

    act(() => control().reset())
    expect(classesOf()).toEqual(['font-bold', 'max-lg:font-medium'])

    target = HOVER
    rerender()
    expect(control().value).toBe('bold')
    act(() => control().setValue('black'))
    expect(classesOf()).toEqual(['font-bold', 'max-lg:font-medium', 'hover:font-black'])

    target = { breakpoint: 'tablet', state: 'hover' }
    rerender()
    expect(control().value).toBe('black')
    expect(control().override).toBeNull()
  })

  it('drops classes for values that map to nothing', () => {
    const { control, classesOf } = renderControl('<h1 class="opacity-50">Title</h1>', opacityClassMap, 100, () => BASE_TARGET)
    expect(control().value).toBe(50)
    act(() => control().setValue(100))
    expect(classesOf()).toEqual([])
  })
})

describe('useOptionalFields', () => {
  const FIELDS = [
    { key: 'minWidth', classMatch: /(?:^|:)min-w-/ },
    { key: 'maxWidth', classMatch: /(?:^|:)max-w-/ },
  ] as const

  it('detects fields from classes and keeps manual choices per element', () => {
    let classes = ['min-w-4']
    let resetKey = 'a'
    const { result, rerender } = renderHook(() => useOptionalFields(FIELDS, classes, resetKey))
    expect(result.current.has('minWidth')).toBe(true)
    expect(result.current.has('maxWidth')).toBe(false)
    expect(result.current.available).toEqual(['maxWidth'])

    act(() => result.current.enable('maxWidth'))
    expect(result.current.has('maxWidth')).toBe(true)
    expect(result.current.available).toEqual([])

    classes = []
    rerender()
    expect(result.current.has('minWidth')).toBe(false)
    expect(result.current.has('maxWidth')).toBe(true)

    resetKey = 'b'
    rerender()
    expect(result.current.has('maxWidth')).toBe(false)
  })
})
