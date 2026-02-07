import { memo } from 'react'
import { Sidebar as SidebarIcon, FileText, Columns, Maximize2, Search } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ViewMode } from '../types/editor'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface EditorToolbarProps {
  currentFile: string | null
  viewMode: ViewMode
  setViewMode: (mode: ViewMode | ((prev: ViewMode) => ViewMode)) => void
  toggleSidebar: () => void
  toggleSearch: () => void
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

export const EditorToolbar = memo(function EditorToolbar({
  currentFile,
  viewMode,
  setViewMode,
  toggleSidebar,
  toggleSearch,
}: EditorToolbarProps) {
  return (
    <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
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
          onClick={toggleSearch}
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
  )
})
