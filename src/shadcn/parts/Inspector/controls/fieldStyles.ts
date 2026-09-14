import type { CSSProperties } from 'react'

export const FIELD_CLASS =
  'h-8 w-full min-w-0 rounded-md bg-muted/60 px-2 text-xs text-foreground tabular-nums outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50'

export const TRIGGER_CLASS =
  'group/trigger flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md bg-muted/60 px-2 text-left text-xs text-foreground tabular-nums outline-none transition-colors hover:bg-muted/80 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset data-popup-open:bg-background data-popup-open:ring-1 data-popup-open:ring-ring data-popup-open:ring-inset'

export const LABEL_CLASS =
  'flex h-8 min-w-0 items-center gap-1.5 pl-1 text-[11px] text-muted-foreground select-none'

const CHECKER =
  'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)'

export const CHECKER_STYLE: CSSProperties = {
  backgroundImage: CHECKER,
  backgroundSize: '6px 6px',
  backgroundPosition: '0 0, 3px 3px',
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : ''
}

export function pickSingle(next: string[], current: string): string {
  return next[0] ?? current
}
