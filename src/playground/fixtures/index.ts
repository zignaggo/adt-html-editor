import landing from './landing.html?raw'
import fullDocument from './full-document.html?raw'
import tricky from './tricky.html?raw'

export type Fixture = { id: string; label: string; html: string }

export const FIXTURES: Fixture[] = [
  { id: 'landing', label: 'Landing (fragment)', html: landing.trim() },
  { id: 'full', label: 'Full document', html: fullDocument.trim() },
  { id: 'tricky', label: 'Tricky cases', html: tricky.trim() },
  { id: 'empty', label: 'Empty', html: '' },
]
