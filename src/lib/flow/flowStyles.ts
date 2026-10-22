import { cn } from 'cn'

export const OVERLAY_CLASS = 'pointer-events-none absolute inset-0 z-[31] overflow-hidden'

const PLACED_CLASS =
  'pointer-events-none absolute top-0 left-0 will-change-transform data-[visible=false]:hidden'

export const FRAME_CLASS = cn(
  PLACED_CLASS,
  'group/flow box-border rounded-[2px] ring-[1.5px] ring-primary',
)

export const PARENT_CLASS = cn(
  PLACED_CLASS,
  'rounded-[3px] border border-dashed border-teal-500/70',
)

const BAND_CLASS = cn(PLACED_CLASS, 'box-border border-solid')

export const MARGIN_BAND_CLASS = cn(BAND_CLASS, 'border-amber-400/35')

export const PADDING_BAND_CLASS = cn(BAND_CLASS, 'border-emerald-400/35')

export const GUIDE_CLASS = cn(
  PLACED_CLASS,
  'h-0 w-full border-t-2 border-primary',
)

export const COMPONENT_OUTLINE_CLASS = cn(
  PLACED_CLASS,
  'rounded-[3px] border-2 border-solid border-violet-500/80',
)

export const GHOST_CLASS = cn(
  PLACED_CLASS,
  'z-[33] rounded-[3px] border-2 border-dashed border-violet-500/80 bg-violet-500/10',
)

export const GHOST_LABEL_CLASS =
  'pointer-events-none absolute top-full left-0 mt-1 rounded-sm bg-violet-600 px-1.5 py-0.5 ' +
  'font-sans text-[10px] leading-4 whitespace-nowrap text-white'

const GRIP_CLASS =
  'pointer-events-auto absolute m-0 box-border size-[10px] appearance-none touch-none rounded-[2px] ' +
  'border border-solid bg-white p-0 leading-none select-none ' +
  'shadow-[0_1px_3px_rgba(15,23,42,0.25)] before:absolute before:inset-[-7px] ' +
  'focus-visible:outline focus-visible:outline-ring'

export const CORNER_CLASS = cn(
  GRIP_CLASS,
  'border-primary -translate-x-1/2 -translate-y-1/2',
  'data-[corner=nw]:top-0 data-[corner=nw]:left-0 data-[corner=nw]:cursor-nwse-resize',
  'data-[corner=ne]:top-0 data-[corner=ne]:left-full data-[corner=ne]:cursor-nesw-resize',
  'data-[corner=sw]:top-full data-[corner=sw]:left-0 data-[corner=sw]:cursor-nesw-resize',
  'data-[corner=se]:top-full data-[corner=se]:left-full data-[corner=se]:cursor-nwse-resize',
)

export const SPACE_HANDLE_CLASS = cn(
  GRIP_CLASS,
  'top-full left-3/4 h-[6px] w-[22px] -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  'border-amber-500 bg-amber-400',
)

export const HEIGHT_HANDLE_CLASS = cn(
  GRIP_CLASS,
  'top-full left-1/2 h-[6px] w-[22px] -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  'border-sky-500 bg-sky-400',
)

export const TOOLBAR_OVERLAY_CLASS = 'pointer-events-none absolute inset-0 z-[32]'

export const TOOLBAR_CLASS =
  'pointer-events-auto absolute top-0 left-0 flex max-w-full flex-wrap items-center gap-0.5 ' +
  'rounded-md border border-border bg-background p-1 font-sans text-xs text-foreground ' +
  'shadow-[0_4px_12px_rgba(15,23,42,0.18)] will-change-transform data-[visible=false]:hidden'

export const TOOLBAR_GROUP_CLASS = 'flex items-center gap-0.5'

export const TOOLBAR_SEPARATOR_CLASS = cn(
  'mx-0.5 h-4 w-px shrink-0 bg-border',
  'first:hidden last:hidden [&:has(+span)]:hidden',
)

export const TOOLBAR_BUTTON_CLASS =
  'inline-flex h-6 min-w-6 appearance-none items-center justify-center gap-px rounded-sm border-0 ' +
  'bg-transparent px-1 font-sans text-[11px] leading-none text-muted-foreground ' +
  'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground ' +
  'disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-ring'

export const REPOSITION_BUTTON_CLASS = cn(
  'inline-flex h-6 min-w-6 appearance-none items-center justify-center gap-1 rounded-sm border-0 ',
  'bg-transparent px-1 font-sans text-[11px] leading-none text-violet-600 ',
  'hover:bg-violet-500/10 disabled:pointer-events-none disabled:opacity-40 ',
  'focus-visible:outline focus-visible:outline-ring ',
  'aria-pressed:bg-violet-600 aria-pressed:text-white',
)

export const POPOVER_CLASS =
  'absolute top-full left-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-md border border-border ' +
  'bg-background p-2 font-sans text-xs text-foreground shadow-[0_8px_20px_rgba(15,23,42,0.22)]'

