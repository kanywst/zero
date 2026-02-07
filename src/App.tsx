import { useState, useEffect, useCallback, useRef, useDeferredValue } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as selectFolder } from '@tauri-apps/plugin-dialog'
import CodeMirror from '@uiw/react-codemirror'
import { keymap } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { Extension } from '@codemirror/state'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Search,
  Sidebar as SidebarIcon,
  Columns,
  Maximize2,
  Plus,
  Command,
  FolderOpen,
  Settings,
} from 'lucide-react'
import { Command as CommandMenu } from 'cmdk'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { ViewMode } from './types/editor'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function App() {
  const [files, setFiles] = useState<string[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const deferredContent = useDeferredValue(content)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isNamingOpen, setIsNamingOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [baseDir, setBaseDir] = useState('')

  const currentFileRef = useRef(currentFile)
  const contentRef = useRef(content)

  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    contentRef.current = value
    setIsSaved(false)
  }, [])

  const loadFiles = useCallback(async () => {
    try {
      const dir: string = await invoke('get_base_dir')
      setBaseDir(dir)
      const result: string[] = await invoke('list_markdown_files')
      setFiles(result)
    } catch (err) {
      console.error('Failed to load files:', err)
    }
  }, [])

  const loadFileContent = useCallback(async (fileName: string) => {
    try {
      const result: string = await invoke('read_markdown_file', { fileName })
      setContent(result)
      contentRef.current = result
      setCurrentFile(fileName)
      currentFileRef.current = fileName
      setIsSaved(false)
      setIsNamingOpen(false)
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  }, [])

  const saveFile = useCallback(async () => {
    const fileToSave = currentFileRef.current
    const contentToSave = contentRef.current

    if (!fileToSave) {
      setIsNamingOpen(true)
      return
    }
    try {
      await invoke('write_markdown_file', {
        fileName: fileToSave,
        content: contentToSave,
      })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
      loadFiles()
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  }, [loadFiles])

  const handleCreateWithName = useCallback(async () => {
    if (!newName) return
    const fileName = newName.endsWith('.md') ? newName : `${newName}.md`
    const contentToSave = contentRef.current
    try {
      await invoke('write_markdown_file', {
        fileName,
        content: contentToSave,
      })
      setCurrentFile(fileName)
      currentFileRef.current = fileName
      setIsNamingOpen(false)
      setIsSaved(true)
      setNewName('')
      setTimeout(() => setIsSaved(false), 2000)
      await loadFiles()
    } catch (err) {
      console.error('Failed to create file:', err)
    }
  }, [newName, loadFiles])

  const changeBaseDir = useCallback(async () => {
    try {
      const selected = await selectFolder({
        directory: true,
        multiple: false,
        title: 'Select Notes Directory',
      })
      if (selected && typeof selected === 'string') {
        await invoke('set_base_dir', { newPath: selected })
        await loadFiles()
      }
    } catch (err) {
      console.error('Failed to change directory:', err)
    }
  }, [loadFiles])

  const [extensions, setExtensions] = useState<Extension[]>([])
  const saveFileRef = useRef(saveFile)

  useEffect(() => {
    saveFileRef.current = saveFile
  }, [saveFile])

  useEffect(() => {
    setExtensions([
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            saveFileRef.current()
            return true
          },
        },
      ]),
    ])
  }, []) // Initialize once

  const createNewFile = useCallback(() => {
    setCurrentFile(null)
    currentFileRef.current = null
    setContent('# New Note\n')
    contentRef.current = '# New Note\n'
    setIsSaved(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setViewMode((prev) => (prev === 'preview' ? 'edit' : 'preview'))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        setViewMode((prev) => (prev === 'split' ? 'edit' : 'split'))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsSidebarOpen((prev) => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        createNewFile()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFile, createNewFile])

  useEffect(() => {
    const unlisten = listen<string>('open-file', (event) => {
      const filePath = event.payload
      // If it's just a filename, load it. If it's a full path, we might need more logic,
      // but for now, we assume it's in the current base directory or handle it as a name.
      const fileName = filePath.split('/').pop() || filePath
      loadFileContent(fileName)
    })
    return () => {
      unlisten.then((f) => f())
    }
  }, [loadFileContent])

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      if (isMounted) {
        await loadFiles()
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [loadFiles])

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden selection:bg-blue-500/30">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-[#121212] border-r border-white/5 flex flex-col"
          >
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                Zero
              </span>
              <button
                onClick={createNewFile}
                className="p-1.5 hover:bg-white/5 rounded-md transition-colors"
              >
                <Plus size={16} className="text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-hide">
              {files.map((file) => (
                <button
                  key={file}
                  onClick={() => loadFileContent(file)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 group',
                    currentFile === file
                      ? 'bg-blue-500/10 text-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                  )}
                >
                  <FileText
                    size={14}
                    className={currentFile === file ? 'text-blue-400' : 'text-zinc-500'}
                  />
                  <span className="truncate">{file.replace('.md', '')}</span>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  Storage
                </span>
                <button
                  onClick={changeBaseDir}
                  className="p-1 hover:bg-white/5 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Settings size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-900/50 border border-white/5">
                <FolderOpen size={12} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-400 truncate font-mono">
                  {baseDir.split('/').pop() || 'Home'}
                </span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400"
            >
              <SidebarIcon size={18} />
            </button>
            <h2 className="text-sm font-medium text-zinc-300 truncate max-w-[200px]">
              {currentFile || 'Untitled'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
            <ViewButton
              active={viewMode === 'edit'}
              onClick={() => setViewMode('edit')}
              icon={<FileText size={16} />}
              label="Edit"
            />
            <ViewButton
              active={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              icon={<Columns size={16} />}
              label="Split"
            />
            <ViewButton
              active={viewMode === 'preview'}
              onClick={() => setViewMode('preview')}
              icon={<Maximize2 size={16} />}
              label="Preview"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 flex items-center gap-2 px-3 border border-white/5"
            >
              <Search size={16} />
              <span className="text-xs text-zinc-500 hidden sm:inline">Search...</span>
              <kbd className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-500 font-sans">
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div
            className={cn(
              'h-full overflow-auto transition-all duration-300',
              viewMode === 'edit' ? 'w-full opacity-100 visible' : '',
              viewMode === 'split' ? 'w-1/2 opacity-100 visible border-r border-white/5' : '',
              viewMode === 'preview' ? 'w-0 opacity-0 invisible overflow-hidden' : '',
            )}
          >
            <CodeMirror
              value={content}
              height="100%"
              theme={oneDark}
              extensions={extensions}
              onChange={handleContentChange}
              basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: true }}
              className="text-lg"
            />
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
          {isSaved && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-50"
            >
              saved
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

      <div className="fixed bottom-4 right-4 flex items-center gap-3 pointer-events-none">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-3 text-[10px] text-zinc-500 font-medium"
        >
          <div className="flex items-center gap-1.5">
            <Command size={10} />
            <span>S Save</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <Command size={10} />
            <span>A Preview</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <Command size={10} />
            <span>K Search</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
        active
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
