import { invoke } from '@tauri-apps/api/core'

/**
 * Strongly typed Tauri commands.
 * This mirrors the commands defined in src-tauri/src/lib.rs
 */

export async function getBaseDir(): Promise<string> {
  return invoke('get_base_dir')
}

export async function setBaseDir(newPath: string): Promise<void> {
  return invoke('set_base_dir', { newPath })
}

export async function listMarkdownFiles(): Promise<string[]> {
  return invoke('list_markdown_files')
}

export async function readMarkdownFile(fileName: string): Promise<string> {
  return invoke('read_markdown_file', { fileName })
}

export async function writeMarkdownFile(fileName: string, content: string): Promise<void> {
  return invoke('write_markdown_file', { fileName, content })
}

export async function parseMarkdown(content: string): Promise<string> {
  return invoke('parse_markdown', { content })
}

export async function openUrl(url: string): Promise<void> {
  return invoke('open_url', { url })
}
