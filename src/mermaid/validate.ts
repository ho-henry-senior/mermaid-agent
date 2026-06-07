import { readFile } from 'node:fs/promises'

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

export function validateMermaidSource(source: string): MermaidValidationResult {
  const trimmed = source.trim()

  if (trimmed.length === 0) {
    return { ok: false, error: 'Mermaid source is empty.' }
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? ''
  const startsWithKnownDiagram = knownDiagramStarters.some(
    (starter) => firstLine === starter || firstLine.startsWith(`${starter} `),
  )

  if (!startsWithKnownDiagram) {
    return {
      ok: false,
      error: `First line must start with a supported Mermaid diagram type. Found: "${firstLine}"`,
    }
  }

  return { ok: true }
}

export async function validateMermaidFile(inputPath: string): Promise<ValidateMermaidFileResult> {
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

  const validation = validateMermaidSource(source)

  if (!validation.ok) {
    return validation
  }

  return { ok: true, inputPath }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
