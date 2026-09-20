import { cn } from 'cn'

export const FRAME_CLASS =
  'group/frame pointer-events-none absolute z-[32] m-0 box-border p-0 ' +
  '[--adt-inverse-scale:1] [--adt-frame-angle:0deg] ' +
  '[--adt-handle-size:calc(10px*var(--adt-inverse-scale))] [--adt-hairline:calc(1.5px*var(--adt-inverse-scale))] ' +
  'shadow-[0_0_0_var(--adt-hairline)_var(--color-primary)] ' +
  'data-[visible=false]:hidden data-[disabled=true]:pointer-events-auto ' +
  'data-[disabled=true]:shadow-[0_0_0_var(--adt-hairline)_color-mix(in_srgb,var(--color-primary)_50%,transparent)]'

export const FRAME_LABEL_CLASS =
  'pointer-events-none absolute bottom-full left-[calc(-1*var(--adt-hairline))] m-0 origin-bottom-left ' +
  'scale-[var(--adt-inverse-scale)] rounded-t-[3px] bg-primary px-1.5 py-px font-mono text-[10px] ' +
  'leading-4 whitespace-nowrap text-primary-foreground'

const GRIP_CLASS =
  'pointer-events-auto absolute m-0 box-border size-[var(--adt-handle-size)] appearance-none touch-none ' +
  'rounded-[calc(2px*var(--adt-inverse-scale))] border-[length:var(--adt-hairline)] border-solid border-primary ' +
  'bg-white p-0 font-[inherit] leading-none text-inherit select-none ' +
  'shadow-[0_calc(1px*var(--adt-inverse-scale))_calc(3px*var(--adt-inverse-scale))_rgba(15,23,42,0.25)] ' +
  'before:absolute before:inset-[calc(-7px*var(--adt-inverse-scale))] ' +
  'focus-visible:outline-[length:var(--adt-hairline)] focus-visible:outline-solid focus-visible:outline-ring ' +
  'group-data-[locked=true]/frame:hidden group-data-[disabled=true]/frame:hidden'

export const HANDLE_CLASS = cn(
  GRIP_CLASS,
  '-translate-x-1/2 -translate-y-1/2',
  'data-[handle=nw]:top-0 data-[handle=nw]:left-0',
  'data-[handle=n]:top-0 data-[handle=n]:left-1/2',
  'data-[handle=ne]:top-0 data-[handle=ne]:left-full',
  'data-[handle=e]:top-1/2 data-[handle=e]:left-full',
  'data-[handle=se]:top-full data-[handle=se]:left-full',
  'data-[handle=s]:top-full data-[handle=s]:left-1/2',
  'data-[handle=sw]:top-full data-[handle=sw]:left-0',
  'data-[handle=w]:top-1/2 data-[handle=w]:left-0',
)

export const ROTATE_CLASS = cn(
  GRIP_CLASS,
  'bottom-[calc(100%+22px*var(--adt-inverse-scale))] left-1/2 size-[calc(12px*var(--adt-inverse-scale))]',
  '-translate-x-1/2 translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing',
  'group-data-[group=true]/frame:hidden',
)

export const STEM_CLASS = cn(
  'pointer-events-none absolute bottom-full left-1/2 h-[calc(22px*var(--adt-inverse-scale))]',
  'w-[var(--adt-hairline)] -translate-x-1/2 bg-primary',
  'group-data-[locked=true]/frame:hidden group-data-[disabled=true]/frame:hidden',
  'group-data-[group=true]/frame:hidden',
)

export const BADGE_CLASS =
  'pointer-events-none absolute top-[calc(100%+10px*var(--adt-inverse-scale))] left-1/2 m-0 origin-[50%_0] ' +
  'rounded-[4px] bg-primary px-2 py-0.5 font-mono text-2xs leading-4 whitespace-nowrap text-primary-foreground ' +
  '[transform:translateX(-50%)_rotate(calc(-1*var(--adt-frame-angle)))_scale(var(--adt-inverse-scale))] ' +
  'data-[visible=false]:hidden'
