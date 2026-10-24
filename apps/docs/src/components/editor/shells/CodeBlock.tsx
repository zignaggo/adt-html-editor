import { useDeferredValue } from 'react'
import { createDynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock.core'
import { createShikiHighlighter } from 'fumadocs-core/highlight/shiki'
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full'
import { cn } from '@/lib/cn'

const highlighter = createShikiHighlighter(() => defaultShikiFactory.getOrInit(), {
  defaultColor: false,
  themes: { light: 'github-light', dark: 'github-dark' },
})

const SharedCodeBlock = createDynamicCodeBlock({ highlighter })

export function CodeBlock({
  code,
  lang,
  title,
  className,
}: {
  code: string
  lang: string
  title?: string
  className?: string
}) {
  const deferred = useDeferredValue(code)

  return (
    <SharedCodeBlock
      lang={lang}
      code={deferred || '(empty)'}
      codeblock={{
        title,
        className: cn('my-0 text-[12px]', className),
      }}
    />
  )
}
