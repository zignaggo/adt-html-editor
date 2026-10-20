import { describe, expect, it } from 'vitest'
import { BASE_TARGET } from '../../tailwind/variants'
import {
  COLUMNS_CLASSES,
  fitClasses,
  floatObjectClasses,
  flowRootClasses,
  textSpacingClasses,
} from '../component/componentCommit'

describe('fitClasses', () => {
  it('drops what the old parent sized and fills the new slot', () => {
    const next = fitClasses(['w-1/2', 'ml-auto', 'basis-1/3', 'float-left', 'text-lg'], BASE_TARGET)
    expect(next).toEqual(['text-lg', 'w-full', 'min-w-0', 'max-w-full'])
  })

  it('keeps the padding unless the child is an image wrapper', () => {
    expect(fitClasses(['p-6'], BASE_TARGET)).toContain('p-6')
    expect(fitClasses(['p-6'], BASE_TARGET, { stripPadding: true })).not.toContain('p-6')
  })

  it('leaves another breakpoint alone', () => {
    expect(fitClasses(['max-sm:w-1/2'], BASE_TARGET)).toContain('max-sm:w-1/2')
  })
})

describe('floatObjectClasses', () => {
  it('floats at the base and stacks on a small screen', () => {
    expect(floatObjectClasses([], 'left')).toEqual([
      'w-1/3',
      'max-w-full',
      'float-left',
      'mr-6',
      'max-sm:float-none',
      'max-sm:w-full',
      'max-sm:mr-0',
    ])
  })

  it('mirrors the margin on the right', () => {
    const next = floatObjectClasses([], 'right')
    expect(next).toContain('float-right')
    expect(next).toContain('ml-6')
    expect(next).toContain('max-sm:ml-0')
  })

  it('replaces a float that was already there', () => {
    const next = floatObjectClasses(['float-right', 'w-1/2'], 'left')
    expect(next).toContain('float-left')
    expect(next).not.toContain('float-right')
    expect(next).not.toContain('w-1/2')
  })
})

describe('flowRootClasses', () => {
  it('turns a flex container into a flow root', () => {
    const next = flowRootClasses(['flex', 'items-start', 'gap-6', 'bg-white'])
    expect(next).toEqual(['bg-white', 'flow-root', 'w-full', 'min-w-0'])
  })
})

describe('textSpacingClasses', () => {
  it('gives the text a bottom margin, replacing any it had', () => {
    expect(textSpacingClasses(['mb-2'])).toEqual(['mb-6'])
  })
})

describe('COLUMNS_CLASSES', () => {
  it('stacks the two columns on a small screen', () => {
    expect(COLUMNS_CLASSES).toContain('grid-cols-2')
    expect(COLUMNS_CLASSES).toContain('max-sm:grid-cols-1')
  })
})
