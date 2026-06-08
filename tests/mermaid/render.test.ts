import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import {
  classifyRendererExitError,
  classifyRendererStartupError,
  renderMermaidFile,
  type MermaidCliRunner,
} from '../../src/mermaid/render.js'

describe('renderMermaidFile', () => {
  it('validates input before rendering', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    const inputPath = join(directory, 'invalid.mmd')
    await writeFile(inputPath, 'A --> B')
    let renderCalled = false

    await expect(
      renderMermaidFile(
        {
          inputPath,
          outputPath: join(directory, 'invalid.svg'),
        },
        {
          runMermaidCli: async () => {
            renderCalled = true
            return { ok: true, outputPath: join(directory, 'invalid.svg') }
          },
        },
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'First line must start with a supported Mermaid diagram type. Found: "A --> B"',
    })

    expect(renderCalled).toBe(false)
  })

  it('renders valid input with the Mermaid CLI runner', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    const inputPath = join(directory, 'valid.mmd')
    const outputPath = join(directory, 'valid.svg')
    await writeFile(inputPath, 'flowchart TD\n  A --> B')
    const runMermaidCli: MermaidCliRunner = async (input) => ({
      ok: true,
      outputPath: input.outputPath,
    })

    await expect(
      renderMermaidFile(
        {
          inputPath,
          outputPath,
        },
        {
          runMermaidCli,
        },
      ),
    ).resolves.toEqual({
      ok: true,
      outputPath,
    })
  })
})

describe('classifyRendererStartupError', () => {
  it('reports a missing mmdc binary clearly', () => {
    const error = new Error('spawn mmdc ENOENT') as NodeJS.ErrnoException
    error.code = 'ENOENT'

    expect(classifyRendererStartupError(error)).toBe(
      'Mermaid renderer not found. Ensure `mmdc` is installed and available on PATH.',
    )
  })
})

describe('classifyRendererExitError', () => {
  it('classifies browser startup failures', () => {
    expect(classifyRendererExitError(1, 'Could not find Chrome')).toBe(
      'Mermaid renderer could not start a browser: Could not find Chrome',
    )
  })

  it('classifies syntax failures', () => {
    expect(classifyRendererExitError(1, 'Parse error on line 2')).toBe(
      'Mermaid renderer reported a syntax error: Parse error on line 2',
    )
  })

  it('classifies filesystem failures', () => {
    expect(classifyRendererExitError(1, 'ENOENT: no such file or directory')).toBe(
      'Mermaid renderer could not access an input or output file: ENOENT: no such file or directory',
    )
  })
})
