import { useState, type ReactNode } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { useLayersContext } from '../../../lib/components/Layers/context'
import { LayersProvider } from '../../../lib/components/Layers/LayersPanel'
import { useLayersSearch } from '../../../lib/components/Layers/useLayersSearch'
import { PALETTE_ENTRIES, type PaletteEntry } from '../../../lib/components/Palette/templates'
import { cn } from '../../lib/utils'
import { Badge } from '../../ui/badge'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../../ui/input-group'
import { ScrollArea } from '../../ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { LayersTree } from '../Layers/LayersParts'
import { PaletteGrid } from '../Palette/Palette'
import { SidebarContext, useSidebarContext, type SidebarTab } from './context'

export type SidebarProps = {
  className?: string
  defaultTab?: SidebarTab
  entries?: PaletteEntry[]
  children?: ReactNode
}

export function Sidebar({ className, defaultTab = 'layers', entries, children }: SidebarProps) {
  const [tab, setTab] = useState<SidebarTab>(defaultTab)
  const [paletteQuery, setPaletteQuery] = useState('')

  return (
    <LayersProvider>
      <SidebarContext value={{ tab, setTab, paletteQuery, setPaletteQuery }}>
        <Tabs
          value={tab}
          onValueChange={(next) => setTab(next as SidebarTab)}
          className={cn('flex min-h-0 flex-col gap-0 border-r border-border bg-background text-foreground', className)}
        >
          {children ?? (
            <>
              <SidebarSearch />
              <SidebarTabs />
              <SidebarLayers />
              <SidebarPalette entries={entries} />
            </>
          )}
        </Tabs>
      </SidebarContext>
    </LayersProvider>
  )
}

export type SidebarSearchProps = {
  className?: string
  layersPlaceholder?: string
  palettePlaceholder?: string
}

export function SidebarSearch({
  className,
  layersPlaceholder = 'Search elements…',
  palettePlaceholder = 'Search blocks…',
}: SidebarSearchProps) {
  const layers = useLayersSearch()
  const { tab, paletteQuery, setPaletteQuery } = useSidebarContext()
  const isLayers = tab === 'layers'
  const value = isLayers ? layers.value : paletteQuery
  const clear = isLayers ? layers.clear : () => setPaletteQuery('')

  return (
    <div className={cn('px-3 pt-3 pb-2', className)}>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={(element) => layers.registerInput(element)}
          type="search"
          aria-label={isLayers ? 'Search elements' : 'Search palette'}
          placeholder={isLayers ? layersPlaceholder : palettePlaceholder}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => (isLayers ? layers.setValue(event.target.value) : setPaletteQuery(event.target.value))}
          onKeyDown={(event) => {
            if (isLayers) {
              layers.onKeyDown(event)
              return
            }
            if (event.key === 'Escape' && paletteQuery) {
              event.preventDefault()
              setPaletteQuery('')
            }
          }}
        />
        {value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={clear}>
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </div>
  )
}

export function SidebarTabs({ className }: { className?: string }) {
  const { state } = useLayersContext()
  return (
    <div className={cn('px-3 pb-2', className)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="layers">
          Layers
          <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] tabular-nums">
            {state.matchCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="palette">Palette</TabsTrigger>
      </TabsList>
    </div>
  )
}

export function SidebarLayers({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <TabsContent value="layers" className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {children ?? <LayersTree />}
    </TabsContent>
  )
}

export function SidebarPalette({
  entries = PALETTE_ENTRIES,
  className,
  children,
}: {
  entries?: PaletteEntry[]
  className?: string
  children?: ReactNode
}) {
  const { paletteQuery } = useSidebarContext()
  return (
    <TabsContent value="palette" className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 pb-3">{children ?? <PaletteGrid entries={entries} query={paletteQuery} />}</div>
      </ScrollArea>
    </TabsContent>
  )
}
