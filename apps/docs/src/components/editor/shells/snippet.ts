import type { Scenario } from '../scenarios'

export function snippetFor(scenario: Scenario): string {
  const entry = scenario.skin === 'shadcn' ? '@zignaggo/adt-html-editor/shadcn' : '@zignaggo/adt-html-editor'
  const props = [`defaultValue={html}`, `onChange={setHtml}`]
  if (scenario.layout) props.push(`layout="${scenario.layout}"`)
  if (scenario.directControls) props.push(`flowLayout={{ directControls: true }}`)

  const open = props.join('\n  ')

  if (!scenario.Full) {
    return `import { HtmlEditor } from '${entry}'\n\n<HtmlEditor.DefaultLayout\n  ${open}\n/>`
  }

  return `import { HtmlEditor } from '${entry}'\n\n<HtmlEditor\n  ${open}\n>\n  <${scenario.Full.name} />\n</HtmlEditor>`
}
