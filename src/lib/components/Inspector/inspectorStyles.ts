const CONTROL_BASE =
  'inline-flex cursor-default items-center justify-center gap-1 rounded-md border border-transparent ' +
  'bg-transparent font-[inherit] font-medium whitespace-nowrap transition-all ' +
  'disabled:pointer-events-none disabled:opacity-50'

const FIELD_BASE =
  'w-full min-w-0 rounded-lg border border-input bg-transparent text-foreground transition-colors ' +
  'placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30'

export const PANEL_CLASS = 'flex min-h-0 flex-col border-l border-border bg-background'

export const HEADER_CLASS =
  'flex items-center justify-between gap-2 border-b border-border px-3 py-2'

export const TITLE_CLASS = 'font-mono text-sm text-foreground'

export const COUNT_CLASS =
  'inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-xs text-muted-foreground tabular-nums'

export const HEADER_ACTIONS_CLASS = 'flex items-center gap-1'

export const HEADER_BUTTON_CLASS =
  `${CONTROL_BASE} h-6 border-border bg-background px-2 text-xs text-muted-foreground ` +
  'hover:not-disabled:bg-muted hover:not-disabled:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50'

export const EMPTY_CLASS = 'm-3 text-xs text-pretty text-muted-foreground'

export const HINT_CLASS = 'mt-1.5 mb-0 text-xs text-pretty text-muted-foreground'

export const VARIANT_BAR_CLASS = 'flex flex-wrap items-center gap-1 border-b border-border px-3 py-2'

export const VARIANT_BREAKPOINT_CLASS =
  'mr-1 inline-flex h-6 items-center rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground'

export const VARIANT_BUTTON_CLASS =
  `${CONTROL_BASE} h-6 px-2 text-xs text-muted-foreground ` +
  'hover:bg-muted hover:text-foreground active:not-disabled:translate-y-px ' +
  'data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary/80'

export const SCROLL_CLASS =
  'min-h-0 flex-1 overflow-auto overscroll-contain pb-4 [scrollbar-width:thin] ' +
  '[scrollbar-color:var(--scrollbar-thumb)_transparent]'

export const SECTION_CLASS = 'border-b border-border px-3 py-2.5'

export const SECTION_TITLE_CLASS =
  'mt-0 mb-2 text-xs font-medium tracking-normal text-muted-foreground'

export const ACCORDION_BUTTON_CLASS =
  'flex h-8 w-full cursor-default items-center justify-between border-0 bg-transparent p-0 ' +
  'font-[inherit] text-sm font-medium text-foreground transition-colors hover:text-foreground/80'

export const ACCORDION_CHEVRON_CLASS =
  '-rotate-90 text-muted-foreground transition-[rotate] duration-200 ease-out data-open:rotate-0'

export const ACCORDION_BODY_CLASS = 'flex flex-col gap-2.5 pt-2 [&[hidden]]:hidden'

export const CONTROL_CLASS = 'flex flex-col gap-1.5'

export const CONTROL_LABEL_CLASS =
  'flex items-center justify-between gap-1.5 text-xs font-medium text-muted-foreground'

export const CONTROL_OPTIONS_CLASS = 'flex flex-wrap gap-1'

export const OPTION_BUTTON_CLASS =
  `${CONTROL_BASE} h-6 border-border bg-background px-2 text-xs text-muted-foreground tabular-nums ` +
  'hover:not-disabled:bg-muted hover:not-disabled:text-foreground active:not-disabled:translate-y-px ' +
  'dark:border-input dark:bg-input/30 dark:hover:bg-input/50 ' +
  'data-active:border-transparent data-active:bg-primary data-active:text-primary-foreground ' +
  'data-active:hover:bg-primary/80 dark:data-active:border-transparent dark:data-active:bg-primary'

export const CLEAR_BUTTON_CLASS =
  'cursor-default border-0 bg-transparent p-0 font-[inherit] text-xs text-muted-foreground underline underline-offset-4 hover:text-destructive'

export const SWATCHES_CLASS = 'grid grid-cols-10 gap-1'

export const SWATCH_CLASS =
  'grid aspect-square cursor-default place-items-center rounded-md border border-border bg-transparent p-0.5 ' +
  'transition-all active:translate-y-px data-active:border-primary data-active:ring-3 data-active:ring-ring/50 ' +
  '[&>span]:size-full [&>span]:rounded-sm [&>span]:outline [&>span]:-outline-offset-1 ' +
  '[&>span]:outline-black/10 dark:[&>span]:outline-white/10'

export const CHIPS_CLASS = 'mt-2 mb-0 flex list-none flex-col gap-1 p-0'

export const CHIP_CLASS =
  'flex h-7 items-center justify-between gap-1.5 rounded-lg border border-border bg-background pr-1 pl-2 dark:border-input dark:bg-input/30'

export const CHIP_LABEL_CLASS =
  'overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap text-foreground'

export const CHIP_ACTIONS_CLASS = 'flex flex-none gap-px'

export const CHIP_BUTTON_CLASS =
  `${CONTROL_BASE} size-5 rounded-[min(var(--radius-md),10px)] p-0 text-xs leading-none text-muted-foreground ` +
  'hover:not-disabled:bg-muted hover:not-disabled:text-foreground active:not-disabled:translate-y-px ' +
  'data-danger:hover:not-disabled:text-destructive'

export const COMBOBOX_CLASS = 'relative'

export const INPUT_CLASS =
  `${FIELD_BASE} h-8 px-2.5 py-1 font-mono text-xs ` +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export const INLINE_INPUT_CLASS = `${INPUT_CLASS} w-20`

export const TEXTAREA_CLASS = `${INPUT_CLASS} h-auto resize-y font-sans text-sm`

export const SUGGESTIONS_CLASS =
  'absolute top-[calc(100%+4px)] right-0 left-0 z-20 m-0 max-h-[220px] list-none overflow-auto ' +
  'overscroll-contain rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md'

export const SUGGESTION_CLASS =
  'block h-7 w-full cursor-default rounded-md border-0 bg-transparent px-2 text-start font-mono text-xs ' +
  'text-muted-foreground transition-colors data-active:bg-muted data-active:text-foreground'

export const FIELDS_CLASS = 'flex flex-col gap-2'

export const FIELD_CLASS = 'grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2'

export const FIELD_LABEL_CLASS = 'font-mono text-xs text-muted-foreground'

export const NEW_ATTRIBUTE_CLASS =
  'mt-1.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5'

export const ADD_BUTTON_CLASS =
  `${CONTROL_BASE} h-8 bg-primary px-2.5 text-xs text-primary-foreground hover:bg-primary/80 active:translate-y-px`
