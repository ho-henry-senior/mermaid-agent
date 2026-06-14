import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  DiagramGenerationProvider,
  DiagramType,
  GenerateDiagramInput,
  GeneratedDiagram,
} from './generate.js'

const defaultPromptPath = join(dirname(fileURLToPath(import.meta.url)), 'prompt.md')
const defaultModel = 'gpt-5.5'

export type OpenAiResponsesClient = {
  createResponse(input: OpenAiResponseCreateInput): Promise<unknown>
}

export type OpenAiDiagramProviderOptions = {
  apiKey?: string
  model?: string
  prompt?: string
  promptPath?: string
  client?: OpenAiResponsesClient
}

export type OpenAiResponseCreateInput = {
  model: string
  instructions: string
  input: string
  text: {
    format: {
      type: 'json_schema'
      name: string
      strict: true
      schema: Record<string, unknown>
    }
  }
}

export function createOpenAiDiagramProvider(
  options: OpenAiDiagramProviderOptions = {},
): DiagramGenerationProvider {
  const model = options.model ?? process.env.OPENAI_MODEL ?? defaultModel
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY
  const client = options.client ?? createFetchOpenAiResponsesClient({ apiKey })
  let promptPromise: Promise<string> | undefined

  return {
    async generate(input) {
      const prompt =
        options.prompt ??
        (await (promptPromise ??= readFile(options.promptPath ?? defaultPromptPath, 'utf8')))
      const response = await client.createResponse({
        model,
        instructions: buildInstructions(prompt),
        input: buildUserInput(input),
        text: {
          format: {
            type: 'json_schema',
            name: 'mermaid_diagram_generation',
            strict: true,
            schema: diagramGenerationSchema,
          },
        },
      })

      return parseOpenAiDiagramResponse(response)
    },
  }
}

export function createFetchOpenAiResponsesClient(options: {
  apiKey?: string
  endpoint?: string
}): OpenAiResponsesClient {
  return {
    async createResponse(input) {
      if (!options.apiKey) {
        throw new Error('OPENAI_API_KEY is required when using the openai generation provider.')
      }

      const response = await fetch(options.endpoint ?? 'https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      const body = await response.text()

      if (!response.ok) {
        throw new Error(`OpenAI Responses API failed with ${response.status}: ${body}`)
      }

      return JSON.parse(body) as unknown
    },
  }
}

export function parseOpenAiDiagramResponse(response: unknown): GeneratedDiagram {
  const outputText = extractOutputText(response)

  if (!outputText) {
    throw new Error('OpenAI response did not include output text.')
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(outputText)
  } catch (error: unknown) {
    throw new Error(
      `OpenAI response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return parseGeneratedDiagram(parsed)
}

function buildInstructions(prompt: string): string {
  return [
    prompt.trim(),
    '',
    'Return only structured JSON matching the requested schema.',
    'The source field must contain Mermaid source without Markdown fences.',
  ].join('\n')
}

function buildUserInput(input: GenerateDiagramInput): string {
  const lines = [`Diagram request: ${input.request}`]

  if (input.type) {
    lines.push(`Required diagram type: ${input.type}`)
  }

  return lines.join('\n')
}

function extractOutputText(response: unknown): string | undefined {
  if (!isRecord(response)) {
    return undefined
  }

  if (typeof response.output_text === 'string') {
    return response.output_text
  }

  if (!Array.isArray(response.output)) {
    return undefined
  }

  for (const item of response.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue
    }

    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') {
        return content.text
      }
    }
  }

  return undefined
}

function parseGeneratedDiagram(value: unknown): GeneratedDiagram {
  if (!isRecord(value)) {
    throw new Error('OpenAI diagram response must be a JSON object.')
  }

  if (!isDiagramType(value.diagramType)) {
    throw new Error('OpenAI diagram response has an unsupported diagramType.')
  }

  if (typeof value.source !== 'string' || value.source.trim().length === 0) {
    throw new Error('OpenAI diagram response must include non-empty Mermaid source.')
  }

  if (!Array.isArray(value.assumptions) || !value.assumptions.every(isString)) {
    throw new Error('OpenAI diagram response assumptions must be an array of strings.')
  }

  return {
    diagramType: value.diagramType,
    source: value.source,
    assumptions: value.assumptions,
  }
}

function isDiagramType(value: unknown): value is DiagramType {
  return value === 'flowchart' || value === 'sequence' || value === 'state' || value === 'er'
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const diagramGenerationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    diagramType: {
      type: 'string',
      enum: ['flowchart', 'sequence', 'state', 'er'],
    },
    source: {
      type: 'string',
      description: 'Valid Mermaid source without Markdown fences.',
    },
    assumptions: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['diagramType', 'source', 'assumptions'],
}
