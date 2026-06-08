import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

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
    renderMermaidFile?: typeof renderMermaidFile
    validateMermaidFile?: typeof validateMermaidFile
  }
}

function usage(): string {
  return [
    'Usage:',
    '  npm run validate -- <input.mmd>',
    '  npm run render -- <input.mmd> <output.svg> [--theme <theme>] [--background-color <color>] [--width <px>] [--height <px>]',
    '',
    'Example:',
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
    renderMermaidFile,
    validateMermaidFile,
    ...options.operations,
  }
  const [command, input, output, ...renderArgs] = args

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

const supportedThemes = new Set<MermaidTheme>(['default', 'forest', 'dark', 'neutral'])

function parseRenderOptions(args: string[]): ParseRenderOptionsResult {
  const options: RenderMermaidOptions = {}

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    const value = args[index + 1]

    if (!value || value.startsWith('--')) {
      return { ok: false, error: `Missing value for render option ${flag}.` }
    }

    if (flag === '--theme') {
      if (!isMermaidTheme(value)) {
        return {
          ok: false,
          error: `Unsupported Mermaid theme "${value}". Use one of: default, forest, dark, neutral.`,
        }
      }

      options.theme = value
      index += 1
      continue
    }

    if (flag === '--background-color') {
      options.backgroundColor = value
      index += 1
      continue
    }

    if (flag === '--width') {
      const width = parsePositiveIntegerOption('width', value)

      if (!width.ok) {
        return width
      }

      options.width = width.value
      index += 1
      continue
    }

    if (flag === '--height') {
      const height = parsePositiveIntegerOption('height', value)

      if (!height.ok) {
        return height
      }

      options.height = height.value
      index += 1
      continue
    }

    return { ok: false, error: `Unknown render option ${flag}.` }
  }

  return { ok: true, options }
}

function isMermaidTheme(value: string): value is MermaidTheme {
  return supportedThemes.has(value as MermaidTheme)
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
