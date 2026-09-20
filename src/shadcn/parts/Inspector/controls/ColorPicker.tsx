import { useState } from 'react'
import { CheckIcon, SearchIcon } from 'lucide-react'
import {
  KEYWORD_COLORS,
  PALETTE_FAMILIES,
  hexFromToken,
  tokenFromHex,
  type PaletteFamily,
} from '../../../../lib/tailwind/palette'
import { cn } from '../../../lib/utils'
import { Button } from '../../../ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../../ui/input-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs'
import { isHex6, isLight, normalizeHex, resolveHex } from './colorValue'
import { CHECKER_STYLE, FIELD_CLASS } from './fieldStyles'
import { useDraft } from './useDraft'

export type ColorPickerBodyProps = {
  value: string
  onChange: (next: string) => void
}

type Tab = 'custom' | 'variables'

export function ColorPickerBody({ value, onChange }: ColorPickerBodyProps) {
  const [tab, setTab] = useState<Tab>(() => (hexFromToken(value) || !value ? 'variables' : 'custom'))
  return (
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
        <CustomPanel value={value} onChange={onChange} />
      </TabsContent>
      <TabsContent value="variables" className="pt-2">
        <VariablesPanel value={value} onChange={onChange} />
      </TabsContent>
    </Tabs>
  )
}

function CustomPanel({ value, onChange }: ColorPickerBodyProps) {
  const resolved = resolveHex(value)
  const hex = resolved && isHex6(resolved) ? resolved : resolved && resolved.length === 9 ? resolved.slice(0, 7) : '#000000'
  const swatch = useDraft({
    value: hex,
    commit: (raw) => {
      if (raw !== hex) onChange(raw)
    },
  })
  const text = useDraft({
    value: resolved ?? '',
    commit: (raw) => {
      const next = normalizeHex(raw)
      if (next && next !== resolved) onChange(next)
    },
  })

  return (
    <div className="flex flex-col gap-2">
      <input
        type="color"
        aria-label="Pick a colour"
        value={swatch.shown}
        onFocus={swatch.onFocus}
        onBlur={swatch.onBlur}
        onChange={(event) => swatch.onChange(event.target.value)}
        className="h-24 w-full cursor-pointer rounded-md border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
      />
      <input
        type="text"
        aria-label="Hex colour"
        placeholder="#000000"
        autoComplete="off"
        spellCheck={false}
        value={text.shown}
        onFocus={text.onFocus}
        onBlur={text.onBlur}
        onChange={(event) => text.onChange(event.target.value)}
        onKeyDown={text.onKeyDown}
        className={cn(FIELD_CLASS, 'font-mono')}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="sm" onClick={() => onChange('transparent')}>
          <span className="size-3.5 rounded-sm ring-1 ring-border ring-inset" style={CHECKER_STYLE} />
          Transparent
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange('')}>
          No colour
        </Button>
      </div>
    </div>
  )
}

function filterFamilies(families: readonly PaletteFamily[], query: string): PaletteFamily[] {
  if (!query) return [...families]
  const out: PaletteFamily[] = []
  for (const family of families) {
    const shades = family.shades.filter(
      (shade) => shade.name.includes(query) || shade.hex.toLowerCase().includes(query),
    )
    if (shades.length > 0) out.push({ name: family.name, shades })
  }
  return out
}

function VariablesPanel({ value, onChange }: ColorPickerBodyProps) {
  const [query, setQuery] = useState('')
  const lowered = query.trim().toLowerCase()
  const families = filterFamilies(PALETTE_FAMILIES, lowered)
  const keywords = lowered ? KEYWORD_COLORS.filter((keyword) => keyword.name.includes(lowered)) : KEYWORD_COLORS
  const matchedName = value ? tokenFromHex(value) : null
  const isActive = (name: string, hex: string) =>
    value === name || matchedName === name || (value !== '' && value.toLowerCase() === hex.toLowerCase())

  return (
    <div className="flex flex-col">
      <div className="px-2.5 pb-2">
        <InputGroup className="h-7">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Search colours"
            placeholder="Search colours"
            autoComplete="off"
            value={query}
            className="text-xs"
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
      </div>
      <div className="max-h-60 overflow-y-auto px-2.5 pb-2.5">
        {keywords.length > 0 ? (
          <div className="mb-2.5">
            <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Theme</p>
            <div className="grid grid-cols-6 gap-1">
              {keywords.map((keyword) => (
                <SwatchTile
                  key={keyword.name}
                  hex={keyword.hex}
                  label={keyword.name}
                  active={isActive(keyword.name, keyword.hex)}
                  onClick={() => onChange(keyword.name)}
                />
              ))}
            </div>
          </div>
        ) : null}
        {families.length === 0 && keywords.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No colours found</p>
        ) : null}
        {families.map((family) => (
          <div key={family.name} className="mb-2">
            <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground capitalize">{family.name}</p>
            <div className="grid grid-cols-11 gap-1">
              {family.shades.map((shade) => (
                <SwatchTile
                  key={shade.name}
                  hex={shade.hex}
                  label={shade.name}
                  active={isActive(shade.name, shade.hex)}
                  compact
                  onClick={() => onChange(shade.name)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SwatchTile({
  hex,
  label,
  active,
  compact = false,
  onClick,
}: {
  hex: string
  label: string
  active: boolean
  compact?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'relative aspect-square cursor-pointer overflow-hidden rounded-sm ring-1 ring-border/80 transition-transform ring-inset outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'scale-105' : 'hover:ring-foreground/30',
        compact ? 'min-h-5' : 'min-h-7',
      )}
      style={hex === 'transparent' ? CHECKER_STYLE : { backgroundColor: hex }}
    >
      {active ? (
        <CheckIcon
          strokeWidth={4}
          className={cn(
            'absolute inset-0 m-auto drop-shadow-sm',
            compact ? 'size-3' : 'size-3.5',
            isLight(hex) ? 'text-foreground' : 'text-white',
          )}
        />
      ) : null}
    </button>
  )
}
