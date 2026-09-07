import landing from './landing.html?raw'
import fullDocument from './full-document.html?raw'
import tricky from './tricky.html?raw'

export type Fixture = { id: string; label: string; html: string }

export const FIXTURES: Fixture[] = [
  { id: 'landing', label: 'Landing (fragmento)', html: landing.trim() },
  { id: 'full', label: 'Documento completo', html: fullDocument.trim() },
  { id: 'tricky', label: 'Casos difíceis', html: tricky.trim() },
  { id: 'empty', label: 'Vazio', html: '' },
]
