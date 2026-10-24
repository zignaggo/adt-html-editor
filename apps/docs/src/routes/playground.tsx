import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { lazy, Suspense } from 'react'
import { ClientOnly } from '@/components/editor/ClientOnly'
import { baseOptions } from '@/lib/layout.shared'

const Playground = lazy(() =>
  import('@/components/editor/Playground').then((module) => ({ default: module.Playground })),
)

type PlaygroundSearch = { scenario: string }

export const Route = createFileRoute('/playground')({
  component: PlaygroundPage,
  validateSearch: (search: Record<string, unknown>): PlaygroundSearch => ({
    scenario: typeof search.scenario === 'string' ? search.scenario : 'default',
  }),
  head: () => ({ meta: [{ title: 'Playground · adt-html-editor' }] }),
})

function PlaygroundPage() {
  const { scenario } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <HomeLayout {...baseOptions()} className="h-dvh min-h-0 [&>main]:min-h-0">
      <div className="h-[calc(100dvh-var(--fd-nav-height,56px))] min-h-0">
        <ClientOnly fallback={<Loading />}>
          <Suspense fallback={<Loading />}>
            <Playground
              scenarioId={scenario}
              onSelect={(id) =>
                navigate({ search: { scenario: id }, replace: true, resetScroll: false })
              }
            />
          </Suspense>
        </ClientOnly>
      </div>
    </HomeLayout>
  )
}

function Loading() {
  return (
    <div className="grid size-full place-items-center text-sm text-fd-muted-foreground">
      Loading the editor…
    </div>
  )
}
