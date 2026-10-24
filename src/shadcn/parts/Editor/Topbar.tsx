import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { HistoryGroup } from './HistoryParts'

export type TopbarProps = {
  className?: string
  title?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export function Topbar({ className, title, actions, children }: TopbarProps) {
  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3',
        className,
      )}
    >
      {children ?? (
        <>
          <TopbarStart>
            <HistoryGroup />
          </TopbarStart>
          <TopbarTitle>{title}</TopbarTitle>
          <TopbarEnd>{actions}</TopbarEnd>
        </>
      )}
    </header>
  )
}

export type TopbarSlotProps = {
  className?: string
  children?: ReactNode
}

export function TopbarStart({ className, children }: TopbarSlotProps) {
  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-1', className)}>{children}</div>
  )
}

export function TopbarTitle({ className, children }: TopbarSlotProps) {
  if (!children) return null
  return (
    <div
      className={cn(
        'flex min-w-0 shrink items-center justify-center gap-2 text-sm font-medium',
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </div>
  )
}

export function TopbarEnd({ className, children }: TopbarSlotProps) {
  return (
    <div className={cn('flex min-w-0 flex-1 items-center justify-end gap-2', className)}>
      {children}
    </div>
  )
}
