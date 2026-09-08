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

export type EditorState = {
  doc: EditorDocument
  selectedId: NodeId | null
  collapsed: Record<NodeId, true>
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
  duplicateNode: (id: NodeId) => NodeId | null
  setClasses: (id: NodeId, classes: string[]) => void
  setAttr: (id: NodeId, name: string, value: string | null) => void
  setText: (id: NodeId, value: string) => void
  select: (id: NodeId | null) => void
  toggleCollapsed: (id: NodeId) => void
  setCollapsed: (id: NodeId, collapsed: boolean) => void
  beginTextEdit: (id: NodeId | null) => void
  undo: () => void
  redo: () => void
  getHtml: () => string
}

/**
 * Store do editor: `store.state` é somente leitura, `store.actions` é a única forma de mutar,
 * `store.subscribe(listener)` notifica a cada mudança (retorna `{ unsubscribe }`).
 */
export type EditorStore = Store<EditorState, EditorActions>

type Patch = Partial<EditorState>

function snapshotOf(state: EditorState): Snapshot {
  return { doc: state.doc, selectedId: state.selectedId }
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
    collapsed: {},
    usedClasses: classSetOf(initialDoc),
    history: emptyHistory(),
    editingTextId: null,
  }

  return new Store<EditorState, EditorActions>(initialState, ({ setState, get }) => {
    /** `set` no estilo "patch": mescla um parcial; devolver o próprio `state` é um no-op sem notificação. */
    function set(patch: Patch | ((state: EditorState) => Patch | EditorState)) {
      setState((state) => {
        const next = typeof patch === 'function' ? patch(state) : patch
        return next === state ? state : { ...state, ...next }
      })
    }

    let ownsNodes = true
    let reuseNodes = false

    function draftNodes(doc: EditorDocument): Record<NodeId, AnyNode> {
      return reuseNodes ? doc.nodes : { ...doc.nodes }
    }

    function commit(
      mutate: (doc: EditorDocument) => EditorDocument | null,
      options?: CommitOptions,
    ) {
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

    return {
      replaceDocument(html) {
        const doc = parseHtml(html)
        ownsNodes = true
        set({
          doc,
          selectedId: null,
          collapsed: {},
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
          if (created) set({ selectedId: created })
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
          if (first) set({ selectedId: first })
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
        batch(() => {
          commit((doc) => {
            const node = doc.nodes[id]
            if (!node?.parentId || id === doc.rootId) return null
            const nodes = draftNodes(doc)
            detach(nodes, id, node.parentId)
            for (const gone of collectSubtree(doc, id)) delete nodes[gone]
            return { ...doc, nodes }
          })
          set((state) =>
            state.selectedId && !state.doc.nodes[state.selectedId] ? { selectedId: null } : state,
          )
        })
      },

      duplicateNode(id) {
        let created: NodeId | null = null
        const duplicatedClasses = classesInSubtree(get().doc, id)
        batch(() => {
          commit((doc) => {
            const node = doc.nodes[id]
            if (!node?.parentId || id === doc.rootId) return null
            const parent = doc.nodes[node.parentId]
            if (!parent || parent.kind !== 'element') return null
            const nodes = draftNodes(doc)
            created = cloneSubtree(doc, id, node.parentId, nodes)
            attach(nodes, created, node.parentId, parent.children.indexOf(id) + 1)
            return { ...doc, nodes }
          }, { classes: duplicatedClasses })
          if (created) set({ selectedId: created })
        })
        return created
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

      select(id) {
        set((state) => (state.selectedId === id ? state : { selectedId: id, editingTextId: null }))
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
            selectedId: step.snapshot.selectedId,
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
            selectedId: step.snapshot.selectedId,
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
