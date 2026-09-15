import { createElement } from 'react'
import { CopyIcon, CornerLeftUpIcon, LockIcon, LockOpenIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useSelectionSummary } from '../../../lib/components/Inspector/useSelectionSummary'
import type { NodeId } from '../../../lib/core/ids'
import { labelOf, type AnyNode } from '../../../lib/core/model'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { elementIconFor } from './elementIcon'

const MAX_ICONS = 3

export function MultiSelectedHeader({ ids }: { ids: readonly NodeId[] }) {
  const summary = useSelectionSummary(ids)
  if (!summary) return null

  const icons = summary.nodes.slice(0, MAX_ICONS)
  const remaining = summary.count - icons.length
  const meta = summary.tags
    .map((entry) => (entry.count > 1 ? `${entry.tag} ×${entry.count}` : entry.tag))
    .join(' · ')

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="flex shrink-0 items-center">
          {icons.map((node, index) => (
            <span
              key={summary.ids[index]}
              className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground ring-2 ring-background not-first:-ml-3"
            >
              {createElement(elementIconFor(node), { className: 'size-4' })}
            </span>
          ))}
          {remaining > 0 ? (
            <span className="flex size-7 items-center justify-center rounded-md bg-muted font-mono text-[10px] text-muted-foreground ring-2 ring-background -ml-3">
              +{remaining}
            </span>
          ) : null}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-mono text-sm font-semibold">{summary.count} elements</div>
          <div className="truncate text-[11px] text-muted-foreground">{meta}</div>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Duplicate ${summary.count} elements`}
                className="text-muted-foreground"
                onClick={summary.duplicate}
              />
            }
          >
            <CopyIcon />
          </TooltipTrigger>
          <TooltipContent>Duplicate</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${summary.allLocked ? 'Unlock' : 'Lock'} ${summary.count} elements`}
                aria-pressed={summary.allLocked}
                className={summary.allLocked ? 'text-foreground' : 'text-muted-foreground'}
                onClick={() => summary.setLocked(!summary.allLocked)}
              />
            }
          >
            {summary.allLocked ? <LockIcon /> : <LockOpenIcon />}
          </TooltipTrigger>
          <TooltipContent>{summary.allLocked ? 'Unlock position' : 'Lock position'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Select parent"
                className="text-muted-foreground"
                disabled={!summary.commonParentId}
                onClick={summary.selectParent}
              />
            }
          >
            <CornerLeftUpIcon />
          </TooltipTrigger>
          <TooltipContent>Select parent</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete ${summary.count} elements`}
                className="text-destructive"
                onClick={summary.remove}
              />
            }
          >
            <Trash2Icon />
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Clear selection"
                className="text-muted-foreground"
                onClick={summary.clear}
              />
            }
          >
            <XIcon />
          </TooltipTrigger>
          <TooltipContent>Clear selection</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-wrap gap-1">
        {summary.ids.map((id, index) => (
          <SelectionChip
            key={id}
            node={summary.nodes[index]}
            onSelect={() => summary.selectOnly(id)}
            onDeselect={() => summary.deselect(id)}
          />
        ))}
      </div>
    </div>
  )
}

function SelectionChip({
  node,
  onSelect,
  onDeselect,
}: {
  node: AnyNode
  onSelect: () => void
  onDeselect: () => void
}) {
  const label = labelOf(node)
  const attrId = node.kind === 'element' || node.kind === 'opaque' ? node.attrs.id : undefined
  return (
    <Badge variant="secondary" className="gap-1 pr-0.5 font-mono">
      <button type="button" className="truncate" onClick={onSelect}>
        {label}
        {attrId ? <span className="text-muted-foreground">#{attrId}</span> : null}
      </button>
      <button
        type="button"
        aria-label={`Deselect ${label}`}
        className="flex size-3.5 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground"
        onClick={onDeselect}
      >
        <XIcon className="size-3" />
      </button>
    </Badge>
  )
}
