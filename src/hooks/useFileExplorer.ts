import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open as selectFolder } from '@tauri-apps/plugin-dialog'

export function useFileExplorer() {
  const [files, setFiles] = useState<string[]>([])
  const [baseDir, setBaseDir] = useState('')

  const loadFiles = useCallback(async () => {
    try {
      const dir: string = await invoke('get_base_dir')
      setBaseDir(dir)
      const result: string[] = await invoke('list_markdown_files')
      setFiles(result)
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
        await invoke('set_base_dir', { newPath: selected })
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
