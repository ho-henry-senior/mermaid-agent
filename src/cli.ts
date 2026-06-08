import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { renderMermaidFile, type RenderMermaidFileResult } from './mermaid/render.js'
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
    '  npm run render -- <input.mmd> <output.svg>',
    '',
    'Example:',
    '  npm run validate -- examples/signup-flow.mmd',
    '  npm run render -- examples/signup-flow.mmd examples/signup-flow.svg',
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
  const [command, input, output] = args

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

  const result: RenderMermaidFileResult = await operations.renderMermaidFile({
    inputPath: resolve(cwd, input),
    outputPath: resolve(cwd, output),
  })

  if (!result.ok) {
    io.stderr.write(`${result.error}\n`)
    return 1
  }

  io.stdout.write(`Rendered ${result.outputPath}\n`)
  return 0
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
