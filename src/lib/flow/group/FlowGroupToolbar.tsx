import { useEffect, useRef, type ReactNode } from 'react'
import { FlowIcon, type FlowIconName } from '../flowIcons'
import {
  GROUP_COUNT_CLASS,
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_CLASS,
  TOOLBAR_GROUP_CLASS,
  TOOLBAR_OVERLAY_CLASS,
  TOOLBAR_SEPARATOR_CLASS,
} from '../flowStyles'
import { useFlowGroup, type FlowGroup } from './useFlowGroup'
import { useGroupLayout, type GroupActionId, type GroupMenu } from './useGroupLayout'

const GAP = 8

const ACTION_ICONS: Record<GroupActionId, FlowIconName> = {
  'row-centres': 'rowCentres',
  'row-tops': 'rowTops',
  'row-bottoms': 'rowBottoms',
  'wrap-left': 'wrapLeft',
  'wrap-right': 'wrapRight',
  'equal-columns': 'columns',
  stack: 'stack',
}

const ROW_IDS: ReadonlySet<GroupActionId> = new Set(['row-centres', 'row-tops', 'row-bottoms'])

const WRAP_IDS: ReadonlySet<GroupActionId> = new Set(['wrap-left', 'wrap-right'])

const GRID_IDS: ReadonlySet<GroupActionId> = new Set(['equal-columns', 'stack'])

export function FlowGroupToolbar() {
  const group = useFlowGroup()
  const menu = useGroupLayout(group)
  if (!group || !menu) return null
  return <FlowGroupBar group={group} menu={menu} />
}

function FlowGroupBar({ group, menu }: { group: FlowGroup; menu: GroupMenu }) {
  const barRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let frame = 0

    const sync = () => {
      frame = 0
      const bar = barRef.current
      if (!bar) return
      const geometry = group.measure()
      if (!geometry) {
        bar.dataset.visible = 'false'
        return
      }

      bar.dataset.visible = 'true'
      bar.style.maxWidth = `${Math.max(0, geometry.hostWidth - GAP * 2)}px`
      const { offsetWidth: width, offsetHeight: height } = bar
      const room = Math.max(GAP, geometry.hostWidth - width - GAP)
      const left = Math.min(Math.max(GAP, geometry.box.left + geometry.box.width / 2 - width / 2), room)
      const above = geometry.box.top - height - GAP
      const below = Math.min(
        geometry.box.top + geometry.box.height + GAP,
        Math.max(GAP, geometry.hostHeight - height - GAP),
      )
      const top = above >= GAP ? above : below
      bar.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`
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
    const resize = new ResizeObserver(schedule)
    if (barRef.current) resize.observe(barRef.current)
    sync()

    return () => {
      cancelAnimationFrame(frame)
      unsubscribeHost()
      mutations.disconnect()
      resize.disconnect()
    }
  }, [group])

  const buttonsFor = (ids: ReadonlySet<GroupActionId>) => {
    const buttons: ReactNode[] = []
    for (const action of menu.actions) {
      if (!ids.has(action.id)) continue
      buttons.push(
        <button
          key={action.id}
          type="button"
          className={TOOLBAR_BUTTON_CLASS}
          disabled={action.blocked !== null}
          aria-label={action.blocked ? `${action.label}, ${action.blocked}` : action.label}
          title={action.blocked ? `${action.label} — ${action.blocked}` : action.label}
          onClick={action.run}
        >
          <FlowIcon name={ACTION_ICONS[action.id]} />
        </button>,
      )
    }
    return buttons
  }

  return (
    <div className={TOOLBAR_OVERLAY_CLASS}>
      <div
        ref={barRef}
        className={TOOLBAR_CLASS}
        data-visible="false"
        role="toolbar"
        aria-label="Group layout controls"
      >
        <span className={GROUP_COUNT_CLASS}>{menu.count} selected</span>
        <span className={TOOLBAR_SEPARATOR_CLASS} />
        <div className={TOOLBAR_GROUP_CLASS}>{buttonsFor(ROW_IDS)}</div>
        <span className={TOOLBAR_SEPARATOR_CLASS} />
        <div className={TOOLBAR_GROUP_CLASS}>{buttonsFor(WRAP_IDS)}</div>
        <span className={TOOLBAR_SEPARATOR_CLASS} />
        <div className={TOOLBAR_GROUP_CLASS}>{buttonsFor(GRID_IDS)}</div>
      </div>
    </div>
  )
}
