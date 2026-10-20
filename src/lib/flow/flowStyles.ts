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

export const GUIDE_CLASS = cn(
  PLACED_CLASS,
  'h-0 w-full border-t-2 border-primary',
)

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

export const STATUS_CLASS =
  'flex items-center gap-2 border-t border-border bg-background px-3 py-1.5 font-sans text-xs ' +
  'text-muted-foreground'

export const STATUS_CHIP_CLASS =
  'rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] leading-4 text-foreground'

export const STATUS_HINT_CLASS = 'min-w-0 flex-1 truncate'
