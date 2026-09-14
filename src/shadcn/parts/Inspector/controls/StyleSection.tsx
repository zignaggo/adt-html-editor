import type { ReactNode } from 'react'
import { cn } from '../../../lib/utils'

export type StyleSectionProps = {
  title: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function StyleSection({ title, actions, children, className }: StyleSectionProps) {
  return (
    <section className={cn('flex flex-col border-b border-border py-2 last:border-b-0', className)}>
      <header className="flex h-8 items-center">
        <h3 className="flex-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{title}</h3>
        {actions ? <div className="flex items-center pl-2">{actions}</div> : null}
      </header>
      <div className="flex flex-col gap-3 pt-1 pb-1">{children}</div>
    </section>
  )
}
