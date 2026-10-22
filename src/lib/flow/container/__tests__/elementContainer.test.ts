import { describe, expect, it } from 'vitest'
import type { NodeId } from '../../../core/ids'
import { parseHtml } from '../../../core/html/parse'
import type { EditorDocument } from '../../../core/model'
import type { StyleReader } from '../../capabilities'
import {
  alignmentOf,
  canWrapInContainer,
  containerAttributes,
  containerMessageOf,
  CONTAINER_REASONS,
  planContainer,
  slotOf,
  type ContainerBlock,
} from '../elementContainer'

type Declared = Partial<Record<string, string>>

const DEFAULTS: Record<string, string> = {
  display: 'block',
  position: 'static',
  float: 'none',
  writingMode: 'horizontal-tb',
  transform: 'none',
  rotate: 'none',
  scale: 'none',
  order: '0',
  alignSelf: 'auto',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  gridAutoFlow: 'row',
  gridColumn: 'auto',
  gridRow: 'auto',
  gridArea: 'auto / auto / auto / auto',
}

function readerFor(styles: Map<Element, Declared>): StyleReader {
  return (element) => ({ ...DEFAULTS, ...(styles.get(element) ?? {}) }) as unknown as CSSStyleDeclaration
}

function build(html: string) {
  const canvas = document.createElement('div')
  canvas.setAttribute('data-adt-canvas', '')
  canvas.innerHTML = html
  document.body.appendChild(canvas)
  const styles = new Map<Element, Declared>()
  return {
    canvas,
    styles,
    read: () => readerFor(styles),
    pick: (selector: string) => canvas.querySelector<HTMLElement>(selector)!,
  }
}

function widthOf(element: HTMLElement, width: number) {
  Object.defineProperty(element, 'offsetWidth', { value: width, configurable: true })
}

function lockOf(html: string, lockedTag: string) {
  const doc: EditorDocument = parseHtml(html)
  const node = Object.values(doc.nodes).find(
    (entry) => entry.kind === 'element' && entry.tag === lockedTag,
  )
  if (!node) throw new Error(`no <${lockedTag}>`)
  return { doc, locked: { [node.id]: true } as Record<NodeId, true>, id: node.id }
}

