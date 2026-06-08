import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false })

const knownDiagramStarters = [
  'flowchart',
  'graph',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'mindmap',
  'timeline',
  'gitGraph',
  'quadrantChart',
  'requirementDiagram',
  'C4Context',
]

export type MermaidValidationResult =
  | {
      ok: true
    }
  | {
      ok: false
      error: string
    }

export type ValidateMermaidFileResult =
  | {
      ok: true
      inputPath: string
    }
  | {
      ok: false
      error: string
    }

export type RendererSyntaxValidator = (inputPath: string) => Promise<MermaidValidationResult>

export type ValidateMermaidFileOptions = {
  validateWithRenderer?: RendererSyntaxValidator
}

type MermaidSourceValidationAnalysis =
  | MermaidValidationResult
  | {
      ok: true
      needsRendererValidation: true
    }

export async function validateMermaidSource(source: string): Promise<MermaidValidationResult> {
  const analysis = await analyzeMermaidSource(source)

  if ('needsRendererValidation' in analysis) {
    return { ok: true }
  }

  return analysis
}

async function analyzeMermaidSource(source: string): Promise<MermaidSourceValidationAnalysis> {
  const trimmed = source.trim()

  if (trimmed.length === 0) {
    return { ok: false, error: 'Mermaid source is empty.' }
  }

  const firstLine = findFirstDiagramLine(trimmed)
  const startsWithKnownDiagram = knownDiagramStarters.some(
    (starter) => firstLine === starter || firstLine.startsWith(`${starter} `),
  )

  if (!startsWithKnownDiagram) {
    return {
      ok: false,
      error: `First line must start with a supported Mermaid diagram type. Found: "${firstLine}"`,
    }
  }

  try {
    await mermaid.parse(trimmed)
  } catch (error: unknown) {
    // Mermaid's Node parser can hit browser-only sanitizer code for labels.
    // Rendering with mmdc still performs the final syntax check for those files.
    if (isMermaidParserEnvironmentError(error)) {
      return { ok: true, needsRendererValidation: true }
    }

    return {
      ok: false,
      error: `Mermaid syntax error: ${formatMermaidParseError(error)}`,
    }
  }

  return { ok: true }
}

export async function validateMermaidFile(
  inputPath: string,
  options: ValidateMermaidFileOptions = {},
): Promise<ValidateMermaidFileResult> {
  let source: string

  try {
    source = await readFile(inputPath, 'utf8')
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { ok: false, error: `Mermaid source file not found: ${inputPath}` }
    }

    return {
      ok: false,
      error: `Failed to read Mermaid source file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }

  const validation = await analyzeMermaidSource(source)

  if (!validation.ok) {
    return validation
  }

  if ('needsRendererValidation' in validation) {
    const validateWithRenderer = options.validateWithRenderer ?? runDefaultRendererSyntaxValidator
    const rendererValidation = await validateWithRenderer(inputPath)

    if (!rendererValidation.ok) {
      return rendererValidation
    }
  }

  return { ok: true, inputPath }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

function findFirstDiagramLine(source: string): string {
  const lines = source.split(/\r?\n/)
  let index = 0

  if (lines[index]?.trim() === '---') {
    index += 1

    while (index < lines.length && lines[index]?.trim() !== '---') {
      index += 1
    }

    if (lines[index]?.trim() === '---') {
      index += 1
    }
  }

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? ''

    if (line.length > 0 && !line.startsWith('%%')) {
      return line
    }

    index += 1
  }

  return ''
}

function formatMermaidParseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)

  return lines.join(' ')
}

function isMermaidParserEnvironmentError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message === 'DOMPurify.addHook is not a function' ||
    message === 'DOMPurify.sanitize is not a function'
  )
}

async function runDefaultRendererSyntaxValidator(
  inputPath: string,
): Promise<MermaidValidationResult> {
  const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-validate-'))
  const outputPath = join(directory, 'syntax-check.svg')

  try {
    return await runMermaidCliSyntaxCheck(inputPath, outputPath)
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
}

function runMermaidCliSyntaxCheck(
  inputPath: string,
  outputPath: string,
): Promise<MermaidValidationResult> {
  return new Promise((resolve) => {
    const child = spawn('mmdc', ['-i', inputPath, '-o', outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      resolve({
        ok: false,
        error: `Failed to start Mermaid syntax renderer: ${error.message}`,
      })
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true })
        return
      }

      resolve({
        ok: false,
        error:
          stderr.trim() ||
          `Mermaid syntax renderer exited with code ${code ?? 'unknown'} without an error message.`,
      })
    })
  })
}
