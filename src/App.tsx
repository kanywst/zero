import { useState, useDeferredValue } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Command as CommandMenu } from 'cmdk'
import { Search, FileText } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { MarkdownRenderer } from './components/MarkdownRenderer'
import { Sidebar } from './components/Sidebar'
import { EditorToolbar } from './components/EditorToolbar'
import { EditorCore } from './components/EditorCore'
import { EditorProvider, useEditor } from './contexts/EditorContext'
import { FileProvider, useFile } from './contexts/FileContext'
import { useAppEvents } from './hooks/useAppEvents'
import { ViewMode } from './types/editor'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function EditorShell() {
  const {
    currentFile,
    content,
    notification,
    isNamingOpen,
    setIsNamingOpen,
    newName,
    setNewName,
    loadFileContent,
    saveFile,
    handleCreateWithName,
    createNewFile,
  } = useEditor()

  const [viewMode, setViewMode] = useState<ViewMode>('edit')
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

  // Connect File/Editor interactions (e.g. CLI open) are handled inside hooks/contexts mostly,
  // but useAppEvents bridges the imperative gap.

  const { files } = useFile() // Used only for Search (CommandMenu)

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden selection:bg-blue-500/30">
      <AnimatePresence>{isSidebarOpen && <Sidebar />}</AnimatePresence>

      <main className="flex-1 flex flex-col relative min-w-0">
        <EditorToolbar
          currentFile={currentFile}
          viewMode={viewMode}
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
          {isNamingOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNamingOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-[#1a1a1a] rounded-2xl p-6 border border-white/10 shadow-2xl relative z-10"
              >
                <h3 className="text-lg font-bold mb-4 text-zinc-200">Save your masterpiece</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">
                      File Name
                    </label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="my-new-note.md"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateWithName()
                        if (e.key === 'Escape') setIsNamingOpen(false)
                      }}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleCreateWithName}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </div>
          )}
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

      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-xl bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative z-10"
            >
              <CommandMenu label="Global Command Menu">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
                  <Search size={20} className="text-zinc-500" />
                  <CommandMenu.Input
                    autoFocus
                    placeholder="Search files or commands..."
                    className="w-full bg-transparent border-none outline-none text-base text-zinc-200 placeholder:text-zinc-600"
                  />
                </div>
                <CommandMenu.List className="max-h-[300px] overflow-y-auto p-2 scroll-py-2">
                  <CommandMenu.Empty className="py-6 text-center text-zinc-500 text-sm">
                    No results found.
                  </CommandMenu.Empty>

                  <CommandMenu.Group
                    heading="Files"
                    className="px-2 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
                  >
                    {files.map((file) => (
                      <CommandMenu.Item
                        key={file}
                        onSelect={() => {
                          loadFileContent(file)
                          setIsSearchOpen(false)
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 aria-selected:bg-white/5 aria-selected:text-blue-400 transition-colors cursor-pointer"
                      >
                        <FileText size={16} />
                        {file}
                      </CommandMenu.Item>
                    ))}
                  </CommandMenu.Group>
                </CommandMenu.List>
              </CommandMenu>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
