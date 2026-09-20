import { Store, batch } from '@tanstack/store'
import { createIdFactory, type NodeId } from './ids'
import {
  canCoalesce,
  emptyHistory,
  popFuture,
  popPast,
  pushSnapshot,
  type History,
  type Snapshot,
} from './history'
import { parseHtml } from './html/parse'
import { serializeHtml } from './html/serialize'
import {
  EMPTY_SELECTION,
  normalizeSelection,
  sameSelection,
  sortByDocumentOrder,
} from './selection'
import {
  ancestorIdsOf,
  canHaveChildren,
  childrenOf,
  classSetOf,
  collectSubtree,
  isDescendantOf,
  isStyled,
  withAttr,
  withClasses,
  type AnyNode,
  type EditorDocument,
  type ElementNode,
} from './model'

export type NodeTemplate = {
  tag: string
  attrs?: Record<string, string>
  classes?: string[]
  text?: string
  children?: NodeTemplate[]
}

export type DropPosition = { parentId: NodeId; index: number }

export type PlaceOptions = {
  style: string | null
  parentId?: NodeId
  index?: number
  coalesce?: boolean
}

export type PlaceUpdate = {
  id: NodeId
  style: string | null
  parentId?: NodeId
  index?: number
}

export type PlaceManyOptions = {
  coalesce?: boolean
}

export type SelectOptions = {
  mode?: 'replace' | 'toggle'
}

export type TransactionOptions = {
  coalesceKey?: string
}

export type EditorState = {
  doc: EditorDocument
  selectedId: NodeId | null
  selectedIds: readonly NodeId[]
  collapsed: Record<NodeId, true>
  locked: Record<NodeId, true>
  usedClasses: ReadonlySet<string>
  history: History
  editingTextId: NodeId | null
}

export type EditorActions = {
  replaceDocument: (html: string) => void
  insertNode: (template: NodeTemplate, at: DropPosition) => NodeId | null
  insertHtml: (html: string, at: DropPosition) => NodeId | null
  moveNode: (id: NodeId, at: DropPosition) => boolean
  removeNode: (id: NodeId) => void
  removeNodes: (ids: readonly NodeId[]) => void
  duplicateNode: (id: NodeId) => NodeId | null
  duplicateNodes: (ids: readonly NodeId[]) => NodeId[]
  setClasses: (id: NodeId, classes: string[]) => void
  setAttr: (id: NodeId, name: string, value: string | null) => void
  setText: (id: NodeId, value: string) => void
  placeNode: (id: NodeId, options: PlaceOptions) => boolean
  placeNodes: (updates: readonly PlaceUpdate[], options?: PlaceManyOptions) => boolean
  select: (id: NodeId | null, options?: SelectOptions) => void
  toggleSelected: (id: NodeId) => void
  selectMany: (ids: readonly NodeId[]) => void
  toggleCollapsed: (id: NodeId) => void
  setCollapsed: (id: NodeId, collapsed: boolean) => void
  setLocked: (id: NodeId, locked: boolean) => void
  setLockedMany: (ids: readonly NodeId[], locked: boolean) => void
  transaction: <T>(run: () => T, options?: TransactionOptions) => T
  beginTextEdit: (id: NodeId | null) => void
  undo: () => void
  redo: () => void
  getHtml: () => string
}

/**
 * Editor store: `store.state` is read-only, `store.actions` is the only way to mutate,
 * `store.subscribe(listener)` notifies on every change (returns `{ unsubscribe }`).
 */
export type EditorStore = Store<EditorState, EditorActions>

type Patch = Partial<EditorState>

function snapshotOf(state: EditorState): Snapshot {
  return { doc: state.doc, selectedIds: state.selectedIds }
}

function expandedToAll(state: EditorState, ids: readonly NodeId[]): Record<NodeId, true> {
  let next: Record<NodeId, true> | null = null
  for (const id of ids) {
    for (const ancestor of ancestorIdsOf(state.doc, id)) {
      if (!state.collapsed[ancestor]) continue
      next ??= { ...state.collapsed }
      delete next[ancestor]
    }
  }
  return next ?? state.collapsed
}

