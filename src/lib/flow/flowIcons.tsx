export type FlowIconName =
  | 'parent'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'textSize'
  | 'width'
  | 'spaceBelow'
  | 'moveUp'
  | 'moveDown'
  | 'size'
  | 'tag'
  | 'reposition'
  | 'layout'

const FLOW_ICON_PATHS: Record<FlowIconName, string> = {
  parent: 'M2 2.5H10 M6 10V5 M3.5 7.5 6 5l2.5 2.5',
  alignLeft: 'M2 3H10 M2 6H7 M2 9H8',
  alignCenter: 'M2 3H10 M3.5 6H8.5 M2.5 9H9.5',
  alignRight: 'M2 3H10 M5 6H10 M4 9H10',
  textSize: 'M2.5 9.5 6 2.5l3.5 7 M4 7.2h4',
  width: 'M2 3V9 M10 3V9 M3.5 6H8.5',
  spaceBelow: 'M6 2V7 M4 5l2 2 2-2 M2 10H10',
  moveUp: 'M6 10V3 M3.5 5.5 6 3l2.5 2.5',
  moveDown: 'M6 2v7 M3.5 6.5 6 9l2.5-2.5',
  size: 'M2.5 2.5h7v7h-7z M5.5 7.5 7.5 5.5',
  tag: 'M6.2 1.8H10v3.8L5.4 10.2 1.8 6.6z M7.9 3.9h.01',
  reposition: 'M6 1.5v9 M1.5 6h9 M6 1.5 4.5 3 M6 1.5 7.5 3 M6 10.5 4.5 9 M6 10.5 7.5 9 M1.5 6 3 4.5 M1.5 6 3 7.5 M10.5 6 9 4.5 M10.5 6 9 7.5',
  layout: 'M1.8 2h8.4v8H1.8z M5.2 2v8 M5.2 6h5',
}

export function FlowIcon({ name }: { name: FlowIconName }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d={FLOW_ICON_PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
