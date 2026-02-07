import { createContext, useContext, ReactNode, useMemo } from 'react'
import { useFileExplorer } from '../hooks/useFileExplorer'

interface FileContextType {
  files: string[]
  baseDir: string
  loadFiles: () => Promise<void>
  changeBaseDir: () => Promise<void>
}

const FileContext = createContext<FileContextType | undefined>(undefined)

export function FileProvider({ children }: { children: ReactNode }) {
  const explorer = useFileExplorer()

  const value = useMemo(
    () => ({
      ...explorer,
    }),
    [explorer],
  )

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>
}

export function useFile() {
  const context = useContext(FileContext)
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider')
  }
  return context
}
