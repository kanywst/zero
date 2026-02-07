import { useState, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

export interface NotificationState {
  message: string
  type: 'success' | 'error'
}

export function useEditorState(onFileSaved?: () => void) {
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [notification, setNotification] = useState<NotificationState | null>(null)
  const [isNamingOpen, setIsNamingOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const currentFileRef = useRef(currentFile)
  const contentRef = useRef(content)

  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value)
      contentRef.current = value
      if (notification?.type === 'success') {
        setNotification(null)
      }
    },
    [notification],
  )

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    if (type === 'success') {
      setTimeout(() => setNotification(null), 2000)
    }
  }, [])

  const loadFileContent = useCallback(
    async (fileName: string) => {
      setIsLoading(true)
      try {
        const result: string = await invoke('read_markdown_file', { fileName })
        setContent(result)
        contentRef.current = result
        setCurrentFile(fileName)
        currentFileRef.current = fileName
        setNotification(null)
        setIsNamingOpen(false)
      } catch (err) {
        console.error('Failed to read file:', err)
        showNotification('Failed to read file', 'error')
      } finally {
        setIsLoading(false)
      }
    },
    [showNotification],
  )

  const saveFile = useCallback(async () => {
    const fileToSave = currentFileRef.current
    const contentToSave = contentRef.current

    if (!fileToSave) {
      setIsNamingOpen(true)
      return
    }

    setIsLoading(true)
    try {
      await invoke('write_markdown_file', {
        fileName: fileToSave,
        content: contentToSave,
      })
      showNotification('Saved', 'success')
      onFileSaved?.()
    } catch (err) {
      console.error('Failed to save file:', err)
      showNotification('Failed to save', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [onFileSaved, showNotification])

  const handleCreateWithName = useCallback(async () => {
    if (!newName) return
    const fileName = newName.endsWith('.md') ? newName : `${newName}.md`
    const contentToSave = contentRef.current

    setIsLoading(true)
    try {
      await invoke('write_markdown_file', {
        fileName,
        content: contentToSave,
      })
      setCurrentFile(fileName)
      currentFileRef.current = fileName
      setIsNamingOpen(false)
      showNotification('Created & Saved', 'success')
      setNewName('')
      onFileSaved?.()
    } catch (err) {
      console.error('Failed to create file:', err)
      showNotification('Failed to create file', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [newName, onFileSaved, showNotification])

  const createNewFile = useCallback(() => {
    setCurrentFile(null)
    currentFileRef.current = null
    setContent('# New Note\n')
    contentRef.current = '# New Note\n'
    setNotification(null)
  }, [])

  return {
    currentFile,
    content,
    notification, // Export notification instead of isSaved
    isNamingOpen,
    setIsNamingOpen,
    newName,
    setNewName,
    isLoading,
    handleContentChange,
    loadFileContent,
    saveFile,
    handleCreateWithName,
    createNewFile,
  }
}
