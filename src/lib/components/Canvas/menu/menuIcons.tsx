export type MenuIconName =
  | 'duplicate'
  | 'delete'
  | 'copy'
  | 'paste'
  | 'copyStyle'
  | 'pasteStyle'
  | 'parent'
  | 'lock'
  | 'unlock'

const MENU_ICON_PATHS: Record<MenuIconName, string> = {
  duplicate: 'M4.5 1.5h6v6 M1.5 4.5h6v6h-6z',
  delete: 'M2.5 3.5h7 M4.5 3.5v-1h3v1 M3.4 3.5l.6 7h4l.6-7 M5.2 5.5v3 M6.8 5.5v3',
  copy: 'M3.5 1.5h3.6l2.4 2.4V9.5h-6z M7.1 1.5v2.4h2.4 M1.5 4.5v6h5',
  paste: 'M4 2.5H2.5v8h7v-8H8 M4.2 1.4h3.6v2.1H4.2z',
  copyStyle: 'M6 1.6c0 0 2.8 3.1 2.8 4.8a2.8 2.8 0 0 1-5.6 0C3.2 4.7 6 1.6 6 1.6z',
  pasteStyle: 'M2.5 10.5h7 M6 1.4c0 0 2.3 2.6 2.3 4a2.3 2.3 0 0 1-4.6 0c0-1.4 2.3-4 2.3-4z',
  parent: 'M2 2.5H10 M6 10V5 M3.5 7.5 6 5l2.5 2.5',
  lock: 'M3.2 5.4h5.6v5.1H3.2z M4.4 5.4V3.8a1.6 1.6 0 0 1 3.2 0v1.6',
  unlock: 'M3.2 5.4h5.6v5.1H3.2z M4.4 5.4V3.8a1.6 1.6 0 0 1 3.2 0',
}

export function MenuIcon({ name }: { name: MenuIconName }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d={MENU_ICON_PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
