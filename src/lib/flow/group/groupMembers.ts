import { hasLooseText, type StyleReader } from '../capabilities'
import { isFlowContainer, layoutChildren } from '../component/componentLayout'
import { isLayoutWrapper } from '../layout/textFlow'

export type GroupBlock =
  | 'single-selection'
  | 'nested-selection'
  | 'mixed-parents'
  | 'not-contiguous'
  | 'not-a-container'
  | 'locked'

export type GroupInspection = {
  members: HTMLElement[]
  parent: HTMLElement | null
  can: true | GroupBlock
}

export type GroupOptions = {
  read?: StyleReader
  isLocked?: (element: HTMLElement) => boolean
}

export const PROMOTION_LIMIT = 12

const defaultReader: StyleReader = (element) => getComputedStyle(element)

function onlyChildOf(parent: HTMLElement, read: StyleReader): HTMLElement | null {
  if (hasLooseText(parent)) return null
  const children = layoutChildren(parent, read)
  return children.length === 1 ? children[0] : null
}

function isDecorativeWrapper(parent: HTMLElement, child: HTMLElement, read: StyleReader): boolean {
  if (!isLayoutWrapper(parent, read)) return false
  return onlyChildOf(parent, read) === child
}

export function promotionChain(element: HTMLElement, read: StyleReader = defaultReader): HTMLElement[] {
  const chain: HTMLElement[] = [element]
  let current = element
  for (let step = 0; step < PROMOTION_LIMIT; step += 1) {
    const parent = current.parentElement
    if (!parent || !isDecorativeWrapper(parent, current, read)) break
    chain.push(parent)
    current = parent
  }
  return chain
}

function promote(
  elements: readonly HTMLElement[],
  read: StyleReader,
): { members: HTMLElement[]; parent: HTMLElement } | null {
  const chains = elements.map((element) => promotionChain(element, read))

  for (const step of chains[0]) {
    const parent = step.parentElement
    if (!parent) continue
    const members: HTMLElement[] = []
    for (const chain of chains) {
      const match = chain.find((candidate) => candidate.parentElement === parent)
      if (!match) break
      members.push(match)
    }
    if (members.length === chains.length) return { members, parent }
  }

  return null
}

function isNested(elements: readonly HTMLElement[]): boolean {
  return elements.some((element) =>
    elements.some((other) => other !== element && other.contains(element)),
  )
}

function areContiguous(
  members: readonly HTMLElement[],
  children: readonly HTMLElement[],
): boolean {
  let first = Number.POSITIVE_INFINITY
  let last = Number.NEGATIVE_INFINITY

  for (const member of members) {
    const index = children.indexOf(member)
    if (index < 0) return false
    first = Math.min(first, index)
    last = Math.max(last, index)
  }

  return last - first + 1 === members.length
}

export function inspectGroup(
  elements: readonly HTMLElement[],
  options: GroupOptions = {},
): GroupInspection {
  const read = options.read ?? defaultReader
  const isLocked = options.isLocked ?? (() => false)
  const unique = [...new Set(elements)]

  if (unique.length < 2) return { members: unique, parent: null, can: 'single-selection' }
  if (isNested(unique)) return { members: unique, parent: null, can: 'nested-selection' }

  const promoted = promote(unique, read)
  if (!promoted) return { members: unique, parent: null, can: 'mixed-parents' }

  const { parent } = promoted
  const children = layoutChildren(parent, read)
  const members = [...new Set(promoted.members)].sort(
    (a, b) => children.indexOf(a) - children.indexOf(b),
  )

  if (members.length < promoted.members.length) {
    return { members, parent, can: 'nested-selection' }
  }
  if (members.some((member) => isLocked(member))) return { members, parent, can: 'locked' }
  if (!isFlowContainer(parent, read)) return { members, parent, can: 'not-a-container' }
  if (!areContiguous(members, children)) return { members, parent, can: 'not-contiguous' }

  return { members, parent, can: true }
}
