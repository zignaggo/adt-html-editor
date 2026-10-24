import type { Ref } from 'react'
import { HtmlEditor, type HtmlEditorHandle } from '@zignaggo/adt-html-editor'
import { HtmlEditor as ShadcnHtmlEditor } from '@zignaggo/adt-html-editor/shadcn'
import { FIXTURE_BY_ID, fixtureHtml, type FixtureId } from './fixtures'
import type { Scenario } from './scenarios'

export type EditorSurfaceProps = {
  scenario: Scenario
  fixtureId?: FixtureId
  resetKey?: number
  handleRef?: Ref<HtmlEditorHandle>
  onChange?: (html: string) => void
  variant?: 'full' | 'minimal'
}

export function EditorSurface({
  scenario,
  fixtureId,
  resetKey = 0,
  handleRef,
  onChange,
  variant = 'full',
}: EditorSurfaceProps) {
  const fixture = fixtureId ?? scenario.fixture
  const key = `${scenario.id}:${fixture}:${variant}:${resetKey}`
  const props = {
    defaultValue: fixtureHtml(fixture),
    layout: scenario.layout ?? ('auto' as const),
    flowLayout: scenario.directControls ? { directControls: true } : undefined,
    handleRef,
    onChange: onChange ? (html: string) => onChange(html) : undefined,
  }

  const Composition = variant === 'full' ? scenario.Full : scenario.Minimal

  if (Composition) {
    const Root = variant === 'full' && scenario.skin === 'shadcn' ? ShadcnHtmlEditor : HtmlEditor
    return (
      <Root key={key} className="h-full" {...props}>
        <Composition />
      </Root>
    )
  }

  if (scenario.skin === 'core') {
    return <HtmlEditor.DefaultLayout key={key} className="h-full" {...props} />
  }

  const FullCanvas = variant === 'full' ? scenario.FullCanvas : undefined

  return (
    <ShadcnHtmlEditor.DefaultLayout
      key={key}
      className="h-full"
      title={FIXTURE_BY_ID[fixture].label}
      canvas={FullCanvas ? <FullCanvas /> : undefined}
      {...props}
    />
  )
}
