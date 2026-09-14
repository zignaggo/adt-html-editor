export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Box = Point & Size

export function measureScale(pageRect: DOMRect, pageWidth: number): number {
  if (!pageRect.width || !pageWidth) return 1
  const scale = pageRect.width / pageWidth
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

export function toPage(client: Point, pageRect: DOMRect, scale: number): Point {
  return { x: (client.x - pageRect.left) / scale, y: (client.y - pageRect.top) / scale }
}

export function roundTo(value: number, precision: number): number {
  if (precision <= 0) return value
  const decimals = Math.max(0, Math.ceil(-Math.log10(precision)))
  return Number((Math.round(value / precision) * precision).toFixed(decimals))
}

export function readBox(element: Element, pageElement: Element, scale: number): Box {
  const rect = element.getBoundingClientRect()
  const page = pageElement.getBoundingClientRect()
  return {
    x: (rect.left - page.left) / scale,
    y: (rect.top - page.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  }
}
