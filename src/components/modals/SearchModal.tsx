import { motion } from 'framer-motion'
import { Command as CommandMenu } from 'cmdk'
import { Search, FileText } from 'lucide-react'
import { useFile } from '../../contexts/FileContext'
import { useEditor } from '../../contexts/EditorContext'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { files } = useFile()
  const { loadFileContent } = useEditor()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
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
                    onClose()
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
  )
}
