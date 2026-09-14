import landing from './landing.html?raw'
import fullDocument from './full-document.html?raw'
import tricky from './tricky.html?raw'
import fixedInline from './fixed-inline.html?raw'
import fixedCss from './fixed-css.html?raw'
import fixedRotated from './fixed-rotated.html?raw'

export type Fixture = { id: string; label: string; html: string }

export const FIXTURES: Fixture[] = [
  { id: 'landing', label: 'Landing (fragment)', html: landing.trim() },
  { id: 'full', label: 'Full document', html: fullDocument.trim() },
  { id: 'tricky', label: 'Tricky cases', html: tricky.trim() },
  { id: 'fixed-inline', label: 'Fixed layout (inline styles)', html: fixedInline.trim() },
  { id: 'fixed-css', label: 'Fixed layout (stylesheet)', html: fixedCss.trim() },
  { id: 'fixed-rotated', label: 'Fixed layout (rotated)', html: fixedRotated.trim() },
  { id: 'empty', label: 'Empty', html: '' },
]
