import { Fragment, createElement } from 'react'
import { CornerLeftUpIcon, LockIcon, LockOpenIcon } from 'lucide-react'
import { useInspectorContext } from '../../../lib/components/Inspector/context'
import { useNodeSummary, type NodeSummary } from '../../../lib/components/Inspector/useNodeSummary'
import type { NodeId } from '../../../lib/core/ids'
import { cn } from '../../lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../ui/breadcrumb'
import { Button } from '../../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { elementIconFor, kindLabelFor } from './elementIcon'
import { TagPicker } from './TagPicker'

export type TagInspectorHeaderProps = {
  className?: string
}

export function TagInspectorHeader({ className }: TagInspectorHeaderProps) {
  const { selectedId, selectedIds } = useInspectorContext()
  if (!selectedId || selectedIds.length > 1) return null
  return <TagHeaderBody id={selectedId} className={className} />
}

function TagHeaderBody({ id, className }: { id: NodeId; className?: string }) {
  const summary = useNodeSummary(id)
  if (!summary) return null

  const meta = [kindLabelFor(summary.node)]
  if (summary.classCount > 0) {
    meta.push(`${summary.classCount} ${summary.classCount === 1 ? 'class' : 'classes'}`)
  }
  if (summary.childCount > 0) {
    meta.push(`${summary.childCount} ${summary.childCount === 1 ? 'child' : 'children'}`)
  }

  return (
    <div className={cn('flex flex-col gap-1.5 py-2', className)}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        >
          {createElement(elementIconFor(summary.node), { className: 'size-4' })}
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <div className="flex min-w-0 items-center gap-1">
            <TagPicker id={id} />
            {summary.attrId ? (
              <span className="truncate font-mono text-xs text-muted-foreground">
                #{summary.attrId}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{meta.join(' · ')}</div>
        </div>
        <TagHeaderActions summary={summary} />
      </div>
      <TagHeaderCrumbs summary={summary} />
      {summary.textPreview ? (
        <p className="truncate text-xs text-muted-foreground italic" title={summary.textPreview}>
          “{summary.textPreview}”
        </p>
      ) : null}
    </div>
  )
}

function TagHeaderActions({ summary }: { summary: NodeSummary }) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={summary.isLocked ? 'Unlock element' : 'Lock element'}
              aria-pressed={summary.isLocked}
              className={summary.isLocked ? 'text-foreground' : 'text-muted-foreground'}
              onClick={() => summary.setLocked(!summary.isLocked)}
            />
          }
        >
          {summary.isLocked ? <LockIcon /> : <LockOpenIcon />}
        </TooltipTrigger>
        <TooltipContent>{summary.isLocked ? 'Unlock position' : 'Lock position'}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Select parent"
              className="text-muted-foreground"
              disabled={!summary.parentId}
              onClick={summary.selectParent}
            />
          }
        >
          <CornerLeftUpIcon />
        </TooltipTrigger>
        <TooltipContent>Select parent</TooltipContent>
      </Tooltip>
    </>
  )
}

function TagHeaderCrumbs({ summary }: { summary: NodeSummary }) {
  if (summary.ancestors.length === 0) return null
  return (
    <Breadcrumb aria-label="Ancestors">
      <BreadcrumbList className="flex-nowrap gap-0.5 overflow-hidden text-[11px] sm:gap-0.5">
        {summary.ancestors.map((crumb) => (
          <Fragment key={crumb.id}>
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink
                render={<button type="button" />}
                className="truncate font-mono"
                onClick={() => summary.select(crumb.id)}
              >
                {crumb.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="[&>svg]:size-3" />
          </Fragment>
        ))}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate font-mono">{summary.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
