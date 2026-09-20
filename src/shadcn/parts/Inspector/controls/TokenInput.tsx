import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import type { TokenChoice } from '../../../../lib/tailwind/classMaps/typography'
import { cn } from '../../../lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs'
import { TRIGGER_CLASS, formatNumber } from './fieldStyles'
import { NumericInput } from './NumericInput'

export type TokenInputProps = {
  value: number
  onChange: (next: number) => void
  tokens: readonly TokenChoice[]
  suffix?: string
  inputMode?: 'numeric' | 'decimal'
  renderPreview?: (token: TokenChoice) => ReactNode
  className?: string
  'aria-label'?: string
}

type Tab = 'custom' | 'variables'

function revealRow(element: HTMLButtonElement | null) {
  element?.scrollIntoView?.({ block: 'nearest' })
}

function moveFocus(event: KeyboardEvent<HTMLButtonElement>) {
  const current = event.currentTarget
  let target: Element | null | undefined
  if (event.key === 'ArrowDown') target = current.nextElementSibling
  else if (event.key === 'ArrowUp') target = current.previousElementSibling
  else if (event.key === 'Home') target = current.parentElement?.firstElementChild
  else if (event.key === 'End') target = current.parentElement?.lastElementChild
  else return
  event.preventDefault()
  if (target instanceof HTMLElement) target.focus()
}

export function TokenInput({
  value,
  onChange,
  tokens,
  suffix,
  inputMode = 'numeric',
  renderPreview,
  className,
  'aria-label': ariaLabel,
}: TokenInputProps) {
  const matched = tokens.find((token) => token.value === value)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(matched ? 'variables' : 'custom')
  const shown = formatNumber(value) || '—'

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setTab(matched ? 'variables' : 'custom')
      }}
    >
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(TRIGGER_CLASS, className)}
      >
        <span className="min-w-0 flex-1 truncate">
          {matched ? (
            <>
              <span>{matched.label}</span>
              <span className="ml-1.5 text-[11px] text-muted-foreground">
                {shown}
                {suffix}
              </span>
            </>
          ) : (
            <>
              {shown}
              <span className="text-[11px] text-muted-foreground">{suffix}</span>
            </>
          )}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover/trigger:text-foreground/70" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 gap-0 overflow-hidden p-0">
        <Tabs value={tab} onValueChange={(next) => setTab(next as Tab)} className="gap-0">
          <div className="px-2.5 pt-2.5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="custom" className="text-[11px]">
                Custom
              </TabsTrigger>
              <TabsTrigger value="variables" className="text-[11px]">
                Variables
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="custom" className="p-2.5">
            <NumericInput
              value={value}
              onCommit={onChange}
              suffix={suffix}
              inputMode={inputMode}
              aria-label={ariaLabel ? `${ariaLabel} value` : 'Value'}
              className="h-10 px-3 text-sm font-medium"
            />
          </TabsContent>
          <TabsContent value="variables" className="px-1.5 pt-2 pb-2">
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto py-0.5" role="listbox" aria-label={ariaLabel}>
              {tokens.map((token) => {
                const active = token.value === value
                return (
                  <button
                    key={token.label}
                    ref={active ? revealRow : undefined}
                    type="button"
                    role="option"
                    aria-selected={active}
                    title={`${token.label} · ${token.value}${suffix ?? ''}`}
                    onClick={() => {
                      onChange(token.value)
                      setOpen(false)
                    }}
                    onKeyDown={moveFocus}
                    className={cn(
                      'flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset',
                      active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    {renderPreview ? (
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center overflow-hidden leading-none"
                      >
                        {renderPreview(token)}
                      </span>
                    ) : null}
                    <span className="flex-1 text-left text-[13px] font-medium leading-none">{token.label}</span>
                    <span
                      className={cn(
                        'text-[11px] leading-none tabular-nums',
                        active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                      )}
                    >
                      {token.value}
                      {suffix}
                    </span>
                    <CheckIcon
                      aria-hidden="true"
                      className={cn('size-3.5 shrink-0 transition-opacity', active ? 'opacity-100' : 'opacity-0')}
                    />
                  </button>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
