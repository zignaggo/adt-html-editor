import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview'
import type { Box } from '../geometry'
import { cloneForPreview } from './snapshot'
import { createGhostBox, moveGhostBox, type GhostStrategy } from './strategy'
import styles from './ghost.module.css'

const RETURN_MS = 160

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createLiveStrategy(): GhostStrategy {
  let ghost: HTMLElement | null = null
  let originBox: HTMLDivElement | null = null
  let origin: Box | null = null

  return {
    id: 'live',
    hidesNativePreview: true,
    generatePreview({ nativeSetDragImage }) {
      disableNativeDragPreview({ nativeSetDragImage })
    },
    start({ element, layer, origin: start, size }) {
      origin = start
      originBox = createGhostBox(layer, size, styles.origin)
      moveGhostBox(originBox, start)
      if (element) {
        ghost = createGhostBox(layer, size, styles.clone)
        ghost.appendChild(cloneForPreview(element, size))
      } else {
        ghost = createGhostBox(layer, size, styles.target)
      }
      moveGhostBox(ghost, start)
    },
    move(position) {
      if (ghost) moveGhostBox(ghost, position)
    },
    end({ cancelled }) {
      originBox?.remove()
      originBox = null
      const leaving = ghost
      ghost = null
      if (!leaving) return
      if (!cancelled || !origin || prefersReducedMotion()) {
        leaving.remove()
        return
      }
      leaving.classList.add(styles.returning)
      moveGhostBox(leaving, origin)
      setTimeout(() => leaving.remove(), RETURN_MS)
    },
  }
}
