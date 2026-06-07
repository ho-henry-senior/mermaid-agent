import { spawn } from 'node:child_process'

import { validateMermaidFile } from './validate.js'

export type RenderMermaidFileInput = {
  inputPath: string
  outputPath: string
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

export async function renderMermaidFile(
  input: RenderMermaidFileInput,
): Promise<RenderMermaidFileResult> {
  const validation = await validateMermaidFile(input.inputPath)

  if (!validation.ok) {
    return validation
  }

  return new Promise((resolve) => {
    const child = spawn('mmdc', ['-i', input.inputPath, '-o', input.outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      resolve({
        ok: false,
        error: `Failed to start Mermaid renderer: ${error.message}`,
      })
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, outputPath: input.outputPath })
        return
      }

      resolve({
        ok: false,
        error: stderr.trim() || `Mermaid renderer exited with code ${code}`,
      })
    })
  })
}
