import { motion } from 'framer-motion'
import { useEditor } from '../../contexts/EditorContext'

export function NamingModal() {
  const { isNamingOpen, setIsNamingOpen, newName, setNewName, handleCreateWithName } = useEditor()

  if (!isNamingOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsNamingOpen(false)}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
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
  )
}
