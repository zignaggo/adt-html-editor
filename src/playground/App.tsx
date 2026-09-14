import { useReducer, useRef } from 'react'
import { HtmlEditor, parseHtml, serializeHtml, type HtmlEditorHandle } from '../lib'
import { CustomLayout } from './CustomLayout'
import { FixedImageLayout } from './FixedImageLayout'
import { FIXTURES } from './fixtures'
import styles from './App.module.css'

type RoundTrip = { ok: boolean; message: string } | null

type LayoutMode = 'default' | 'custom' | 'fixed-image'

type State = {
  layoutMode: LayoutMode
  fixtureId: string
  input: string
  documentHtml: string
  output: string
  roundTrip: RoundTrip
}

type Action =
  | { type: 'loadFixture'; id: string; html: string }
  | { type: 'editInput'; value: string }
  | { type: 'loadIntoEditor' }
  | { type: 'setOutput'; value: string }
  | { type: 'setRoundTrip'; value: RoundTrip }
  | { type: 'setLayout'; value: LayoutMode }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loadFixture':
      return {
        ...state,
        fixtureId: action.id,
        input: action.html,
        documentHtml: action.html,
        output: action.html,
        roundTrip: null,
      }
    case 'editInput':
      return { ...state, input: action.value }
    case 'loadIntoEditor':
      return { ...state, documentHtml: state.input, output: state.input }
    case 'setOutput':
      return { ...state, output: action.value }
    case 'setRoundTrip':
      return { ...state, roundTrip: action.value }
    case 'setLayout':
      return { ...state, layoutMode: action.value }
  }
}

const initial: State = {
  layoutMode: 'default',
  fixtureId: FIXTURES[0].id,
  input: FIXTURES[0].html,
  documentHtml: FIXTURES[0].html,
  output: FIXTURES[0].html,
  roundTrip: null,
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initial)
  const handleRef = useRef<HtmlEditorHandle | null>(null)

  const runRoundTrip = () => {
    const once = serializeHtml(parseHtml(state.input))
    const twice = serializeHtml(parseHtml(once))
    dispatch({
      type: 'setRoundTrip',
      value:
        once === twice
          ? { ok: true, message: `Idempotent · ${once.length} bytes` }
          : { ok: false, message: 'Diverged on the second pass' },
    })
  }

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <strong className={styles.brand}>adt-html-editor</strong>
        <label className={styles.fixturePicker}>
          <span>Fixture</span>
          <select
            value={state.fixtureId}
            onChange={(event) => {
              const fixture = FIXTURES.find((entry) => entry.id === event.target.value)
              if (fixture) dispatch({ type: 'loadFixture', id: fixture.id, html: fixture.html })
            }}
          >
            {FIXTURES.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.fixturePicker}>
          <span>Layout</span>
          <select
            value={state.layoutMode}
            onChange={(event) =>
              dispatch({ type: 'setLayout', value: event.target.value as LayoutMode })
            }
          >
            <option value="default">Default (3 panels)</option>
            <option value="custom">Custom composition</option>
            <option value="fixed-image">Fixed layout · image ghost</option>
          </select>
        </label>
        <div className={styles.actions}>
          <button type="button" onClick={runRoundTrip}>
            Run round-trip
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: 'setOutput', value: handleRef.current?.getHtml() ?? '' })
            }
          >
            Finish (getHtml)
          </button>
          {state.roundTrip ? (
            <span className={styles.status} data-ok={state.roundTrip.ok || undefined}>
              {state.roundTrip.message}
            </span>
          ) : null}
        </div>
      </header>

      <main className={styles.editorArea}>
        {state.layoutMode === 'default' ? (
          <HtmlEditor.DefaultLayout
            key={`default-${state.documentHtml}`}
            defaultValue={state.documentHtml}
            handleRef={handleRef}
            onChange={(html) => dispatch({ type: 'setOutput', value: html })}
          />
        ) : state.layoutMode === 'fixed-image' ? (
          <HtmlEditor
            key={`fixed-${state.documentHtml}`}
            defaultValue={state.documentHtml}
            layout="fixed"
            handleRef={handleRef}
            onChange={(html) => dispatch({ type: 'setOutput', value: html })}
          >
            <FixedImageLayout />
          </HtmlEditor>
        ) : (
          <HtmlEditor
            key={`custom-${state.documentHtml}`}
            defaultValue={state.documentHtml}
            handleRef={handleRef}
            onChange={(html) => dispatch({ type: 'setOutput', value: html })}
          >
            <CustomLayout />
          </HtmlEditor>
        )}
      </main>

      {/*<footer className={styles.io}>
        <div className={styles.pane}>
          <label className={styles.paneTitle} htmlFor="pg-input">
            Input
          </label>
          <textarea
            id="pg-input"
            value={state.input}
            spellCheck={false}
            onChange={(event) => dispatch({ type: 'editInput', value: event.target.value })}
          />
          <button type="button" onClick={() => dispatch({ type: 'loadIntoEditor' })}>
            Load into editor
          </button>
        </div>
        <div className={styles.pane}>
          <label className={styles.paneTitle} htmlFor="pg-output">
            Output (onChange)
          </label>
          <textarea id="pg-output" value={state.output} readOnly spellCheck={false} />
          <span className={styles.byteCount}>{state.output.length} bytes</span>
        </div>
      </footer>*/}
    </div>
  )
}
