import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview'
import type { Box } from '../geometry'
import { cloneForPreview } from './snapshot'
import { createGhostBox, moveGhostBox, type GhostStrategy } from './strategy'
import {
  ghostCloneClass,
  ghostOriginClass,
  ghostReturningClass,
  ghostTargetClass,
} from './ghostStyles'

const RETURN_MS = 160
const MAX_LIVE_CLONES = 12

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createLiveStrategy(): GhostStrategy {
  let ghost: HTMLElement | null = null
  let originBoxes: HTMLDivElement[] = []
  let origin: Box | null = null

  return {
    id: 'live',
    hidesNativePreview: true,
    generatePreview({ nativeSetDragImage }) {
      disableNativeDragPreview({ nativeSetDragImage })
    },
    start({ layer, origin: start, size, members }) {
      origin = start
      originBoxes = members.map((member) => {
        const box = createGhostBox(layer, member.size, ghostOriginClass)
        moveGhostBox(box, { x: start.x + member.offset.x, y: start.y + member.offset.y })
        return box
      })

      const clonable = members.filter((member) => member.element !== null)
      const cloning = clonable.length > 0 && clonable.length <= MAX_LIVE_CLONES
      const wrapper = createGhostBox(layer, size, cloning ? ghostCloneClass : ghostTargetClass)
      if (cloning) {
        for (const member of clonable) {
          const slot = document.createElement('div')
          slot.style.position = 'absolute'
          slot.style.left = `${member.offset.x}px`
          slot.style.top = `${member.offset.y}px`
          slot.style.width = `${member.size.width}px`
          slot.style.height = `${member.size.height}px`
          slot.appendChild(cloneForPreview(member.element as HTMLElement, member.size))
          wrapper.appendChild(slot)
        }
      }
      ghost = wrapper
      moveGhostBox(ghost, start)
    },
    move(position) {
      if (ghost) moveGhostBox(ghost, position)
    },
    end({ cancelled }) {
      for (const box of originBoxes) box.remove()
      originBoxes = []
      const leaving = ghost
      ghost = null
      if (!leaving) return
      if (!cancelled || !origin || prefersReducedMotion()) {
        leaving.remove()
        return
      }
      leaving.classList.add(...ghostReturningClass.split(' '))
      moveGhostBox(leaving, origin)
      setTimeout(() => leaving.remove(), RETURN_MS)
    },
  }
}
