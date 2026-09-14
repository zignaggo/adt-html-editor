import { useEffect } from 'react'
import { useCanvasContext } from '../../components/Canvas/context'
import { createLiveStrategy } from './liveStrategy'

export function LiveGhost() {
  const { registerGhost } = useCanvasContext()
  useEffect(() => registerGhost(createLiveStrategy()), [registerGhost])
  return null
}
