export const MENU_CLASS =
  'fixed top-0 left-0 z-[70] m-0 flex min-w-44 flex-col gap-px rounded-lg border border-border ' +
  'bg-popover p-1 font-sans text-sm text-popover-foreground shadow-md'

export const ITEM_CLASS =
  'flex w-full cursor-default appearance-none items-center rounded-md border-0 bg-transparent ' +
  '[&>svg]:shrink-0 [&>svg:not([class*="size-"])]:size-4 ' +
  'gap-2 px-2 py-1.5 text-left font-[inherit] text-sm leading-5 text-foreground transition-colors ' +
  'hover:not-disabled:bg-muted focus-visible:bg-muted focus-visible:outline-none ' +
  'disabled:pointer-events-none disabled:opacity-50'

export const SEPARATOR_CLASS = '-mx-1 my-1 h-px shrink-0 bg-border'
