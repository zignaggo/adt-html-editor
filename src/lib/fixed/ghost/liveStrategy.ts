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
  let clone: HTMLElement | null = null
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
        clone = cloneForPreview(element, size, 1)
        clone.classList.add(styles.box, styles.clone)
        layer.appendChild(clone)
      } else {
        clone = createGhostBox(layer, size, styles.target)
      }
      moveGhostBox(clone, start)
    },
    move(position) {
      if (clone) moveGhostBox(clone, position)
    },
    end({ cancelled }) {
      originBox?.remove()
      originBox = null
      const ghost = clone
      clone = null
      if (!ghost) return
      if (!cancelled || !origin || prefersReducedMotion()) {
        ghost.remove()
        return
      }
      ghost.classList.add(styles.returning)
      moveGhostBox(ghost, origin)
      setTimeout(() => ghost.remove(), RETURN_MS)
    },
  }
}
