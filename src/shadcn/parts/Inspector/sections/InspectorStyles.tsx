import { FlowTransformSection } from '../../../../lib/flow/transform/FlowTransformSection'
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
      <FlowTransformSection />
      <InspectorSizing />
      <InspectorTypography />
      <InspectorAppearance />
      <InspectorBorders />
    </div>
  )
}
