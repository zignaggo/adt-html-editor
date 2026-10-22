import { useState } from 'react'
import { BoxSelectIcon } from 'lucide-react'
import { useElementContainer } from '../../../lib/flow/container/useElementContainer'
import type { FlowTarget } from '../../../lib/flow/useFlowSelection'
import { cn } from '../../lib/utils'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'

export type WrapInContainerProps = {
  target: FlowTarget
  className?: string
}

export function WrapInContainer({ target, className }: WrapInContainerProps) {
  const container = useElementContainer(target)
  const [open, setOpen] = useState(false)

  if (!container) return null

  const { message } = container

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Wrap in container"
        aria-haspopup="dialog"
        className={cn('h-6 gap-1 px-1.5 text-xs', className)}
        onClick={() => setOpen(true)}
      >
        <BoxSelectIcon className="size-3.5" />
        Wrap in container
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-label={message.title}>
          <DialogHeader>
            <DialogTitle>{message.title}</DialogTitle>
            <DialogDescription>{message.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {container.blocked === null ? (
              <Button
                onClick={() => {
                  container.wrap()
                  setOpen(false)
                }}
              >
                Wrap in container
              </Button>
            ) : (
              <Button
                onClick={() => {
                  container.selectParent()
                  setOpen(false)
                }}
              >
                Select parent
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