function withSelection(state: EditorState, ids: readonly NodeId[]): Patch | EditorState {
  if (sameSelection(state.selectedIds, ids) && state.editingTextId === null) return state
  return {
    selectedIds: ids.length === 0 ? EMPTY_SELECTION : ids,
    selectedId: ids[0] ?? null,
    collapsed: expandedToAll(state, ids),
    editingTextId: null,
  }
}

function restoredSelection(snapshot: Snapshot): Patch {
  const alive = snapshot.selectedIds.filter((id) => snapshot.doc.nodes[id])
  return {
    selectedIds: alive.length === 0 ? EMPTY_SELECTION : alive,
    selectedId: alive[0] ?? null,
  }
}

function pruneSelection(state: EditorState): Patch | EditorState {
  const alive = state.selectedIds.filter((id) => state.doc.nodes[id])
  if (alive.length === state.selectedIds.length) return state
  return {
    selectedIds: alive.length === 0 ? EMPTY_SELECTION : alive,
    selectedId: alive[0] ?? null,
  }
}

function withAddedClasses(
  previous: ReadonlySet<string>,
  incoming: Iterable<string> | undefined,
): ReadonlySet<string> {
  if (!incoming) return previous
  let next: Set<string> | null = null
  for (const cls of incoming) {
    if (previous.has(cls)) continue
    next ??= new Set(previous)
    next.add(cls)
  }
  return next ?? previous
}

function classesInSubtree(doc: EditorDocument, id: NodeId, out: string[] = []): string[] {
  const node = doc.nodes[id]
  if (!node) return out
  if (isStyled(node)) out.push(...node.classes)
  if (node.kind === 'element') {
    for (const child of node.children) classesInSubtree(doc, child, out)
  }
  return out
}

function classesInTemplate(template: NodeTemplate, out: string[] = []): string[] {
  if (template.classes) out.push(...template.classes)
  for (const child of template.children ?? []) classesInTemplate(child, out)
  return out
}

type CommitOptions = {
  coalesceKey?: string
  classes?: Iterable<string>
}