export const LAYOUT_POPOVER_CLASS =
  'absolute top-full left-0 z-10 mt-1 flex w-64 flex-col gap-2 rounded-md border border-border ' +
  'bg-background p-2 font-sans text-xs text-foreground shadow-[0_8px_20px_rgba(15,23,42,0.22)]'

export const LAYOUT_LIST_CLASS =
  'm-0 flex max-h-72 list-none flex-col gap-px overflow-auto overscroll-contain p-0 [scrollbar-width:thin]'

export const LAYOUT_ITEM_CLASS =
  'flex w-full cursor-default appearance-none items-start gap-2 rounded-sm border-0 ' +
  'bg-transparent px-1.5 py-1 text-left font-[inherit] text-[11px] leading-5 text-foreground ' +
  'hover:not-disabled:bg-muted disabled:opacity-40 focus-visible:outline focus-visible:outline-ring'

export const LAYOUT_ITEM_ICON_CLASS = 'mt-1 flex shrink-0 text-muted-foreground'

export const LAYOUT_ITEM_TEXT_CLASS = 'flex min-w-0 flex-1 flex-col items-start'

export const LAYOUT_REASON_CLASS = 'text-[10px] leading-4 text-muted-foreground'

export const TAG_LIST_CLASS =
  'm-0 flex max-h-50 list-none flex-col gap-px overflow-auto overscroll-contain p-0 [scrollbar-width:thin]'

export const TAG_OPTION_CLASS =
  'flex w-full cursor-default appearance-none items-center gap-2 rounded-sm border-0 bg-transparent ' +
  'px-1.5 py-1 text-left font-[inherit] text-[11px] leading-5 text-foreground ' +
  'hover:not-disabled:bg-muted disabled:opacity-40 focus-visible:outline focus-visible:outline-ring ' +
  'aria-[current=true]:bg-muted aria-[current=true]:font-medium'

export const TAG_NAME_CLASS = 'min-w-0 flex-1 truncate font-mono'

export const TAG_REASON_CLASS = 'shrink-0 text-[10px] text-muted-foreground'

export const FIELD_CLASS = 'flex items-center gap-2'

export const FIELD_LABEL_CLASS = 'min-w-0 flex-1 truncate text-muted-foreground'

export const FIELD_INPUT_CLASS =
  'h-6 w-16 rounded-sm border border-input bg-background px-1.5 text-right font-mono text-[11px] ' +
  'text-foreground tabular-nums focus-visible:outline focus-visible:outline-ring'

export const FIELD_HINT_CLASS = 'text-[11px] text-amber-600'

export const STATUS_CLASS =
  'flex items-center gap-2 border-t border-border bg-background px-3 py-1.5 font-sans text-xs ' +
  'text-muted-foreground'

export const STATUS_CHIP_CLASS =
  'rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] leading-4 text-foreground'

export const STATUS_HINT_CLASS = 'min-w-0 flex-1 truncate'

export const STATUS_BUTTON_CLASS =
  'inline-flex h-6 shrink-0 appearance-none items-center gap-1 rounded-sm border-0 bg-transparent ' +
  'px-1.5 font-sans text-[11px] leading-none text-muted-foreground hover:bg-muted ' +
  'hover:text-foreground disabled:pointer-events-none disabled:opacity-40 ' +
  'focus-visible:outline focus-visible:outline-ring'

export const DIALOG_BACKDROP_CLASS =
  'fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 p-4 font-sans'

export const DIALOG_CLASS =
  'static m-0 flex w-80 max-w-full flex-col gap-3 rounded-md border border-border bg-background ' +
  'p-4 text-xs text-foreground shadow-[0_12px_32px_rgba(15,23,42,0.28)]'

export const DIALOG_TITLE_CLASS = 'text-sm font-medium text-foreground'

export const DIALOG_BODY_CLASS = 'text-[11px] leading-5 text-muted-foreground'

export const DIALOG_ACTIONS_CLASS = 'flex items-center justify-end gap-2'

export const DIALOG_BUTTON_CLASS =
  'inline-flex h-7 appearance-none items-center rounded-sm border border-border bg-transparent ' +
  'px-2.5 font-sans text-[11px] leading-none text-foreground hover:bg-muted ' +
  'focus-visible:outline focus-visible:outline-ring'

export const DIALOG_PRIMARY_CLASS =
  'inline-flex h-7 appearance-none items-center rounded-sm border-0 bg-primary px-2.5 font-sans ' +
  'text-[11px] leading-none text-primary-foreground hover:opacity-90 ' +
  'focus-visible:outline focus-visible:outline-ring'

export const GROUP_FRAME_CLASS = cn(
  PLACED_CLASS,
  'rounded-[3px] border border-dashed border-primary/70 bg-primary/5',
)

export const GROUP_MEMBER_CLASS = cn(PLACED_CLASS, 'rounded-[2px] ring-[1.5px] ring-primary/60')

export const GROUP_COUNT_CLASS =
  'px-1 font-sans text-[11px] leading-none whitespace-nowrap text-muted-foreground'
