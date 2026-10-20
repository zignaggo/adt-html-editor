import type { NodeId } from '../../core/ids'
import { isLockedDeep, type LockMap } from '../../core/lock'
import {
  INLINE_TAGS,
  ancestorIdsOf,
  collectSubtree,
  isDescendantOf,
  isRoot,
  type AnyNode,
  type EditorDocument,
} from '../../core/model'

export const EDITABLE_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'div',
  'section',
  'article',
  'aside',
  'blockquote',
  'header',
  'footer',
  'nav',
] as const

export type EditableTag = (typeof EDITABLE_TAGS)[number]

export type RetagBlock = 'unsupported' | 'locked' | 'editing'

export type RetagContext = {
  locked?: LockMap
  editingTextId?: NodeId | null
}

export type RetagInspection = {
  tag: string | null
  can: Record<EditableTag, true | RetagBlock>
}

const EDITABLE: ReadonlySet<string> = new Set(EDITABLE_TAGS)

const HEADING_TAGS: ReadonlySet<string> = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const PHRASE_TAGS: ReadonlySet<string> = new Set([
  'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
])

const INLINE_EDITABLE_TAGS: ReadonlySet<string> = new Set(['span'])

const HGROUP_EDITABLE_TAGS: ReadonlySet<string> = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
])

const SECTIONING_TAGS: ReadonlySet<string> = new Set(['article', 'aside', 'nav', 'section'])

const HEADER_FOOTER_TAGS: ReadonlySet<string> = new Set(['header', 'footer'])

const MAIN_FORBIDDING_TAGS: ReadonlySet<string> = new Set([
  'article', 'aside', 'nav', 'header', 'footer',
])

const PHRASING_CONTENT_TAGS: ReadonlySet<string> = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label', 'legend', 'option',
  'summary', 'textarea', 'title', 'pre',
])

const RESTRICTED_PARENT_TAGS: ReadonlySet<string> = new Set([
  'ul', 'ol', 'menu', 'dl', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup',
  'select', 'optgroup', 'datalist', 'picture', 'svg', 'math', 'audio', 'video',
  'ruby', 'head', 'html', 'frameset',
])

const FLOW_WITHOUT_SECTIONS_TAGS: ReadonlySet<string> = new Set(['address', 'dt'])

const METADATA_TAGS: ReadonlySet<string> = new Set(['script', 'style', 'template', 'noscript'])

type RetagFacts = {
  restrictedParent: boolean
  phrasingContext: boolean
  hgroupParent: boolean
  blockChild: boolean
  sectionlessAncestor: boolean
  headerFooterNear: boolean
  mainDescendant: boolean
}

function tagOf(node: AnyNode | undefined): string | null {
  if (!node || node.kind === 'text' || node.kind === 'comment') return null
  return node.tag
}

function currentTagOf(node: AnyNode | undefined): string | null {
  if (!node || isRoot(node)) return null
  return tagOf(node)
}

function factsOf(doc: EditorDocument, id: NodeId): RetagFacts {
  const node = doc.nodes[id]
  const parentId = node?.parentId ?? null
  const parentTag = parentId === null ? null : tagOf(doc.nodes[parentId])

  let phrasingContext = false
  let sectionlessAncestor = false
  let headerFooterNear = false
  for (const ancestorId of ancestorIdsOf(doc, id)) {
    const tag = tagOf(doc.nodes[ancestorId])
    if (tag === null) continue
    if (INLINE_TAGS.has(tag) || PHRASING_CONTENT_TAGS.has(tag)) phrasingContext = true
    if (FLOW_WITHOUT_SECTIONS_TAGS.has(tag)) sectionlessAncestor = true
    if (HEADER_FOOTER_TAGS.has(tag)) headerFooterNear = true
  }

  let mainDescendant = false
  for (const descendantId of collectSubtree(doc, id)) {
    if (descendantId === id) continue
    const tag = tagOf(doc.nodes[descendantId])
    if (tag === null) continue
    if (tag === 'main') mainDescendant = true
    if (HEADER_FOOTER_TAGS.has(tag)) headerFooterNear = true
  }

  let blockChild = false
  if (node?.kind === 'element') {
    for (const childId of node.children) {
      const tag = tagOf(doc.nodes[childId])
      if (tag === null) continue
      if (!INLINE_TAGS.has(tag) && !METADATA_TAGS.has(tag)) {
        blockChild = true
        break
      }
    }
  }

  return {
    restrictedParent: parentTag !== null && RESTRICTED_PARENT_TAGS.has(parentTag),
    phrasingContext,
    hgroupParent: parentTag === 'hgroup',
    blockChild,
    sectionlessAncestor,
    headerFooterNear,
    mainDescendant,
  }
}

function allowanceOf(tag: EditableTag, facts: RetagFacts): true | 'unsupported' {
  if (facts.restrictedParent) return 'unsupported'
  if (facts.phrasingContext && !INLINE_EDITABLE_TAGS.has(tag)) return 'unsupported'
  if (facts.hgroupParent && !HGROUP_EDITABLE_TAGS.has(tag)) return 'unsupported'
  if (facts.blockChild && PHRASE_TAGS.has(tag)) return 'unsupported'
  if (
    facts.sectionlessAncestor &&
    (HEADING_TAGS.has(tag) || SECTIONING_TAGS.has(tag) || HEADER_FOOTER_TAGS.has(tag))
  ) {
    return 'unsupported'
  }
  if (facts.headerFooterNear && HEADER_FOOTER_TAGS.has(tag)) return 'unsupported'
  if (facts.mainDescendant && MAIN_FORBIDDING_TAGS.has(tag)) return 'unsupported'
  return true
}

function blanketOf(reason: RetagBlock): Record<EditableTag, true | RetagBlock> {
  const can = {} as Record<EditableTag, true | RetagBlock>
  for (const tag of EDITABLE_TAGS) can[tag] = reason
  return can
}

export function isEditableTag(tag: string): tag is EditableTag {
  return EDITABLE.has(tag)
}

export function inspectRetag(
  doc: EditorDocument,
  id: NodeId,
  context: RetagContext = {},
): RetagInspection {
  const node = doc.nodes[id]
  const tag = currentTagOf(node)

  if (!node || node.kind !== 'element' || isRoot(node)) {
    return { tag, can: blanketOf('unsupported') }
  }
  if (context.locked && isLockedDeep(doc, context.locked, id)) {
    return { tag, can: blanketOf('locked') }
  }
  const editing = context.editingTextId ?? null
  if (editing !== null && isDescendantOf(doc, editing, id)) {
    return { tag, can: blanketOf('editing') }
  }

  const facts = factsOf(doc, id)
  const can = {} as Record<EditableTag, true | RetagBlock>
  for (const candidate of EDITABLE_TAGS) can[candidate] = allowanceOf(candidate, facts)
  return { tag, can }
}

export function hasRetagOptions(inspection: RetagInspection): boolean {
  for (const tag of EDITABLE_TAGS) {
    if (tag !== inspection.tag && inspection.can[tag] === true) return true
  }
  return false
}

export function allowsTag(inspection: RetagInspection, tag: string): boolean {
  return isEditableTag(tag) && inspection.can[tag] === true
}

export function retagReasonOf(inspection: RetagInspection, tag: string): RetagBlock | null {
  if (!isEditableTag(tag)) return 'unsupported'
  const entry = inspection.can[tag]
  return entry === true ? null : entry
}
