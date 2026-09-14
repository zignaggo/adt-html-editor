import type { LucideIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '../../../ui/toggle-group'

export type IconOption = {
  value: string
  icon: LucideIcon
  label: string
}

export type IconToggleGroupProps = {
  value: string | string[]
  onChange: (next: string[]) => void
  items: readonly IconOption[]
  label: string
  multiple?: boolean
}

export function IconToggleGroup({ value, onChange, items, label, multiple = false }: IconToggleGroupProps) {
  return (
    <ToggleGroup
      value={Array.isArray(value) ? value : value ? [value] : []}
      onValueChange={(next) => onChange(next as string[])}
      multiple={multiple}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={label}
      className="flex-wrap"
    >
      {items.map(({ value: itemValue, icon: Icon, label: itemLabel }) => (
        <ToggleGroupItem key={itemValue} value={itemValue} aria-label={itemLabel} title={itemLabel}>
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
