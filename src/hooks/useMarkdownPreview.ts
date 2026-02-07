import { useEffect, useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import morphdom from 'morphdom'
import mermaid from 'mermaid'

export function useMarkdownPreview(content: string) {
  const [html, setHtml] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const hiddenDivRef = useRef<HTMLDivElement>(null)

  // Parse markdown in Rust with a small debounce to batch rapid updates
  useEffect(() => {
    let active = true
    const timeoutId = setTimeout(async () => {
      try {
        const result: string = await invoke('parse_markdown', { content })
        if (active) setHtml(result)
      } catch (err) {
        console.error('Failed to parse markdown:', err)
      }
    }, 50) // 50ms micro-debounce: invisible to humans, huge for CPU/IPC

    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [content])

  // Incremental DOM patching and Mermaid rendering
  useEffect(() => {
    if (!containerRef.current || !html) return

    if (!hiddenDivRef.current) {
      hiddenDivRef.current = document.createElement('div')
    }

    // Patch DOM with optimized checks
    morphdom(containerRef.current, hiddenDivRef.current, {
      childrenOnly: true,
      onBeforeElUpdated: (fromEl, toEl) => {
        if (fromEl.isEqualNode(toEl)) return false
        if (
          fromEl.classList.contains('mermaid-processed') &&
          fromEl.textContent === toEl.textContent
        ) {
          return false
        }
        return true
      },
    })

    // Delegated event handling for better performance
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (link) {
        e.preventDefault()
        const href = link.getAttribute('href')
        if (href) invoke('open_url', { url: href })
      }
    }

    const container = containerRef.current
    container.addEventListener('click', handleClick)

    // Handle Mermaid (Incremental rendering)
    const codeBlocks = container.querySelectorAll('pre > code.language-mermaid')
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

    return () => container.removeEventListener('click', handleClick)
  }, [html])

  return containerRef
}
