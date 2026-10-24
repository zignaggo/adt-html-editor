import { useSyncExternalStore, type ReactNode } from 'react'

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, onClient, onServer)

  return <>{isClient ? children : (fallback ?? null)}</>
}
