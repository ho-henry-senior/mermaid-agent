import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import {
  generateDiagramFile,
  type DiagramType,
  type GenerateDiagramFileResult,
} from './agent/generate.js'
import {
  renderMermaidFile,
  type MermaidTheme,
  type RenderMermaidFileResult,
  type RenderMermaidOptions,
} from './mermaid/render.js'
import { validateMermaidFile, type ValidateMermaidFileResult } from './mermaid/validate.js'

type CliIo = {
  stdout: Pick<typeof process.stdout, 'write'>
  stderr: Pick<typeof process.stderr, 'write'>
}

type RunCliOptions = {
  cwd?: string
  io?: CliIo
  operations?: {
    generateDiagramFile?: typeof generateDiagramFile
    renderMermaidFile?: typeof renderMermaidFile
    validateMermaidFile?: typeof validateMermaidFile
  }
}

function usage(): string {
  return [
    'Usage:',
    '  npm run generate -- "<request>" <output.mmd> [--type <type>] [--render <output.svg>] [--theme <theme>] [--background-color <color>] [--width <px>] [--height <px>]',
    '  npm run validate -- <input.mmd>',
    '  npm run render -- <input.mmd> <output.svg> [--theme <theme>] [--background-color <color>] [--width <px>] [--height <px>]',
    '',
    'Example:',
    '  npm run generate -- "show the signup flow from landing page to email verification" examples/signup-flow.mmd',
    '  npm run validate -- examples/signup-flow.mmd',
    '  npm run render -- examples/signup-flow.mmd examples/signup-flow.svg --theme neutral --background-color transparent',
  ].join('\n')
}

export async function runCli(args: string[], options: RunCliOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd()
  const io = options.io ?? {
    stdout: process.stdout,
    stderr: process.stderr,
  }
  const operations = {
    generateDiagramFile,
    renderMermaidFile,
    validateMermaidFile,
    ...options.operations,
  }
  const [command, input, output, ...renderArgs] = args

  if (command === 'generate' && input && output) {
    const generateOptions = parseGenerateOptions(renderArgs)

    if (!generateOptions.ok) {
      io.stderr.write(`${generateOptions.error}\n`)
      return 1
    }

    const result: GenerateDiagramFileResult = await operations.generateDiagramFile({
      request: input,
      outputPath: resolve(cwd, output),
      type: generateOptions.type,
    })

    if (!result.ok) {
      io.stderr.write(`${result.error}\n`)
      return 1
    }

    io.stdout.write(`Generated ${result.diagramType} diagram.\n`)
    io.stdout.write(`Mermaid: ${result.outputPath}\n`)

    if (generateOptions.renderOutputPath) {
      const renderResult = await operations.renderMermaidFile({
        inputPath: result.outputPath,
        outputPath: resolve(cwd, generateOptions.renderOutputPath),
        options: generateOptions.renderOptions,
      })

      if (!renderResult.ok) {
        io.stderr.write(`${renderResult.error}\n`)
        return 1
      }

      io.stdout.write(`SVG: ${renderResult.outputPath}\n`)
    }

    if (result.assumptions.length > 0) {
      io.stdout.write(`Assumptions: ${result.assumptions.join(' ')}\n`)
    }

    return 0
  }

  if (command === 'validate' && input && !output) {
    const result: ValidateMermaidFileResult = await operations.validateMermaidFile(
      resolve(cwd, input),
    )

    if (!result.ok) {
      io.stderr.write(`${result.error}\n`)
      return 1
    }

    io.stdout.write(`Valid ${result.inputPath}\n`)
    return 0
  }

  if (command !== 'render' || !input || !output) {
    io.stderr.write(`${usage()}\n`)
    return 1
  }

  const renderOptions = parseRenderOptions(renderArgs)

  if (!renderOptions.ok) {
    io.stderr.write(`${renderOptions.error}\n`)
    return 1
  }

  const result: RenderMermaidFileResult = await operations.renderMermaidFile({
    inputPath: resolve(cwd, input),
    outputPath: resolve(cwd, output),
    options: renderOptions.options,
  })

  if (!result.ok) {
    io.stderr.write(`${result.error}\n`)
    return 1
  }

  io.stdout.write(`Rendered ${result.outputPath}\n`)
  return 0
}

