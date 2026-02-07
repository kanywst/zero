import { createContext, useContext, ReactNode } from 'react'
import { useFileExplorer } from '../hooks/useFileExplorer'
import { useEditorState } from '../hooks/useEditorState'

interface EditorContextType {
  // Explorer
  files: string[]
  baseDir: string
  changeBaseDir: () => void

  // Editor
  currentFile: string | null
  content: string
  isSaved: boolean
  isNamingOpen: boolean
  setIsNamingOpen: (open: boolean) => void
  newName: string
  setNewName: (name: string) => void
  handleContentChange: (value: string) => void
  loadFileContent: (file: string) => void
  saveFile: () => void
  handleCreateWithName: () => void
  createNewFile: () => void
}

const EditorContext = createContext<EditorContextType | undefined>(undefined)

export function EditorProvider({ children }: { children: ReactNode }) {
  const explorer = useFileExplorer()
  const editor = useEditorState(explorer.loadFiles)

  const value: EditorContextType = {
    ...explorer,
    ...editor,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}
