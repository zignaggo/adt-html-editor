export const PANEL_CLASS = 'flex min-h-0 flex-col border-l border-border bg-muted'

export const HEADER_CLASS =
  'flex items-center justify-between gap-2 border-b border-border px-3 py-2'

export const TITLE_CLASS = 'font-mono text-xs text-foreground'

export const COUNT_CLASS =
  'min-w-5 rounded-sm bg-accent px-1.5 py-px text-center text-2xs text-muted-foreground tabular-nums'

export const HEADER_ACTIONS_CLASS = 'flex items-center gap-1'

export const HEADER_BUTTON_CLASS =
  'min-h-6 cursor-default rounded-sm border-0 bg-card px-1.5 font-mono text-2xs text-muted-foreground ' +
  'ring-1 ring-border ring-inset hover:not-disabled:text-foreground disabled:opacity-50'

export const EMPTY_CLASS = 'm-3 text-2xs text-pretty text-muted-foreground/70'

export const HINT_CLASS = 'mt-1.5 mb-0 text-2xs text-pretty text-muted-foreground/70'

export const VARIANT_BAR_CLASS = 'flex flex-wrap gap-0.5 border-b border-border px-2 py-1.5'

export const VARIANT_BREAKPOINT_CLASS =
  'mr-1 inline-flex min-h-6 items-center rounded-sm bg-muted px-1.5 text-2xs text-muted-foreground'

export const VARIANT_BUTTON_CLASS =
  'min-h-6 cursor-default rounded-sm border-0 bg-transparent px-1.5 font-mono text-2xs text-muted-foreground/70 ' +
  'transition-[color,background-color,scale] duration-100 ease-out hover:bg-accent hover:text-foreground ' +
  'active:scale-95 data-active:bg-primary data-active:text-primary-foreground'

export const SCROLL_CLASS = 'min-h-0 flex-1 overflow-auto overscroll-contain pb-4 [scrollbar-width:thin] ' +
  '[scrollbar-color:var(--scrollbar-thumb)_transparent]'

export const SECTION_CLASS = 'border-b border-border px-3 py-2'

export const SECTION_TITLE_CLASS =
  'mt-0 mb-1.5 text-2xs font-semibold tracking-[0.04em] text-muted-foreground uppercase'

export const ACCORDION_BUTTON_CLASS =
  'flex min-h-7 w-full cursor-default items-center justify-between border-0 bg-transparent p-0 ' +
  'font-[inherit] text-xs font-medium text-foreground transition-colors duration-100 ease-out hover:text-primary'

export const ACCORDION_CHEVRON_CLASS =
  '-rotate-90 text-muted-foreground/70 transition-[rotate] duration-200 ease-out data-open:rotate-0'

export const ACCORDION_BODY_CLASS = 'flex flex-col gap-2 pt-2 [&[hidden]]:hidden'

export const CONTROL_CLASS = 'flex flex-col gap-1'

export const CONTROL_LABEL_CLASS =
  'flex items-center justify-between gap-1.5 text-2xs text-muted-foreground'

export const CONTROL_OPTIONS_CLASS = 'flex flex-wrap gap-0.5'

export const OPTION_BUTTON_CLASS =
  'min-h-6 cursor-default rounded-sm border-0 bg-card px-1.5 font-mono text-2xs text-muted-foreground tabular-nums ' +
  'ring-1 ring-border transition-[color,background-color,box-shadow,scale] duration-100 ease-out ring-inset ' +
  'hover:text-foreground active:scale-95 ' +
  'data-active:bg-primary data-active:text-primary-foreground data-active:ring-0'

export const CLEAR_BUTTON_CLASS =
  'cursor-default border-0 bg-transparent p-0 font-[inherit] text-2xs text-muted-foreground/70 underline hover:text-destructive'

export const SWATCHES_CLASS = 'grid grid-cols-10 gap-1'

export const SWATCH_CLASS =
  'grid aspect-square cursor-default place-items-center rounded-sm border-0 bg-transparent p-0.5 ' +
  'ring-1 ring-border transition-[box-shadow,scale] duration-100 ease-out ring-inset ' +
  'active:scale-95 data-active:ring-2 data-active:ring-primary ' +
  '[&>span]:size-full [&>span]:rounded-sm [&>span]:outline [&>span]:-outline-offset-1 ' +
  '[&>span]:outline-black/10 dark:[&>span]:outline-white/10'

export const CHIPS_CLASS = 'mt-1.5 mb-0 flex list-none flex-col gap-0.5 p-0'

export const CHIP_CLASS =
  'flex min-h-[26px] items-center justify-between gap-1.5 rounded-sm bg-card pr-1 pl-1.5 ring-1 ring-border ring-inset'

export const CHIP_LABEL_CLASS =
  'overflow-hidden font-mono text-2xs text-ellipsis whitespace-nowrap text-foreground'

export const CHIP_ACTIONS_CLASS = 'flex flex-none gap-px'

export const CHIP_BUTTON_CLASS =
  'grid size-[22px] cursor-default place-items-center rounded-sm border-0 bg-transparent p-0 font-[inherit] ' +
  'text-xs leading-none text-muted-foreground/70 transition-[color,background-color,scale] duration-100 ease-out ' +
  'hover:not-disabled:bg-accent hover:not-disabled:text-foreground active:not-disabled:scale-95 ' +
  'disabled:opacity-30 data-danger:hover:text-destructive'

export const COMBOBOX_CLASS = 'relative'

export const INPUT_CLASS =
  'min-h-[26px] w-full rounded-sm border-0 bg-card px-1.5 py-1 font-mono text-2xs text-foreground ' +
  'ring-1 ring-border transition-shadow duration-100 ease-out ring-inset hover:ring-foreground/25'

export const INLINE_INPUT_CLASS = `${INPUT_CLASS} w-18 min-w-0`

export const TEXTAREA_CLASS = `${INPUT_CLASS} resize-y font-sans`

export const SUGGESTIONS_CLASS =
  'absolute top-[calc(100%+4px)] right-0 left-0 z-20 m-0 max-h-[220px] list-none overflow-auto ' +
  'overscroll-contain rounded-md bg-card p-1 shadow-lg'

export const SUGGESTION_CLASS =
  'block min-h-6 w-full cursor-default rounded-sm border-0 bg-transparent px-1.5 text-start font-mono text-2xs ' +
  'text-muted-foreground transition-[color,background-color] duration-100 ease-out ' +
  'data-active:bg-primary/10 data-active:text-foreground'

export const FIELDS_CLASS = 'flex flex-col gap-1.5'

export const FIELD_CLASS = 'grid grid-cols-[68px_minmax(0,1fr)] items-center gap-1.5'

export const FIELD_LABEL_CLASS = 'font-mono text-2xs text-muted-foreground'

export const NEW_ATTRIBUTE_CLASS =
  'mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1'

export const ADD_BUTTON_CLASS =
  'min-h-[26px] cursor-default rounded-sm border-0 bg-primary px-2 font-[inherit] text-2xs font-medium ' +
  'text-primary-foreground transition-[background-color,scale] duration-100 ease-out hover:bg-primary/90 active:scale-95'
