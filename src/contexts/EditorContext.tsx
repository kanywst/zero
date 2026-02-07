import { createContext, useContext, ReactNode } from 'react'
import { useEditorState } from '../hooks/useEditorState'
import { useFile } from './FileContext'

interface EditorContextType {
  currentFile: string | null
  content: string
  isSaved: boolean
  isNamingOpen: boolean
  setIsNamingOpen: (open: boolean) => void
  newName: string
  setNewName: (name: string) => void
  handleContentChange: (value: string) => void
  loadFileContent: (file: string) => Promise<void>
  saveFile: () => Promise<void>
  handleCreateWithName: () => Promise<void>
  createNewFile: () => void
}

const EditorContext = createContext<EditorContextType | undefined>(undefined)

export function EditorProvider({ children }: { children: ReactNode }) {
  const { loadFiles } = useFile() // Dependency injection from FileContext
  const editor = useEditorState(loadFiles)

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}
