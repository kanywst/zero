import { useState, useDeferredValue } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { MarkdownRenderer } from './components/MarkdownRenderer'
import { Sidebar } from './components/Sidebar'
import { EditorToolbar } from './components/EditorToolbar'
import { EditorCore } from './components/EditorCore'
import { SearchModal } from './components/modals/SearchModal'
import { NamingModal } from './components/modals/NamingModal'
import { EditorProvider, useEditor } from './contexts/EditorContext'
import { FileProvider } from './contexts/FileContext'
import { useAppEvents } from './hooks/useAppEvents'
import { useLocalStorage } from './hooks/useLocalStorage'
import { cn } from './lib/utils'
import { ViewMode } from './types/editor'

function EditorShell() {
  const { currentFile, content, notification, isDirty, loadFileContent, saveFile, createNewFile } =
    useEditor()

  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('zero-view-mode', 'edit')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const deferredContent = useDeferredValue(content)

  // Register shortcuts and events
  useAppEvents({
    saveFile,
    createNewFile,
    loadFileContent,
    setViewMode,
    setIsSearchOpen,
    setIsSidebarOpen,
  })

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden selection:bg-blue-500/30">
      <AnimatePresence>{isSidebarOpen && <Sidebar />}</AnimatePresence>

      <main className="flex-1 flex flex-col relative min-w-0">
        <EditorToolbar
          currentFile={currentFile}
          viewMode={viewMode}
          isDirty={isDirty}
          setViewMode={setViewMode}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          toggleSearch={() => setIsSearchOpen(true)}
        />

        <div className="flex-1 flex overflow-hidden">
          <div
            className={cn(
              'h-full overflow-auto transition-all duration-300',
              viewMode === 'edit' ? 'w-full opacity-100 visible' : '',
              viewMode === 'split' ? 'w-1/2 opacity-100 visible border-r border-white/5' : '',
              viewMode === 'preview' ? 'w-0 opacity-0 invisible overflow-hidden' : '',
            )}
          >
            <EditorCore />
          </div>

          <div
            className={cn(
              'h-full overflow-auto transition-all duration-300',
              viewMode === 'preview' ? 'w-full opacity-100 visible' : '',
              viewMode === 'split' ? 'w-1/2 opacity-100 visible' : '',
              viewMode === 'edit' ? 'w-0 opacity-0 invisible overflow-hidden' : '',
            )}
          >
            <div
              className={cn(
                'p-8 lg:p-12 prose prose-invert max-w-none bg-[#0d0d0d]',
                viewMode === 'split' ? '' : 'mx-auto max-w-4xl',
              )}
            >
              <MarkdownRenderer content={deferredContent} />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isSearchOpen && (
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          <NamingModal />
        </AnimatePresence>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className={cn(
                'absolute bottom-20 left-1/2 -translate-x-1/2 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-50 pointer-events-none',
                notification.type === 'success'
                  ? 'bg-blue-500 shadow-blue-500/40'
                  : 'bg-red-500 shadow-red-500/40',
              )}
            >
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <FileProvider>
      <EditorProvider>
        <EditorShell />
      </EditorProvider>
    </FileProvider>
  )
}
