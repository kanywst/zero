import { useEffect, useState, memo, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'
import mermaid from 'mermaid'
import morphdom from 'morphdom'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
})

export const MarkdownRenderer = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const [html, setHtml] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const hiddenDivRef = useRef<HTMLDivElement>(null)

    // Parallel parsing in Rust
    useEffect(() => {
      let active = true
      const parse = async () => {
        const result: string = await invoke('parse_markdown', { content })
        if (active) setHtml(result)
      }
      parse()
      return () => {
        active = false
      }
    }, [content])

    // Ultra-fast incremental DOM patching
    useEffect(() => {
      if (!containerRef.current || !html) return

      if (!hiddenDivRef.current) {
        hiddenDivRef.current = document.createElement('div')
      }

      // Patch the current DOM with the new HTML using morphdom (incremental updates)
      hiddenDivRef.current.innerHTML = html

      morphdom(containerRef.current, hiddenDivRef.current, {
        childrenOnly: true,
        onBeforeElUpdated: (fromEl, toEl) => {
          // Optimization: Don't re-render mermaid blocks if content is identical
          if (
            fromEl.classList.contains('mermaid-processed') &&
            fromEl.textContent === toEl.textContent
          ) {
            return false
          }
          return true
        },
      })

      // Handle links and post-processing
      const links = containerRef.current.querySelectorAll('a')
      links.forEach((link) => {
        link.onclick = (e) => {
          e.preventDefault()
          const href = link.getAttribute('href')
          if (href) invoke('open_url', { url: href })
        }
      })

      // Handle Mermaid (Incremental rendering)
      const codeBlocks = containerRef.current.querySelectorAll('pre > code.language-mermaid')
      codeBlocks.forEach(async (block) => {
        if (block.classList.contains('mermaid-processed')) return

        const pre = block.parentElement
        if (!pre) return

        try {
          const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
          const { svg } = await mermaid.render(id, block.textContent || '')
          pre.innerHTML = svg
          block.classList.add('mermaid-processed')
          pre.classList.add(
            'flex',
            'justify-center',
            'my-6',
            'bg-zinc-900/50',
            'p-6',
            'rounded-xl',
            'border',
            'border-white/5',
            'overflow-x-auto',
          )
        } catch {
          pre.innerHTML = `<div class="text-red-400 text-xs p-4">Mermaid Error</div>`
        }
      })
    }, [html])

    return (
      <div
        ref={containerRef}
        className={cn('markdown-preview prose prose-invert max-w-none', className)}
      />
    )
  },
)

MarkdownRenderer.displayName = 'MarkdownRenderer'
