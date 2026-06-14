import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { validateMermaidFile } from '../mermaid/validate.js'

export type DiagramType = 'flowchart' | 'sequence' | 'state' | 'er'

export type GenerateDiagramFileInput = {
  request: string
  outputPath: string
  type?: DiagramType
}

export type GenerateDiagramInput = {
  request: string
  type?: DiagramType
}

export type GeneratedDiagram = {
  diagramType: DiagramType
  assumptions: string[]
  source: string
}

export type DiagramGenerationProvider = {
  generate(input: GenerateDiagramInput): Promise<GeneratedDiagram>
}

export type GenerateDiagramFileResult =
  | {
      ok: true
      outputPath: string
      diagramType: DiagramType
      assumptions: string[]
      source: string
    }
  | {
      ok: false
      error: string
    }

export type GenerateDiagramFileOptions = {
  provider?: DiagramGenerationProvider
  validateMermaidFile?: typeof validateMermaidFile
}

export async function generateDiagramFile(
  input: GenerateDiagramFileInput,
  options: GenerateDiagramFileOptions = {},
): Promise<GenerateDiagramFileResult> {
  const request = input.request.trim()

  if (request.length === 0) {
    return { ok: false, error: 'Diagram request is empty.' }
  }

  const provider = options.provider ?? createHeuristicDiagramProvider()
  const generated = await provider.generate({
    request,
    type: input.type,
  })

  try {
    await mkdir(dirname(input.outputPath), { recursive: true })
    await writeFile(input.outputPath, generated.source, 'utf8')
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Failed to write generated Mermaid file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }

  const validate = options.validateMermaidFile ?? validateMermaidFile
  const validation = await validate(input.outputPath)

  if (!validation.ok) {
    return {
      ok: false,
      error: `Generated Mermaid failed validation: ${validation.error}`,
    }
  }

  return {
    ok: true,
    outputPath: input.outputPath,
    ...generated,
  }
}

export function createHeuristicDiagramProvider(): DiagramGenerationProvider {
  return {
    async generate(input) {
      return generateDiagramSource(input)
    },
  }
}

export function generateDiagramSource(input: GenerateDiagramInput): GeneratedDiagram {
  const diagramType = input.type ?? chooseDiagramType(input.request)
  const assumptions = ['No source context was provided; diagram is inferred from the request.']

  if (diagramType === 'sequence') {
    return {
      diagramType,
      assumptions,
      source: buildSequenceDiagram(input.request),
    }
  }

  if (diagramType === 'state') {
    return {
      diagramType,
      assumptions,
      source: buildStateDiagram(input.request),
    }
  }

  if (diagramType === 'er') {
    assumptions.push('Entities are generic placeholders because no schema was provided.')

    return {
      diagramType,
      assumptions,
      source: buildErDiagram(),
    }
  }

  return {
    diagramType,
    assumptions,
    source: buildFlowchart(input.request),
  }
}

function chooseDiagramType(request: string): DiagramType {
  const normalized = request.toLowerCase()

  if (
    /\b(sequence|interaction|message|messages|api call|calls between|between .+ and .+)\b/.test(
      normalized,
    )
  ) {
    return 'sequence'
  }

  if (/\b(state|status|lifecycle|life cycle|transition|transitions)\b/.test(normalized)) {
    return 'state'
  }

  if (
    /\b(entity|entities|schema|database|data model|relationship|relationships)\b/.test(normalized)
  ) {
    return 'er'
  }

  return 'flowchart'
}

function buildFlowchart(request: string): string {
  const steps = inferFlowSteps(request)
  const lines = ['flowchart TD']

  steps.forEach((step, index) => {
    lines.push(`  N${index + 1}["${escapeLabel(step)}"]`)
  })

  for (let index = 0; index < steps.length - 1; index += 1) {
    lines.push(`  N${index + 1} --> N${index + 2}`)
  }

  return `${lines.join('\n')}\n`
}

function buildSequenceDiagram(request: string): string {
  const actors = inferSequenceActors(request)

  return [
    'sequenceDiagram',
    `  participant A as ${actors.left}`,
    `  participant B as ${actors.right}`,
    '  A->>B: Start request',
    '  B-->>A: Return response',
    '',
  ].join('\n')
}

function buildStateDiagram(request: string): string {
  const states = inferFlowSteps(request)

  return [
    'stateDiagram-v2',
    `  [*] --> ${stateId(states[0])}`,
    ...states
      .slice(0, -1)
      .map((state, index) => `  ${stateId(state)} --> ${stateId(states[index + 1])}`),
    `  ${stateId(states.at(-1) ?? 'Complete')} --> [*]`,
    '',
  ].join('\n')
}

function buildErDiagram(): string {
  return [
    'erDiagram',
    '  USER ||--o{ RECORD : owns',
    '  RECORD ||--o{ EVENT : includes',
    '  USER {',
    '    string id',
    '    string name',
    '  }',
    '  RECORD {',
    '    string id',
    '    string status',
    '  }',
    '  EVENT {',
    '    string id',
    '    string type',
    '  }',
    '',
  ].join('\n')
}

function inferFlowSteps(request: string): string[] {
  const normalized = request.toLowerCase()

  if (normalized.includes('signup') || normalized.includes('sign up')) {
    return [
      'Landing page',
      'Sign up form',
      'Submit details',
      'Create account',
      'Send verification email',
      'Open verification email',
      'Email verified',
    ]
  }

  if (normalized.includes('ticket') && normalized.includes('lifecycle')) {
    return ['New ticket', 'Triage', 'In progress', 'Resolved', 'Closed']
  }

  const fromTo = request.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:[.!?]|$)/i)

  if (fromTo) {
    return [titleCase(fromTo[1]), 'Process request', titleCase(fromTo[2])]
  }

  return [cleanRequestLabel(request), 'Review details', 'Complete outcome']
}

function inferSequenceActors(request: string): { left: string; right: string } {
  const between = request.match(/\bbetween\s+(.+?)\s+and\s+(.+?)(?:[.!?]|$)/i)

  if (!between) {
    return { left: 'User', right: 'System' }
  }

  return {
    left: titleCase(between[1]),
    right: titleCase(between[2]),
  }
}

function cleanRequestLabel(request: string): string {
  return titleCase(
    request
      .replace(/^(show|create|generate|diagram|map)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function escapeLabel(value: string): string {
  return value.replace(/"/g, "'")
}

function stateId(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return cleaned.length > 0 ? cleaned : 'State'
}
