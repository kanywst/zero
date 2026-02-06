import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MarkdownLink = ({ href, children, ...props }: any) => (
  <a
    {...props}
    href={href}
    onClick={(e) => {
      e.preventDefault()
      if (href) invoke('open_url', { url: href })
    }}
  >
    {children}
  </a>
)

export const MarkdownCode = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  const [diagram, setDiagram] = useState('')

  useEffect(() => {
    if (!inline && match?.[1] === 'mermaid') {
      import('mermaid').then((m) => {
        m.default.initialize({ startOnLoad: true, theme: 'dark' })
        m.default
          .render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, String(children))
          .then(({ svg }) => {
            setDiagram(svg)
          })
      })
    }
  }, [children, inline, match])

  if (!inline && match?.[1] === 'mermaid') {
    return (
      <div
        className="flex justify-center my-6 bg-zinc-900/50 p-6 rounded-xl border border-white/5"
        dangerouslySetInnerHTML={{ __html: diagram }}
      />
    )
  }
  return (
    <code className={cn('bg-zinc-800 px-1.5 py-0.5 rounded text-sm', className)} {...props}>
      {children}
    </code>
  )
}

export const MarkdownRenderer = ({
  content,
  className,
}: {
  content: string
  className?: string
}) => {
  return (
    <div className={cn('markdown-preview', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: MarkdownLink,
          code: MarkdownCode,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
