import type { PaletteEntry } from '../../../lib/components/Palette/templates'

export function filterPaletteEntries(entries: readonly PaletteEntry[], query: string): PaletteEntry[] {
  const lowered = query.trim().toLowerCase()
  if (!lowered) return [...entries]
  return entries.filter(
    (entry) =>
      entry.label.toLowerCase().includes(lowered) ||
      entry.template.tag.toLowerCase().includes(lowered) ||
      (entry.template.text ?? '').toLowerCase().includes(lowered) ||
      (entry.template.classes ?? []).some((className) => className.includes(lowered)),
  )
}
