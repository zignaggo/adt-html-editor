import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source'
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview'
import { cloneForPreview } from './snapshot'
import { createOutlineStrategy, type GhostStrategy } from './strategy'

const MAX_PREVIEW_PX = 2000

export function createImageStrategy(): GhostStrategy {
  const outline = createOutlineStrategy()
  return {
    ...outline,
    id: 'image',
    hidesNativePreview: false,
    generatePreview({ nativeSetDragImage, element, input, scale }) {
      const size = { width: element.offsetWidth, height: element.offsetHeight }
      const largest = Math.max(size.width, size.height) * scale
      const fit = largest > MAX_PREVIEW_PX ? MAX_PREVIEW_PX / largest : 1
      const previewScale = scale * fit

      setCustomNativeDragPreview({
        nativeSetDragImage,
        getOffset: preserveOffsetOnSource({ element, input }),
        render({ container }) {
          const wrapper = document.createElement('div')
          wrapper.className = 'adt-canvas'
          wrapper.setAttribute('data-adt-styles', 'ready')
          wrapper.style.position = 'relative'
          wrapper.style.minHeight = '0'
          wrapper.style.width = `${size.width * previewScale}px`
          wrapper.style.height = `${size.height * previewScale}px`
          wrapper.appendChild(cloneForPreview(element, size, previewScale))
          container.appendChild(wrapper)
          return () => wrapper.remove()
        },
      })
    },
  }
}
