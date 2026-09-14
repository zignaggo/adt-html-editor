import { InspectorAppearance } from './InspectorAppearance'
import { InspectorBorders } from './InspectorBorders'
import { InspectorLayout } from './InspectorLayout'
import { InspectorSizing } from './InspectorSizing'
import { InspectorSpacing } from './InspectorSpacing'
import { InspectorTypography } from './InspectorTypography'

export function InspectorStyles() {
  return (
    <div className="flex flex-col">
      <InspectorLayout />
      <InspectorSpacing />
      <InspectorSizing />
      <InspectorTypography />
      <InspectorAppearance />
      <InspectorBorders />
    </div>
  )
}
