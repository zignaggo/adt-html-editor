import { describe, expect, it } from 'vitest'
import { applyClassEdit, removeClassFamily } from '../classEdit'
import { BASE_TARGET, type StyleTarget } from '../../tailwind/variants'

const MOBILE: StyleTarget = { breakpoint: 'mobile', state: null }

describe('applyClassEdit', () => {
  it('replaces a family at the base target', () => {
    const next = applyClassEdit(['w-1/2', 'p-4'], { remove: /^w-/, add: ['w-full'] }, BASE_TARGET)
    expect(next).toEqual(['p-4', 'w-full'])
  })

  it('leaves other breakpoints alone', () => {
    const next = applyClassEdit(
      ['w-1/2', 'max-sm:w-full', 'max-lg:w-2/3'],
      { remove: /^w-/, add: ['w-1/3'] },
      BASE_TARGET,
    )
    expect(next).toEqual(['max-sm:w-full', 'max-lg:w-2/3', 'w-1/3'])
  })

  it('writes the prefixed class when the target is a breakpoint', () => {
    const next = applyClassEdit(['w-1/2', 'max-sm:w-full'], { remove: /^w-/, add: ['w-1/3'] }, MOBILE)
    expect(next).toEqual(['w-1/2', 'max-sm:w-1/3'])
  })

  it('deduplicates without reordering what stays', () => {
    const next = applyClassEdit(['p-4', 'p-4', 'm-2'], { add: ['m-2'] }, BASE_TARGET)
    expect(next).toEqual(['p-4', 'm-2'])
  })

  it('treats an unknown variant as a base class', () => {
    const next = applyClassEdit(['group-hover:w-full', 'w-1/2'], { remove: /^w-/ }, BASE_TARGET)
    expect(next).toEqual([])
  })

  it('removes a family without adding anything', () => {
    expect(removeClassFamily(['mb-4', 'mt-2'], /^-?mb-/, BASE_TARGET)).toEqual(['mt-2'])
  })
})
