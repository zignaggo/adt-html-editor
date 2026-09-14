import { useEffect } from 'react'
import { useCanvasContext } from '../../components/Canvas/context'
import { createImageStrategy } from './imageStrategy'

export function ImageGhost() {
  const { registerGhost } = useCanvasContext()
  useEffect(() => registerGhost(createImageStrategy()), [registerGhost])
  return null
}
