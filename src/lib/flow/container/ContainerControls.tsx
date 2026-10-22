import { useEffect, useRef, useState } from 'react'
import { FlowIcon } from '../flowIcons'
import {
  DIALOG_ACTIONS_CLASS,
  DIALOG_BACKDROP_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_BUTTON_CLASS,
  DIALOG_CLASS,
  DIALOG_PRIMARY_CLASS,
  DIALOG_TITLE_CLASS,
  STATUS_BUTTON_CLASS,
} from '../flowStyles'
import type { FlowTarget } from '../useFlowSelection'
import { useElementContainer, type ElementContainer } from './useElementContainer'

export function ContainerControls({ target }: { target: FlowTarget }) {
  const container = useElementContainer(target)
  const [isOpen, setOpen] = useState(false)

  if (!container) return null

  return (
    <>
      <button
        type="button"
        className={STATUS_BUTTON_CLASS}
        aria-label="Wrap in container"
        title="Wrap in container"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setOpen(true)}
      >
        <FlowIcon name="container" />
        <span>Wrap in container</span>
      </button>
      {isOpen ? (
        <ContainerDialog
          key={target.id}
          container={container}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function ContainerDialog({
  container,
  onClose,
}: {
  container: ElementContainer
  onClose: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const { message } = container

  return (
    <div className={DIALOG_BACKDROP_CLASS} onPointerDown={onClose}>
      <dialog
        open
        className={DIALOG_CLASS}
        aria-modal="true"
        aria-label={message.title}
        onPointerDown={(event) => event.stopPropagation()}
        onCancel={onClose}
      >
        <span className={DIALOG_TITLE_CLASS}>{message.title}</span>
        <span className={DIALOG_BODY_CLASS}>{message.body}</span>
        <div className={DIALOG_ACTIONS_CLASS}>
          <button type="button" className={DIALOG_BUTTON_CLASS} onClick={onClose}>
            Cancel
          </button>
          {container.blocked === null ? (
            <button
              ref={confirmRef}
              type="button"
              className={DIALOG_PRIMARY_CLASS}
              onClick={() => {
                container.wrap()
                onClose()
              }}
            >
              Wrap in container
            </button>
          ) : (
            <button
              ref={confirmRef}
              type="button"
              className={DIALOG_PRIMARY_CLASS}
              onClick={() => {
                container.selectParent()
                onClose()
              }}
            >
              Select parent
            </button>
          )}
        </div>
      </dialog>
    </div>
  )
}
