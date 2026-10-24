import fixedCss from './fixed-css.html?raw'
import fixedInline from './fixed-inline.html?raw'
import fixedRotated from './fixed-rotated.html?raw'
import flowLayout from './flow-layout.html?raw'
import fullDocument from './full-document.html?raw'
import landing from './landing.html?raw'
import tricky from './tricky.html?raw'

export type FixtureId =
  | 'landing'
  | 'full'
  | 'tricky'
  | 'flow-layout'
  | 'fixed-inline'
  | 'fixed-css'
  | 'fixed-rotated'
  | 'empty'

export type Fixture = {
  id: FixtureId
  label: string
  description: string
  html: string
}

export const FIXTURES: Fixture[] = [
  {
    id: 'landing',
    label: 'Landing',
    description: 'An HTML fragment: the root children become the document children.',
    html: landing.trim(),
  },
  {
    id: 'full',
    label: 'Full document',
    description: 'Doctype, head and body attributes are kept opaque; only the body is edited.',
    html: fullDocument.trim(),
  },
  {
    id: 'tricky',
    label: 'Tricky cases',
    description: 'Comments, custom elements, entities and opaque nodes re-emitted byte for byte.',
    html: tricky.trim(),
  },
  {
    id: 'flow-layout',
    label: 'Flow page',
    description: 'A page in normal flow, for the direct canvas controls.',
    html: flowLayout.trim(),
  },
  {
    id: 'fixed-inline',
    label: 'Fixed · inline styles',
    description: 'Absolutely positioned children with a viewport meta: fixed mode kicks in.',
    html: fixedInline.trim(),
  },
  {
    id: 'fixed-css',
    label: 'Fixed · stylesheet',
    description: 'The same page with the positions coming from a <style> in the head.',
    html: fixedCss.trim(),
  },
  {
    id: 'fixed-rotated',
    label: 'Fixed · rotated',
    description: 'Rotated elements, for the resize and rotate handles.',
    html: fixedRotated.trim(),
  },
  { id: 'empty', label: 'Empty', description: 'Start from nothing and drop blocks in.', html: '' },
]

export const FIXTURE_BY_ID = Object.fromEntries(
  FIXTURES.map((fixture) => [fixture.id, fixture]),
) as Record<FixtureId, Fixture>

export function fixtureHtml(id: FixtureId): string {
  return FIXTURE_BY_ID[id].html
}
