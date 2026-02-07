import { useState, useCallback, useEffect } from 'react'
import { open as selectFolder } from '@tauri-apps/plugin-dialog'
import { getBaseDir, listMarkdownFiles, setBaseDir as apiSetBaseDir } from '../api/commands'

export function useFileExplorer() {
  const [files, setFiles] = useState<string[]>([])
  const [baseDir, setBaseDir] = useState('')

  const loadFiles = useCallback(async () => {
    try {
      const [dir, fileList] = await Promise.all([getBaseDir(), listMarkdownFiles()])
      setBaseDir(dir)
      setFiles(fileList)
    } catch (err) {
      console.error('Failed to load files:', err)
    }
  }, [])

  const changeBaseDir = useCallback(async () => {
    try {
      const selected = await selectFolder({
        directory: true,
        multiple: false,
        title: 'Select Notes Directory',
      })

      if (selected && typeof selected === 'string') {
        await apiSetBaseDir(selected)
        await loadFiles()
      }
    } catch (err) {
      console.error('Failed to change directory:', err)
    }
  }, [loadFiles])

  // Initial load
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      if (isMounted) {
        await loadFiles()
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [loadFiles])

  return {
    files,
    baseDir,
    loadFiles,
    changeBaseDir,
  }
}
