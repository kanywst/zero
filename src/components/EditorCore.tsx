import { useEffect, useState, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { keymap } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { Extension } from '@codemirror/state'
import { useEditor } from '../contexts/EditorContext'

export function EditorCore() {
  const { content, handleContentChange, saveFile } = useEditor()
  const [extensions, setExtensions] = useState<Extension[]>([])
  const saveFileRef = useRef(saveFile)

  useEffect(() => {
    saveFileRef.current = saveFile
  }, [saveFile])

  useEffect(() => {
    setExtensions([
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
    ])
  }, [])

  return (
    <CodeMirror
      value={content}
      height="100%"
      theme={oneDark}
      extensions={extensions}
      onChange={handleContentChange}
      basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: true }}
      className="text-lg"
    />
  )
}
