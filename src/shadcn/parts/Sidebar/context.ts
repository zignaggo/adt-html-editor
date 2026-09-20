import { createContext, use } from 'react'
import invariant from 'tiny-invariant'

export type SidebarTab = 'layers' | 'palette'

export type SidebarContextValue = {
  tab: SidebarTab
  setTab: (tab: SidebarTab) => void
  paletteQuery: string
  setPaletteQuery: (query: string) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebarContext(): SidebarContextValue {
  const value = use(SidebarContext)
  invariant(value, '<HtmlEditor.Sidebar> parts must be rendered inside <HtmlEditor.Sidebar>')
  return value
}
