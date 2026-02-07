import { useEffect, useState, useRef, memo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { keymap } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { Extension } from '@codemirror/state'
import { useEditor } from '../contexts/EditorContext'

export const EditorCore = memo(function EditorCore() {
  const { content, handleContentChange, saveFile } = useEditor()
  const [extensions, setExtensions] = useState<Extension[]>([])
  const saveFileRef = useRef(saveFile)

  useEffect(() => {
    saveFileRef.current = saveFile
  }, [saveFile])

  useEffect(() => {
    // Only initialize once to prevent flicker
    const exts = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            saveFileRef.current()
            return true
          },
        },
      ]),
    ]
    setExtensions(exts)
  }, [])

  return (
    <div className="h-full w-full bg-[#282c34] editor-container">
      <CodeMirror
        value={content}
        height="100%"
        theme={oneDark}
        extensions={extensions}
        onChange={handleContentChange}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
        }}
        className="text-lg focus-within:ring-1 focus-within:ring-blue-500/20 transition-all duration-300"
      />
    </div>
  )
})