type ParseRenderOptionsResult =
  | {
      ok: true
      options: RenderMermaidOptions
    }
  | {
      ok: false
      error: string
    }

type ParseGenerateOptionsResult =
  | {
      ok: true
      type?: DiagramType
      renderOutputPath?: string
      renderOptions: RenderMermaidOptions
    }
  | {
      ok: false
      error: string
    }

const supportedThemes = new Set<MermaidTheme>(['default', 'forest', 'dark', 'neutral'])
const supportedDiagramTypes = new Set<DiagramType>(['flowchart', 'sequence', 'state', 'er'])

function parseGenerateOptions(args: string[]): ParseGenerateOptionsResult {
  const renderOptions: RenderMermaidOptions = {}
  let type: DiagramType | undefined
  let renderOutputPath: string | undefined

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    const value = args[index + 1]

    if (!value || value.startsWith('--')) {
      return { ok: false, error: `Missing value for generate option ${flag}.` }
    }

    if (flag === '--type') {
      if (!isDiagramType(value)) {
        return {
          ok: false,
          error: `Unsupported diagram type "${value}". Use one of: flowchart, sequence, state, er.`,
        }
      }

      type = value
      index += 1
      continue
    }

    if (flag === '--render') {
      renderOutputPath = value
      index += 1
      continue
    }

    const renderOption = parseRenderOption(flag, value, renderOptions)

    if (!renderOption.ok) {
      return {
        ok: false,
        error:
          renderOption.error === `Unknown render option ${flag}.`
            ? `Unknown generate option ${flag}.`
            : renderOption.error,
      }
    }

    index += 1
  }

  if (Object.keys(renderOptions).length > 0 && !renderOutputPath) {
    return { ok: false, error: 'Render options require --render <output.svg>.' }
  }

  return { ok: true, type, renderOutputPath, renderOptions }
}

function parseRenderOptions(args: string[]): ParseRenderOptionsResult {
  const options: RenderMermaidOptions = {}

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    const value = args[index + 1]

    if (!value || value.startsWith('--')) {
      return { ok: false, error: `Missing value for render option ${flag}.` }
    }

    const renderOption = parseRenderOption(flag, value, options)

    if (!renderOption.ok) {
      return renderOption
    }

    index += 1
  }

  return { ok: true, options }
}

function parseRenderOption(
  flag: string,
  value: string,
  options: RenderMermaidOptions,
): { ok: true } | { ok: false; error: string } {
  if (flag === '--theme') {
    if (!isMermaidTheme(value)) {
      return {
        ok: false,
        error: `Unsupported Mermaid theme "${value}". Use one of: default, forest, dark, neutral.`,
      }
    }

    options.theme = value
    return { ok: true }
  }

  if (flag === '--background-color') {
    options.backgroundColor = value
    return { ok: true }
  }

  if (flag === '--width') {
    const width = parsePositiveIntegerOption('width', value)

    if (!width.ok) {
      return width
    }

    options.width = width.value
    return { ok: true }
  }

  if (flag === '--height') {
    const height = parsePositiveIntegerOption('height', value)

    if (!height.ok) {
      return height
    }

    options.height = height.value
    return { ok: true }
  }

  return { ok: false, error: `Unknown render option ${flag}.` }
}

function isMermaidTheme(value: string): value is MermaidTheme {
  return supportedThemes.has(value as MermaidTheme)
}

function isDiagramType(value: string): value is DiagramType {
  return supportedDiagramTypes.has(value as DiagramType)
}

function parsePositiveIntegerOption(
  name: string,
  value: string,
):
  | {
      ok: true
      value: number
    }
  | {
      ok: false
      error: string
    } {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, error: `Render option ${name} must be a positive integer.` }
  }

  return { ok: true, value: parsed }
}

async function main(args: string[]): Promise<void> {
  process.exitCode = await runCli(args)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
