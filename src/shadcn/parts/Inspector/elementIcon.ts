import {
  BoxIcon,
  CodeIcon,
  FileCodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  MessageSquareIcon,
  MousePointerClickIcon,
  PanelBottomIcon,
  PanelTopIcon,
  PilcrowIcon,
  ShapesIcon,
  SquareDashedIcon,
  TableIcon,
  TextCursorInputIcon,
  TextIcon,
  TypeIcon,
  VideoIcon,
  type LucideIcon,
} from 'lucide-react'
import type { AnyNode } from '../../../lib/core/model'

const ICON_BY_TAG: Record<string, LucideIcon> = {
  h1: Heading1Icon,
  h2: Heading2Icon,
  h3: Heading3Icon,
  h4: Heading4Icon,
  h5: Heading5Icon,
  h6: Heading6Icon,
  p: PilcrowIcon,
  span: TypeIcon,
  strong: TypeIcon,
  em: TypeIcon,
  small: TypeIcon,
  label: TypeIcon,
  a: LinkIcon,
  img: ImageIcon,
  picture: ImageIcon,
  video: VideoIcon,
  audio: VideoIcon,
  button: MousePointerClickIcon,
  input: TextCursorInputIcon,
  textarea: TextCursorInputIcon,
  select: TextCursorInputIcon,
  form: TextCursorInputIcon,
  ul: ListIcon,
  ol: ListIcon,
  li: ListIcon,
  table: TableIcon,
  header: PanelTopIcon,
  footer: PanelBottomIcon,
  section: SquareDashedIcon,
  article: SquareDashedIcon,
  main: SquareDashedIcon,
  aside: SquareDashedIcon,
  nav: SquareDashedIcon,
  div: BoxIcon,
  svg: ShapesIcon,
  script: FileCodeIcon,
  style: FileCodeIcon,
  iframe: FileCodeIcon,
}

export function elementIconFor(node: AnyNode): LucideIcon {
  if (node.kind === 'text') return TextIcon
  if (node.kind === 'comment') return MessageSquareIcon
  return ICON_BY_TAG[node.tag] ?? CodeIcon
}

export function kindLabelFor(node: AnyNode): string {
  if (node.kind === 'text') return 'Text node'
  if (node.kind === 'comment') return 'Comment'
  if (node.kind === 'opaque') return 'Raw element'
  return 'Element'
}
