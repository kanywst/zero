import { useState, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

export function useEditorState(onFileSaved?: () => void) {
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [isNamingOpen, setIsNamingOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const currentFileRef = useRef(currentFile)
  const contentRef = useRef(content)

  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    contentRef.current = value
    setIsSaved(false)
  }, [])

  const loadFileContent = useCallback(async (fileName: string) => {
    try {
      const result: string = await invoke('read_markdown_file', { fileName })
      setContent(result)
      contentRef.current = result
      setCurrentFile(fileName)
      currentFileRef.current = fileName
      setIsSaved(false)
      setIsNamingOpen(false)
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  }, [])

  const saveFile = useCallback(async () => {
    const fileToSave = currentFileRef.current
    const contentToSave = contentRef.current

    if (!fileToSave) {
      setIsNamingOpen(true)
      return
    }
    try {
      await invoke('write_markdown_file', {
        fileName: fileToSave,
        content: contentToSave,
      })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
      onFileSaved?.()
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  }, [onFileSaved])

  const handleCreateWithName = useCallback(async () => {
    if (!newName) return
    const fileName = newName.endsWith('.md') ? newName : `${newName}.md`
    const contentToSave = contentRef.current
    try {
      await invoke('write_markdown_file', {
        fileName,
        content: contentToSave,
      })
      setCurrentFile(fileName)
      currentFileRef.current = fileName
      setIsNamingOpen(false)
      setIsSaved(true)
      setNewName('')
      setTimeout(() => setIsSaved(false), 2000)
      onFileSaved?.()
    } catch (err) {
      console.error('Failed to create file:', err)
    }
  }, [newName, onFileSaved])

  const createNewFile = useCallback(() => {
    setCurrentFile(null)
    currentFileRef.current = null
    setContent('# New Note\n')
    contentRef.current = '# New Note\n'
    setIsSaved(false)
  }, [])

  return {
    currentFile,
    content,
    isSaved,
    isNamingOpen,
    setIsNamingOpen,
    newName,
    setNewName,
    handleContentChange,
    loadFileContent,
    saveFile,
    handleCreateWithName,
    createNewFile,
  }
}
