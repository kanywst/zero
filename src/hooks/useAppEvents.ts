import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { ViewMode } from '../types/editor'

interface AppEventsProps {
  saveFile: () => void
  createNewFile: () => void
  loadFileContent: (fileName: string) => void
  setViewMode: (mode: ViewMode | ((prev: ViewMode) => ViewMode)) => void
  setIsSearchOpen: (open: boolean) => void
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void
}

export function useAppEvents({
  saveFile,
  createNewFile,
  loadFileContent,
  setViewMode,
  setIsSearchOpen,
  setIsSidebarOpen,
}: AppEventsProps) {
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            saveFile()
            break
          case 'a':
            e.preventDefault()
            setViewMode((prev) => (prev === 'preview' ? 'edit' : 'preview'))
            break
          case 'd':
            e.preventDefault()
            setViewMode((prev) => (prev === 'split' ? 'edit' : 'split'))
            break
          case 'k':
            e.preventDefault()
            setIsSearchOpen(true)
            break
          case 'b':
            e.preventDefault()
            setIsSidebarOpen((prev) => !prev)
            break
          case 'n':
            e.preventDefault()
            createNewFile()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFile, createNewFile, setViewMode, setIsSearchOpen, setIsSidebarOpen])

  // Tauri Events (CLI / Single Instance)
  useEffect(() => {
    const unlisten = listen<string>('open-file', (event) => {
      const filePath = event.payload
      const fileName = filePath.split('/').pop() || filePath
      loadFileContent(fileName)
    })
    return () => {
      unlisten.then((f) => f())
    }
  }, [loadFileContent])
}
