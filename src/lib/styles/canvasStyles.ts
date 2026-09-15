export const CANVAS_CLASS =
  'adt-canvas @container/adt-canvas min-h-30 text-base normal-nums text-[#0f172a] [text-wrap:auto] ' +
  'transition-opacity duration-200 ease-out ' +
  'data-[adt-styles=pending]:invisible data-[adt-styles=pending]:opacity-0 ' +
  'data-[adt-fixed-drag]:select-none data-[adt-fixed-gesture]:select-none ' +
  '[&_img]:outline [&_img]:-outline-offset-1 [&_img]:outline-black/10 dark:[&_img]:outline-white/10 ' +
  '[&_[data-adt-fixed-dragging]]:opacity-35 ' +
  '[&_[data-adt-editing]]:rounded-[2px] [&_[data-adt-editing]]:outline-2 ' +
  '[&_[data-adt-editing]]:outline-offset-2 ' +
  '[&_[data-adt-editing]]:outline-primary'

export const CANVAS_FIXED_CLASS = '[container:none] min-h-0'
