import { memo } from 'react'
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'
import mermaid from 'mermaid'
import { useMarkdownPreview } from '../hooks/useMarkdownPreview'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict', // Hardened security
})

export const MarkdownRenderer = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const containerRef = useMarkdownPreview(content)

    return (
      <div
        ref={containerRef}
        className={cn('markdown-preview prose prose-invert max-w-none', className)}
      />
    )
  },
)

MarkdownRenderer.displayName = 'MarkdownRenderer'