describe('canWrapInContainer', () => {
  it('allows a plain block inside a plain parent', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe(true)
  })

  it('refuses an element that is already a container', () => {
    const page = build('<section><div id="box" data-responsive-container="true">x</div></section>')
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>('already-container')
  })

  it('refuses an element whose parent is already a container', () => {
    const page = build('<div data-responsive-container="true"><div id="box">x</div></div>')
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>('parent-container')
  })

  it('refuses when the parent is not a flow container', () => {
    const page = build('<ul id="list"><li id="row">x</li></ul>')
    expect(canWrapInContainer(page.pick('#row'), page.read())).toBe<ContainerBlock>(
      'no-container-parent',
    )
  })

  it('refuses a row that wraps', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'flex', flexWrap: 'wrap' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>('reordered-row')
  })

  it('refuses a row whose children carry an order', () => {
    const page = build('<section id="s"><div id="box">x</div><div id="other">y</div></section>')
    page.styles.set(page.pick('#s'), { display: 'flex' })
    page.styles.set(page.pick('#other'), { order: '2' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>('reordered-row')
  })

  it('refuses a reversed row', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'flex', flexDirection: 'row-reverse' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>('reordered-row')
  })

  it('refuses a grid child placed by hand', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'grid' })
    page.styles.set(page.pick('#box'), { gridColumn: '2 / 4' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>('placed')
  })

  it('allows a grid child the grid places itself', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'grid' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe(true)
  })

  it('refuses when a descendant is positioned', () => {
    const page = build('<section id="s"><div id="box"><span id="pin">x</span></div></section>')
    page.styles.set(page.pick('#pin'), { position: 'absolute' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>(
      'positioned-descendant',
    )
  })

  it('refuses when a descendant is transformed', () => {
    const page = build('<section id="s"><div id="box"><span id="tilt">x</span></div></section>')
    page.styles.set(page.pick('#tilt'), { transform: 'rotate(2deg)' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>(
      'transformed-descendant',
    )
  })

  it('refuses a locked element', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    const lock = lockOf('<section><div>x</div></section>', 'div')
    expect(canWrapInContainer(page.pick('#box'), page.read(), lock)).toBe<ContainerBlock>('locked')
  })

  it('refuses an inline element that is not an image', () => {
    const page = build('<p id="p">text <span id="word">w</span></p>')
    page.styles.set(page.pick('#word'), { display: 'inline' })
    expect(canWrapInContainer(page.pick('#word'), page.read())).toBe<ContainerBlock>('inline')
  })

  it('allows an inline image', () => {
    const page = build('<section id="s"><img id="shot" /></section>')
    page.styles.set(page.pick('#shot'), { display: 'inline' })
    expect(canWrapInContainer(page.pick('#shot'), page.read())).toBe(true)
  })

  it('refuses loose text inside a slot', () => {
    const page = build('<section id="s">stray <div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'flex' })
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe<ContainerBlock>('loose-text')
  })

  it('allows loose text outside a slot', () => {
    const page = build('<section id="s">stray <div id="box">x</div></section>')
    expect(canWrapInContainer(page.pick('#box'), page.read())).toBe(true)
  })

  it('names every refusal', () => {
    for (const reason of Object.keys(CONTAINER_REASONS) as ContainerBlock[]) {
      expect(CONTAINER_REASONS[reason].length).toBeGreaterThan(0)
    }
  })
})

describe('slotOf', () => {
  it('reads a row, a column and a grid', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    const section = page.pick('#s')
    const box = page.pick('#box')

    expect(slotOf(box, page.read())).toBeNull()

    page.styles.set(section, { display: 'flex' })
    expect(slotOf(box, page.read())).toBe('row')

    page.styles.set(section, { display: 'flex', flexDirection: 'column' })
    expect(slotOf(box, page.read())).toBe('column')

    page.styles.set(section, { display: 'grid' })
    expect(slotOf(box, page.read())).toBe('grid')
  })
})

describe('alignmentOf', () => {
  it('reads the base-breakpoint auto margins and ignores the mobile ones', () => {
    expect(alignmentOf(['mx-auto'])).toBe('center')
    expect(alignmentOf(['ml-auto'])).toBe('right')
    expect(alignmentOf(['mr-auto'])).toBe('left')
    expect(alignmentOf(['max-sm:mx-auto'])).toBeNull()
    expect(alignmentOf(['p-4'])).toBeNull()
  })
})

describe('planContainer', () => {
  it('wraps a block in a plain container and leaves the child alone', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    const box = page.pick('#box')
    widthOf(box, 420)

    const plan = planContainer(box, ['w-1/2', 'mb-6'], page.read())

    expect(plan.slot).toBeNull()
    expect(plan.wrapper.classes).toEqual([])
    expect(plan.wrapper.style).toBe('display:block;width:100%;min-width:0')
    expect(plan.childClasses).toBeNull()
    expect(containerAttributes(plan)).toEqual({
      'data-responsive-container': 'true',
      style: 'display:block;width:100%;min-width:0',
    })
  })

  it('takes the slot of a row and pins the child to its measured width', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'flex' })
    const box = page.pick('#box')
    page.styles.set(box, { alignSelf: 'flex-end' })
    widthOf(box, 317)

    const plan = planContainer(box, ['w-1/2', 'shrink', 'self-end', 'mb-6'], page.read())

    expect(plan.slot).toBe('row')
    expect(plan.width).toBe(317)
    expect(plan.wrapper.classes).toEqual(['w-full', 'min-w-0', 'max-w-full', 'flex-1'])
    expect(plan.wrapper.style).toBe('display:flow-root;align-self:flex-end')
    expect(plan.childClasses).toEqual([
      'mb-6',
      'w-[317px]',
      'min-w-0',
      'max-w-full',
      'box-border',
    ])
  })

  it('leaves flex-1 off a column and a grid', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    const box = page.pick('#box')
    widthOf(box, 200)

    page.styles.set(page.pick('#s'), { display: 'flex', flexDirection: 'column' })
    expect(planContainer(box, [], page.read()).wrapper.classes).toEqual([
      'w-full',
      'min-w-0',
      'max-w-full',
    ])

    page.styles.set(page.pick('#s'), { display: 'grid' })
    expect(planContainer(box, [], page.read()).wrapper.classes).toEqual([
      'w-full',
      'min-w-0',
      'max-w-full',
    ])
  })

  it('omits align-self when the element never set one', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'grid' })
    const box = page.pick('#box')
    widthOf(box, 100)

    expect(planContainer(box, [], page.read()).wrapper.style).toBe('display:flow-root')
  })

  it('keeps the max-sm overrides while it rewrites the base width and margins', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'flex' })
    const box = page.pick('#box')
    widthOf(box, 240)

    const plan = planContainer(
      box,
      ['w-1/3', 'mx-auto', 'ml-4', 'max-sm:w-full', 'max-sm:mx-auto', 'text-left'],
      page.read(),
    )

    expect(plan.childClasses).toEqual([
      'max-sm:w-full',
      'max-sm:mx-auto',
      'text-left',
      'w-[240px]',
      'min-w-0',
      'max-w-full',
      'box-border',
      'mx-auto',
    ])
  })

  it('carries the alignment the element already had', () => {
    const page = build('<section id="s"><div id="box">x</div></section>')
    page.styles.set(page.pick('#s'), { display: 'grid' })
    const box = page.pick('#box')
    widthOf(box, 180)

    expect(planContainer(box, ['ml-auto'], page.read()).childClasses).toContain('ml-auto')
    expect(planContainer(box, ['mr-auto'], page.read()).childClasses).toContain('mr-auto')
    expect(planContainer(box, [], page.read()).childClasses).not.toContain('mr-auto')
  })
})

describe('containerMessageOf', () => {
  it('reads five ways', () => {
    const imageInSlot = containerMessageOf({ blocked: null, image: true, slot: 'row' })
    const imageAlone = containerMessageOf({ blocked: null, image: true, slot: null })
    const blockInSlot = containerMessageOf({ blocked: null, image: false, slot: 'grid' })
    const blockAlone = containerMessageOf({ blocked: null, image: false, slot: null })
    const refused = containerMessageOf({ blocked: 'locked', image: false, slot: null })

    const bodies = [imageInSlot, imageAlone, blockInSlot, blockAlone, refused].map(
      (message) => message.body,
    )
    expect(new Set(bodies).size).toBe(5)

    expect(imageInSlot.title).toBe('Wrap in container')
    expect(imageInSlot.body).toContain('This image')
    expect(imageAlone.body).toContain('This image')
    expect(blockInSlot.body).toContain('This element')
    expect(blockAlone.body).toContain('This element')
    expect(refused.title).toBe('Cannot wrap this in a container')
    expect(refused.body).toContain(CONTAINER_REASONS.locked)
    expect(refused.body).toContain('Select the parent')
  })
})
