import { useCallback, useRef, useReducer, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

export interface NotificationState {
  message: string
  type: 'success' | 'error'
}

interface EditorState {
  currentFile: string | null
  content: string
  lastSavedContent: string
  notification: NotificationState | null
  isLoading: boolean
  isNamingOpen: boolean
  newName: string
}

type EditorAction =
  | { type: 'START_LOAD' }
  | { type: 'LOAD_SUCCESS'; fileName: string; content: string }
  | { type: 'START_SAVE' }
  | { type: 'SAVE_SUCCESS'; message: string }
  | { type: 'SET_CONTENT'; content: string }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_NAMING_OPEN'; open: boolean }
  | { type: 'SET_NEW_NAME'; name: string }
  | { type: 'CLEAR_NOTIFICATION' }
  | { type: 'NEW_FILE' }

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'START_LOAD':
    case 'START_SAVE':
      return { ...state, isLoading: true, notification: null }
    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        currentFile: action.fileName,
        content: action.content,
        lastSavedContent: action.content,
        isNamingOpen: false,
      }
    case 'SAVE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        lastSavedContent: state.content,
        notification: { message: action.message, type: 'success' },
      }
    case 'SET_CONTENT':
      return { ...state, content: action.content }
    case 'SET_ERROR':
      return {
        ...state,
        isLoading: false,
        notification: { message: action.message, type: 'error' },
      }
    case 'SET_NAMING_OPEN':
      return { ...state, isNamingOpen: action.open }
    case 'SET_NEW_NAME':
      return { ...state, newName: action.name }
    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null }
    case 'NEW_FILE':
      return {
        ...state,
        currentFile: null,
        content: '# New Note\n',
        lastSavedContent: '# New Note\n',
        notification: null,
      }
    default:
      return state
  }
}

const initialState: EditorState = {
  currentFile: null,
  content: '',
  lastSavedContent: '',
  notification: null,
  isLoading: false,
  isNamingOpen: false,
  newName: '',
}

export function useEditorState(onFileSaved?: () => void) {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  // Ref sync for event handlers
  const currentFileRef = useRef(state.currentFile)
  const contentRef = useRef(state.content)

  useEffect(() => {
    currentFileRef.current = state.currentFile
    contentRef.current = state.content
  }, [state.currentFile, state.content])

  const handleContentChange = useCallback((value: string) => {
    dispatch({ type: 'SET_CONTENT', content: value })
  }, [])

  const loadFileContent = useCallback(async (fileName: string) => {
    dispatch({ type: 'START_LOAD' })
    try {
      const result: string = await invoke('read_markdown_file', { fileName })
      dispatch({ type: 'LOAD_SUCCESS', fileName, content: result })
    } catch {
      dispatch({ type: 'SET_ERROR', message: 'Failed to read file' })
    }
  }, [])

  const saveFile = useCallback(async () => {
    const fileToSave = currentFileRef.current
    const contentToSave = contentRef.current

    if (!fileToSave) {
      dispatch({ type: 'SET_NAMING_OPEN', open: true })
      return
    }

    dispatch({ type: 'START_SAVE' })
    try {
      await invoke('write_markdown_file', {
        fileName: fileToSave,
        content: contentToSave,
      })
      dispatch({ type: 'SAVE_SUCCESS', message: 'Saved' })
      setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 2000)
      onFileSaved?.()
    } catch {
      dispatch({ type: 'SET_ERROR', message: 'Failed to save' })
    }
  }, [onFileSaved])

  const handleCreateWithName = useCallback(async () => {
    if (!state.newName) return
    const fileName = state.newName.endsWith('.md') ? state.newName : `${state.newName}.md`
    const contentToSave = contentRef.current

    dispatch({ type: 'START_SAVE' })
    try {
      await invoke('write_markdown_file', {
        fileName,
        content: contentToSave,
      })
      dispatch({ type: 'LOAD_SUCCESS', fileName, content: contentToSave })
      dispatch({ type: 'SAVE_SUCCESS', message: 'Created & Saved' })
      setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 2000)
      onFileSaved?.()
    } catch {
      dispatch({ type: 'SET_ERROR', message: 'Failed to create file' })
    }
  }, [state.newName, onFileSaved])

  return {
    ...state,
    isDirty: state.content !== state.lastSavedContent,
    setIsNamingOpen: (open: boolean) => dispatch({ type: 'SET_NAMING_OPEN', open }),
    setNewName: (name: string) => dispatch({ type: 'SET_NEW_NAME', name }),
    handleContentChange,
    loadFileContent,
    saveFile,
    handleCreateWithName,
    createNewFile: () => dispatch({ type: 'NEW_FILE' }),
  }
}
