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
  | 'component'
  | 'rowTops'
  | 'rowCentres'
  | 'rowBottoms'
  | 'centreContents'
  | 'wrapLeft'
  | 'wrapRight'
  | 'besidePrevious'
  | 'besideNext'
  | 'columns'
  | 'stack'
  | 'switchOrder'

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
  component: 'M1.6 1.6h8.8v8.8H1.6z M4.2 4.2h3.6v3.6H4.2z',
  rowTops: 'M1.5 2.5h3.5v7h-3.5z M7 2.5h3.5v4h-3.5z M1 2.5h10',
  rowCentres: 'M1.5 2.5h3.5v7h-3.5z M7 4h3.5v4h-3.5z M1 6h10',
  rowBottoms: 'M1.5 2.5h3.5v7h-3.5z M7 5.5h3.5v4h-3.5z M1 9.5h10',
  centreContents: 'M1.5 1.5h9v9h-9z M3.5 4.5h5 M4.5 7.5h3',
  wrapLeft: 'M1.5 2h3.4v3.4H1.5z M6.4 2.6h4.1 M6.4 4.8h4.1 M1.5 7.2h9 M1.5 9.4h9',
  wrapRight: 'M7.1 2h3.4v3.4H7.1z M1.5 2.6h4.1 M1.5 4.8h4.1 M1.5 7.2h9 M1.5 9.4h9',
  besidePrevious: 'M6 3.5h4.5v5H6z M4.3 6H1.5 M2.8 4.6 1.4 6l1.4 1.4',
  besideNext: 'M1.5 3.5H6v5H1.5z M7.7 6h2.8 M9.2 4.6 10.6 6 9.2 7.4',
  columns: 'M1.5 2.5h3.8v7H1.5z M6.7 2.5h3.8v7H6.7z',
  stack: 'M1.5 1.8h9v3.4h-9z M1.5 6.8h9v3.4h-9z',
  switchOrder: 'M1.8 4h8.4 M8.6 2.4 10.2 4 8.6 5.6 M10.2 8H1.8 M3.4 6.4 1.8 8l1.6 1.6',
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
