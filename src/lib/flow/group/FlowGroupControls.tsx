import { useEffect, useRef } from 'react'
import { GROUP_FRAME_CLASS, GROUP_MEMBER_CLASS, OVERLAY_CLASS } from '../flowStyles'
import type { FlowBox } from '../useFlowSelection'
import { useFlowGroup, type FlowGroup } from './useFlowGroup'

function place(box: HTMLElement, rect: FlowBox) {
  box.dataset.visible = 'true'
  box.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
  box.style.width = `${rect.width}px`
  box.style.height = `${rect.height}px`
}

export function FlowGroupControls() {
  const group = useFlowGroup()
  if (!group) return null
  return <FlowGroupFrame group={group} />
}

function FlowGroupFrame({ group }: { group: FlowGroup }) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const membersRef = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    let frame = 0

    const sync = () => {
      frame = 0
      const outline = frameRef.current
      if (!outline) return
      const geometry = group.measure()
      if (!geometry) {
        outline.dataset.visible = 'false'
        for (const member of membersRef.current) {
          if (member) member.dataset.visible = 'false'
        }
        return
      }

      place(outline, geometry.box)
      geometry.boxes.forEach((box, index) => {
        const member = membersRef.current[index]
        if (member) place(member, box)
      })
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync)
    }

    const unsubscribeHost = group.host.subscribe(schedule)
    const root = group.host.root()
    const mutations = new MutationObserver(schedule)
    if (root) {
      mutations.observe(root, { attributes: true, childList: true, subtree: true, characterData: true })
    }
    sync()

    return () => {
      cancelAnimationFrame(frame)
      unsubscribeHost()
      mutations.disconnect()
    }
  }, [group])

  return (
    <div className={OVERLAY_CLASS}>
      <div
        ref={frameRef}
        className={GROUP_FRAME_CLASS}
        data-outline="group"
        data-visible="false"
        aria-hidden="true"
      />
      {group.ids.map((id, index) => (
        <div
          key={id}
          ref={(node) => {
            membersRef.current[index] = node
          }}
          className={GROUP_MEMBER_CLASS}
          data-outline="group-member"
          data-visible="false"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
