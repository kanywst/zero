export type ViewMode = 'edit' | 'split' | 'preview'

export interface FileMetadata {
  name: string
  path: string
}

export interface EditorState {
  currentFile: string | null
  content: string
  viewMode: ViewMode
  isSidebarOpen: boolean
  isSearchOpen: boolean
  isSaved: boolean
  isNamingOpen: boolean
  newName: string
  baseDir: string
}
