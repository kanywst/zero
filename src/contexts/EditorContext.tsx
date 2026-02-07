import { createContext, useContext, ReactNode, useMemo } from 'react'
import { useEditorState, NotificationState } from '../hooks/useEditorState'
import { useFile } from './FileContext'

interface EditorContextType {
  currentFile: string | null
  content: string
  notification: NotificationState | null
  isNamingOpen: boolean
  isLoading: boolean
  isDirty: boolean
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
  const { loadFiles } = useFile()
  const editor = useEditorState(loadFiles)

  const value = useMemo(
    () => ({
      ...editor,
    }),
    [editor],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}
