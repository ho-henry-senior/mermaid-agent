import { spawn } from 'node:child_process'

import { validateMermaidFile } from './validate.js'

export type RenderMermaidFileInput = {
  inputPath: string
  outputPath: string
  options?: RenderMermaidOptions
}

export type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral'

export type RenderMermaidOptions = {
  theme?: MermaidTheme
  backgroundColor?: string
  width?: number
  height?: number
}

export type RenderMermaidFileResult =
  | {
      ok: true
      outputPath: string
    }
  | {
      ok: false
      error: string
    }

export type MermaidCliRunner = (input: RenderMermaidFileInput) => Promise<RenderMermaidFileResult>

export type RenderMermaidFileOptions = {
  runMermaidCli?: MermaidCliRunner
}

export async function renderMermaidFile(
  input: RenderMermaidFileInput,
  options: RenderMermaidFileOptions = {},
): Promise<RenderMermaidFileResult> {
  const validation = await validateMermaidFile(input.inputPath)

  if (!validation.ok) {
    return validation
  }

  const runMermaidCli = options.runMermaidCli ?? runDefaultMermaidCli

  return runMermaidCli(input)
}

function runDefaultMermaidCli(input: RenderMermaidFileInput): Promise<RenderMermaidFileResult> {
  return new Promise((resolve) => {
    const child = spawn('mmdc', buildMermaidCliArgs(input), {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      resolve({
        ok: false,
        error: classifyRendererStartupError(error),
      })
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, outputPath: input.outputPath })
        return
      }

      resolve({
        ok: false,
        error: classifyRendererExitError(code, stderr),
      })
    })
  })
}

export function buildMermaidCliArgs(input: RenderMermaidFileInput): string[] {
  const args = ['-i', input.inputPath, '-o', input.outputPath]
  const { options } = input

  if (!options) {
    return args
  }

  if (options.theme) {
    args.push('--theme', options.theme)
  }

  if (options.backgroundColor) {
    args.push('--backgroundColor', options.backgroundColor)
  }

  if (options.width) {
    args.push('--width', String(options.width))
  }

  if (options.height) {
    args.push('--height', String(options.height))
  }

  return args
}

export function classifyRendererStartupError(error: NodeJS.ErrnoException): string {
  if (error.code === 'ENOENT') {
    return 'Mermaid renderer not found. Ensure `mmdc` is installed and available on PATH.'
  }

  if (error.code === 'EACCES') {
    return `Mermaid renderer is not executable: ${error.message}`
  }

  return `Failed to start Mermaid renderer: ${error.message}`
}

export function classifyRendererExitError(code: number | null, stderr: string): string {
  const message = stderr.trim()

  if (!message) {
    return `Mermaid renderer exited with code ${code ?? 'unknown'} without an error message.`
  }

  if (mentionsBrowserFailure(message)) {
    return `Mermaid renderer could not start a browser: ${message}`
  }

  if (mentionsSyntaxFailure(message)) {
    return `Mermaid renderer reported a syntax error: ${message}`
  }

  if (mentionsFilesystemFailure(message)) {
    return `Mermaid renderer could not access an input or output file: ${message}`
  }

  return `Mermaid renderer failed with code ${code ?? 'unknown'}: ${message}`
}

function mentionsBrowserFailure(message: string): boolean {
  return /browser|chrome|chromium|puppeteer/i.test(message)
}

function mentionsSyntaxFailure(message: string): boolean {
  return /parse error|syntax error|lexical error/i.test(message)
}

function mentionsFilesystemFailure(message: string): boolean {
  return /enoent|eacces|permission denied|no such file|not a directory/i.test(message)
}
