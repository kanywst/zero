import { motion } from 'framer-motion'
import { FileText, Plus, FolderOpen, Settings } from 'lucide-react'
import { useFile } from '../contexts/FileContext'
import { useEditor } from '../contexts/EditorContext'
import { cn } from '../lib/utils'

export function Sidebar() {
  const { files, baseDir, changeBaseDir } = useFile()
  const { currentFile, loadFileContent, createNewFile, isDirty } = useEditor()

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-full bg-[#121212] border-r border-white/5 flex flex-col"
    >
      <div className="p-4 flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Zero</span>
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
            <span className="truncate flex-1 text-left">{file.replace('.md', '')}</span>
            {currentFile === file && isDirty && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}
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
  )
}