export function createEditorStore(initialHtml: string): EditorStore {
  const nextId = createIdFactory('e')
  const initialDoc = parseHtml(initialHtml)

  const initialState: EditorState = {
    doc: initialDoc,
    selectedId: null,
    selectedIds: EMPTY_SELECTION,
    collapsed: {},
    locked: {},
    usedClasses: classSetOf(initialDoc),
    history: emptyHistory(),
    editingTextId: null,
  }

  return new Store<EditorState, EditorActions>(initialState, ({ setState, get }) => {
    /** Patch-style `set`: merges a partial; returning `state` itself is a no-op with no notification. */
    function set(patch: Patch | ((state: EditorState) => Patch | EditorState)) {
      setState((state) => {
        const next = typeof patch === 'function' ? patch(state) : patch
        return next === state ? state : { ...state, ...next }
      })
    }

    let ownsNodes = true
    let reuseNodes = false

    type OpenTransaction = {
      before: Snapshot
      coalesceKey: string | null
      coalescing: boolean
      openedAt: number
      changed: boolean
      classes: string[]
    }

    let open: OpenTransaction | null = null

    function draftNodes(doc: EditorDocument): Record<NodeId, AnyNode> {
      return reuseNodes ? doc.nodes : { ...doc.nodes }
    }

    function commit(
      mutate: (doc: EditorDocument) => EditorDocument | null,
      options?: CommitOptions,
    ) {
      const transacting = open
      if (transacting) {
        set((state) => {
          reuseNodes = transacting.changed || (transacting.coalescing && ownsNodes)
          let nextDoc: EditorDocument | null
          try {
            nextDoc = mutate(state.doc)
          } finally {
            reuseNodes = false
          }
          if (!nextDoc) return state

          ownsNodes = true
          transacting.changed = true
          if (options?.classes) transacting.classes.push(...options.classes)
          return { doc: nextDoc }
        })
        return
      }

      set((state) => {
        const now = Date.now()
        const coalesceKey = options?.coalesceKey ?? null
        const coalescing = canCoalesce(state.history, coalesceKey, now)

        reuseNodes = coalescing && ownsNodes
        let nextDoc: EditorDocument | null
        try {
          nextDoc = mutate(state.doc)
        } finally {
          reuseNodes = false
        }
        if (!nextDoc) return state

        ownsNodes = true
        return {
          doc: nextDoc,
          history: pushSnapshot(state.history, snapshotOf(state), coalesceKey, now),
          usedClasses: withAddedClasses(state.usedClasses, options?.classes),
        }
      })
    }

    function runTransaction<T>(run: () => T, options?: TransactionOptions): T {
      if (open) return run()

      const state = get()
      const now = Date.now()
      const coalesceKey = options?.coalesceKey ?? null
      const entry: OpenTransaction = {
        before: snapshotOf(state),
        coalesceKey,
        coalescing: canCoalesce(state.history, coalesceKey, now),
        openedAt: now,
        changed: false,
        classes: [],
      }
      open = entry

      let result!: T
      try {
        batch(() => {
          result = run()
        })
      } finally {
        open = null
      }

      if (entry.changed) {
        set((current) => ({
          history: pushSnapshot(current.history, entry.before, entry.coalesceKey, entry.openedAt),
          usedClasses: withAddedClasses(current.usedClasses, entry.classes),
        }))
      }
      return result
    }

    function historyRestored() {
      ownsNodes = false
    }

    function materialize(
      template: NodeTemplate,
      parentId: NodeId,
      nodes: Record<NodeId, AnyNode>,
    ): NodeId {
      const id = nextId()
      const attrs = { ...template.attrs }
      const element: ElementNode = {
        id,
        kind: 'element',
        tag: template.tag,
        attrs,
        attrOrder: [...Object.keys(attrs), ...(template.classes?.length ? ['class'] : [])],
        classes: [...(template.classes ?? [])],
        parentId,
        children: [],
      }
      nodes[id] = element
      if (template.text !== undefined) {
        const textId = nextId()
        nodes[textId] = { id: textId, kind: 'text', value: template.text, parentId: id }
        element.children.push(textId)
      }
      for (const child of template.children ?? []) {
        element.children.push(materialize(child, id, nodes))
      }
      return id
    }

    function cloneSubtree(
      doc: EditorDocument,
      id: NodeId,
      parentId: NodeId,
      nodes: Record<NodeId, AnyNode>,
    ): NodeId {
      const source = doc.nodes[id]
      const cloneId = nextId()
      if (source.kind === 'element') {
        const clone: ElementNode = {
          ...source,
          id: cloneId,
          parentId,
          attrs: { ...source.attrs },
          attrOrder: [...source.attrOrder],
          classes: [...source.classes],
          children: [],
        }
        nodes[cloneId] = clone
        for (const child of source.children) {
          clone.children.push(cloneSubtree(doc, child, cloneId, nodes))
        }
      } else if (source.kind === 'opaque') {
        nodes[cloneId] = {
          ...source,
          id: cloneId,
          parentId,
          attrs: { ...source.attrs },
          attrOrder: [...source.attrOrder],
          classes: [...source.classes],
        }
      } else {
        nodes[cloneId] = { ...source, id: cloneId, parentId }
      }
      return cloneId
    }

    function detach(nodes: Record<NodeId, AnyNode>, id: NodeId, parentId: NodeId): void {
      const parent = nodes[parentId]
      if (!parent || parent.kind !== 'element') return
      nodes[parentId] = { ...parent, children: parent.children.filter((child) => child !== id) }
    }

    function attach(
      nodes: Record<NodeId, AnyNode>,
      id: NodeId,
      parentId: NodeId,
      index: number,
    ): void {
      const parent = nodes[parentId]
      if (!parent || parent.kind !== 'element') return
      const children = [...parent.children]
      children.splice(Math.max(0, Math.min(index, children.length)), 0, id)
      nodes[parentId] = { ...parent, children }
    }

    function removeMany(ids: readonly NodeId[]): void {
      const targets = normalizeSelection(get().doc, ids)
      if (targets.length === 0) return
      batch(() => {
        commit((doc) => {
          const nodes = draftNodes(doc)
          let changed = false
          for (const id of targets) {
            const node = doc.nodes[id]
            if (!node?.parentId) continue
            detach(nodes, id, node.parentId)
            for (const gone of collectSubtree(doc, id)) delete nodes[gone]
            changed = true
          }
          return changed ? { ...doc, nodes } : null
        })
        set(pruneSelection)
      })
    }

    function duplicateMany(ids: readonly NodeId[]): NodeId[] {
      const current = get().doc
      const sources = sortByDocumentOrder(current, normalizeSelection(current, ids))
      if (sources.length === 0) return []

      const duplicatedClasses: string[] = []
      for (const id of sources) classesInSubtree(current, id, duplicatedClasses)

      const clones: NodeId[] = []
      batch(() => {
        commit((doc) => {
          const nodes = draftNodes(doc)
          for (const id of sources) {
            const node = doc.nodes[id]
            if (!node?.parentId) continue
            const parent = nodes[node.parentId]
            if (!parent || parent.kind !== 'element') continue
            const clone = cloneSubtree(doc, id, node.parentId, nodes)
            attach(nodes, clone, node.parentId, parent.children.indexOf(id) + 1)
            clones.push(clone)
          }
          return clones.length > 0 ? { ...doc, nodes } : null
        }, { classes: duplicatedClasses })
        if (clones.length > 0) set((state) => withSelection(state, clones))
      })
      return clones
    }

    return {
      replaceDocument(html) {
        const doc = parseHtml(html)
        ownsNodes = true
        set({
          doc,
          selectedId: null,
          selectedIds: EMPTY_SELECTION,
          collapsed: {},
          locked: {},
          usedClasses: classSetOf(doc),
          history: emptyHistory(),
          editingTextId: null,
        })
      },

      insertNode(template, at) {
        let created: NodeId | null = null
        batch(() => {
          commit((doc) => {
            const parent = doc.nodes[at.parentId]
            if (!parent || !canHaveChildren(parent)) return null
            const nodes = draftNodes(doc)
            created = materialize(template, at.parentId, nodes)
            attach(nodes, created, at.parentId, at.index)
            return { ...doc, nodes }
          }, { classes: classesInTemplate(template) })
          if (created) set((state) => withSelection(state, [created as NodeId]))
        })
        return created
      },

      insertHtml(html, at) {
        const created: NodeId[] = []
        const parsed = parseHtml(html)
        batch(() => {
          commit((doc) => {
            const parent = doc.nodes[at.parentId]
            if (!parent || !canHaveChildren(parent)) return null

            const incoming = childrenOf(parsed, parsed.rootId)
            if (incoming.length === 0) return null

            const nodes = draftNodes(doc)
            const remap = new Map<NodeId, NodeId>()

            for (const sourceId of Object.keys(parsed.nodes)) {
              if (sourceId === parsed.rootId) continue
              remap.set(sourceId, nextId())
            }

            for (const [sourceId, targetId] of remap) {
              const source = parsed.nodes[sourceId]
              const parentId =
                source.parentId && source.parentId !== parsed.rootId
                  ? remap.get(source.parentId) ?? at.parentId
                  : at.parentId
              if (source.kind === 'element') {
                nodes[targetId] = {
                  ...source,
                  id: targetId,
                  parentId,
                  attrs: { ...source.attrs },
                  attrOrder: [...source.attrOrder],
                  classes: [...source.classes],
                  children: source.children.map((child) => remap.get(child) ?? child),
                }
              } else if (source.kind === 'opaque') {
                nodes[targetId] = {
                  ...source,
                  id: targetId,
                  parentId,
                  attrs: { ...source.attrs },
                  attrOrder: [...source.attrOrder],
                  classes: [...source.classes],
                }
              } else {
                nodes[targetId] = { ...source, id: targetId, parentId }
              }
            }

            for (let index = 0; index < incoming.length; index += 1) {
              const targetId = remap.get(incoming[index])
              if (!targetId) continue
              created.push(targetId)
              attach(nodes, targetId, at.parentId, at.index + index)
            }

            return { ...doc, nodes }
          }, { classes: classSetOf(parsed) })
          const first = created[0] ?? null
          if (first) set((state) => withSelection(state, [first]))
        })
        return created[0] ?? null
      },

      moveNode(id, at) {
        const state = get()
        const node = state.doc.nodes[id]
        if (!node || id === state.doc.rootId) return false
        if (isDescendantOf(state.doc, at.parentId, id)) return false
        const targetParent = state.doc.nodes[at.parentId]
        if (!targetParent || !canHaveChildren(targetParent)) return false

        let moved = false
        commit((doc) => {
          const current = doc.nodes[id]
          const currentParentId = current?.parentId
          if (!currentParentId) return null
          const parent = doc.nodes[currentParentId]
          if (!parent || parent.kind !== 'element') return null

          const sameParent = currentParentId === at.parentId
          const oldIndex = parent.children.indexOf(id)
          const targetIndex = sameParent && oldIndex !== -1 && oldIndex < at.index ? at.index - 1 : at.index
          if (sameParent && oldIndex === targetIndex) return null

          const nodes = draftNodes(doc)
          detach(nodes, id, currentParentId)
          attach(nodes, id, at.parentId, targetIndex)
          nodes[id] = { ...nodes[id], parentId: at.parentId } as AnyNode
          moved = true
          return { ...doc, nodes }
        })
        return moved
      },

      removeNode(id) {
        removeMany([id])
      },

      removeNodes(ids) {
        removeMany(ids)
      },

      duplicateNode(id) {
        return duplicateMany([id])[0] ?? null
      },

      duplicateNodes(ids) {
        return duplicateMany(ids)
      },

      setClasses(id, classes) {
        commit((doc) => {
          const node = doc.nodes[id]
          if (!node || !isStyled(node)) return null
          const same =
            node.classes.length === classes.length &&
            node.classes.every((cls, index) => cls === classes[index])
          if (same) return null
          const nodes = draftNodes(doc)
          nodes[id] = withClasses(node, classes)
          return { ...doc, nodes }
        }, { coalesceKey: `classes:${id}`, classes })
      },

      setAttr(id, name, value) {
        commit((doc) => {
          const node = doc.nodes[id]
          if (!node || !isStyled(node)) return null
          if (name !== 'class' && node.attrs[name] === value) return null
          const nodes = draftNodes(doc)
          nodes[id] = withAttr(node, name, value)
          return { ...doc, nodes }
        }, {
          coalesceKey: `attr:${id}:${name}`,
          classes: name === 'class' && value ? value.trim().split(/\s+/) : undefined,
        })
      },

      setText(id, value) {
        commit((doc) => {
          const node = doc.nodes[id]
          if (!node || (node.kind !== 'text' && node.kind !== 'comment')) return null
          if (node.value === value) return null
          const nodes = draftNodes(doc)
          nodes[id] = { ...node, value }
          return { ...doc, nodes }
        }, { coalesceKey: `text:${id}` })
      },

      placeNode(id, { style, parentId, index, coalesce = false }) {
        const state = get()
        const node = state.doc.nodes[id]
        if (!node || !isStyled(node) || id === state.doc.rootId) return false
        if (parentId !== undefined) {
          if (isDescendantOf(state.doc, parentId, id)) return false
          const targetParent = state.doc.nodes[parentId]
          if (!targetParent || !canHaveChildren(targetParent)) return false
        }

        let placed = false
        commit(
          (doc) => {
            const current = doc.nodes[id]
            if (!current || !isStyled(current)) return null
            const nodes = draftNodes(doc)
            let changed = false

            const nextStyle = style || null
            if ((current.attrs.style ?? null) !== nextStyle) {
              nodes[id] = withAttr(current, 'style', nextStyle)
              changed = true
            }

            const fromParentId = current.parentId
            if (parentId !== undefined && fromParentId) {
              const fromParent = doc.nodes[fromParentId]
              const toParent = doc.nodes[parentId]
              if (fromParent?.kind === 'element' && toParent?.kind === 'element') {
                const sameParent = fromParentId === parentId
                const oldIndex = fromParent.children.indexOf(id)
                const requested = index ?? toParent.children.length
                const targetIndex =
                  sameParent && oldIndex !== -1 && oldIndex < requested ? requested - 1 : requested
                if (!sameParent || oldIndex !== targetIndex) {
                  detach(nodes, id, fromParentId)
                  attach(nodes, id, parentId, targetIndex)
                  nodes[id] = { ...nodes[id], parentId } as AnyNode
                  changed = true
                }
              }
            }

            if (!changed) return null
            placed = true
            return { ...doc, nodes }
          },
          { coalesceKey: coalesce ? `place:${id}` : undefined },
        )
        return placed
      },

      placeNodes(updates, options) {
        if (updates.length === 0) return false
        const coalesceKey = options?.coalesce
          ? `place:${[...new Set(updates.map((update) => update.id))].sort().join(',')}`
          : undefined
        let placed = false
        runTransaction(() => {
          for (const update of updates) {
            if (this.placeNode(update.id, { ...update, coalesce: false })) placed = true
          }
        }, { coalesceKey })
        return placed
      },

      select(id, options) {
        if (options?.mode === 'toggle') {
          if (id) this.toggleSelected(id)
          return
        }
        set((state) => withSelection(state, id ? [id] : EMPTY_SELECTION))
      },

      toggleSelected(id) {
        set((state) => {
          const { doc } = state
          if (state.selectedIds.includes(id)) {
            return withSelection(
              state,
              state.selectedIds.filter((other) => other !== id),
            )
          }
          if (id === doc.rootId || !doc.nodes[id]) return state
          const kept = state.selectedIds.filter(
            (other) => !isDescendantOf(doc, other, id) && !isDescendantOf(doc, id, other),
          )
          return withSelection(state, [id, ...kept])
        })
      },

      selectMany(ids) {
        set((state) => withSelection(state, normalizeSelection(state.doc, ids)))
      },

      transaction(run, options) {
        return runTransaction(run, options)
      },

      setLocked(id, locked) {
        set((state) => {
          if (Boolean(state.locked[id]) === locked) return state
          const next = { ...state.locked }
          if (locked) next[id] = true
          else delete next[id]
          return { locked: next }
        })
      },

      setLockedMany(ids, locked) {
        set((state) => {
          let next: Record<NodeId, true> | null = null
          for (const id of ids) {
            if (Boolean(state.locked[id]) === locked) continue
            next ??= { ...state.locked }
            if (locked) next[id] = true
            else delete next[id]
          }
          return next ? { locked: next } : state
        })
      },

      toggleCollapsed(id) {
        set((state) => {
          const collapsed = { ...state.collapsed }
          if (collapsed[id]) delete collapsed[id]
          else collapsed[id] = true
          return { collapsed }
        })
      },

      setCollapsed(id, collapsed) {
        set((state) => {
          if (Boolean(state.collapsed[id]) === collapsed) return state
          const next = { ...state.collapsed }
          if (collapsed) next[id] = true
          else delete next[id]
          return { collapsed: next }
        })
      },

      beginTextEdit(id) {
        set((state) => (state.editingTextId === id ? state : { editingTextId: id }))
      },

      undo() {
        set((state) => {
          const step = popPast(state.history, snapshotOf(state))
          if (!step) return state
          historyRestored()
          return {
            doc: step.snapshot.doc,
            ...restoredSelection(step.snapshot),
            editingTextId: null,
            history: step.history,
          }
        })
      },

      redo() {
        set((state) => {
          const step = popFuture(state.history, snapshotOf(state))
          if (!step) return state
          historyRestored()
          return {
            doc: step.snapshot.doc,
            ...restoredSelection(step.snapshot),
            editingTextId: null,
            history: step.history,
          }
        })
      },

      getHtml() {
        return serializeHtml(get().doc)
      },
    }
  })
}
