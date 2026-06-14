import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { runCli } from '../src/cli.js'

function createBufferedIo() {
  let stdout = ''
  let stderr = ''

  return {
    io: {
      stdout: {
        write(chunk: string) {
          stdout += chunk
          return true
        },
      },
      stderr: {
        write(chunk: string) {
          stderr += chunk
          return true
        },
      },
    },
    output() {
      return { stdout, stderr }
    },
  }
}

describe('runCli', () => {
  it('generates a Mermaid file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    const buffer = createBufferedIo()
    const generateInputs: unknown[] = []

    await expect(
      runCli(['generate', 'show the signup flow', 'signup-flow.mmd'], {
        cwd: directory,
        io: buffer.io,
        operations: {
          generateDiagramFile: async (input) => {
            generateInputs.push(input)
            return {
              ok: true,
              outputPath: input.outputPath,
              diagramType: 'flowchart',
              assumptions: ['No source context was provided.'],
              source: 'flowchart TD\n  A --> B\n',
            }
          },
        },
      }),
    ).resolves.toBe(0)

    expect(generateInputs).toEqual([
      {
        request: 'show the signup flow',
        outputPath: join(directory, 'signup-flow.mmd'),
        type: undefined,
      },
    ])
    expect(buffer.output()).toEqual({
      stdout: [
        'Generated flowchart diagram.',
        `Mermaid: ${join(directory, 'signup-flow.mmd')}`,
        'Assumptions: No source context was provided.',
        '',
      ].join('\n'),
      stderr: '',
    })
  })

  it('generates and renders a Mermaid file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    const buffer = createBufferedIo()
    const renderInputs: unknown[] = []

    await expect(
      runCli(
        [
          'generate',
          'show the support ticket lifecycle',
          'ticket.mmd',
          '--type',
          'state',
          '--render',
          'ticket.svg',
          '--theme',
          'neutral',
        ],
        {
          cwd: directory,
          io: buffer.io,
          operations: {
            generateDiagramFile: async (input) => ({
              ok: true,
              outputPath: input.outputPath,
              diagramType: input.type ?? 'flowchart',
              assumptions: [],
              source: 'stateDiagram-v2\n  [*] --> Open\n',
            }),
            renderMermaidFile: async (input) => {
              renderInputs.push(input)
              return {
                ok: true,
                outputPath: input.outputPath,
              }
            },
          },
        },
      ),
    ).resolves.toBe(0)

    expect(renderInputs).toEqual([
      {
        inputPath: join(directory, 'ticket.mmd'),
        outputPath: join(directory, 'ticket.svg'),
        options: {
          theme: 'neutral',
        },
      },
    ])
    expect(buffer.output().stdout).toContain('Generated state diagram.\n')
    expect(buffer.output().stdout).toContain(`SVG: ${join(directory, 'ticket.svg')}\n`)
  })

  it('reports unsupported generate diagram types', async () => {
    const buffer = createBufferedIo()

    await expect(
      runCli(['generate', 'show the signup flow', 'signup.mmd', '--type', 'timeline'], {
        io: buffer.io,
      }),
    ).resolves.toBe(1)

    expect(buffer.output()).toEqual({
      stdout: '',
      stderr: 'Unsupported diagram type "timeline". Use one of: flowchart, sequence, state, er.\n',
    })
  })

  it('validates a Mermaid file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    await writeFile(join(directory, 'diagram.mmd'), 'flowchart TD\n  A --> B')
    const buffer = createBufferedIo()

    await expect(
      runCli(['validate', 'diagram.mmd'], {
        cwd: directory,
        io: buffer.io,
      }),
    ).resolves.toBe(0)

    expect(buffer.output()).toEqual({
      stdout: `Valid ${join(directory, 'diagram.mmd')}\n`,
      stderr: '',
    })
  })

  it('reports validation errors', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    await writeFile(join(directory, 'diagram.mmd'), 'A --> B')
    const buffer = createBufferedIo()

    await expect(
      runCli(['validate', 'diagram.mmd'], {
        cwd: directory,
        io: buffer.io,
      }),
    ).resolves.toBe(1)

    expect(buffer.output()).toEqual({
      stdout: '',
      stderr: 'First line must start with a supported Mermaid diagram type. Found: "A --> B"\n',
    })
  })

  it('renders a Mermaid file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    await writeFile(join(directory, 'diagram.mmd'), 'flowchart TD\n  A --> B')
    const buffer = createBufferedIo()

    await expect(
      runCli(['render', 'diagram.mmd', 'diagram.svg'], {
        cwd: directory,
        io: buffer.io,
        operations: {
          renderMermaidFile: async (input) => ({
            ok: true,
            outputPath: input.outputPath,
          }),
        },
      }),
    ).resolves.toBe(0)

    expect(buffer.output()).toEqual({
      stdout: `Rendered ${join(directory, 'diagram.svg')}\n`,
      stderr: '',
    })
  })

  it('passes render options to the Mermaid renderer', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    await writeFile(join(directory, 'diagram.mmd'), 'flowchart TD\n  A --> B')
    const buffer = createBufferedIo()
    const renderInputs: unknown[] = []

    await expect(
      runCli(
        [
          'render',
          'diagram.mmd',
          'diagram.svg',
          '--theme',
          'neutral',
          '--background-color',
          'transparent',
          '--width',
          '1024',
          '--height',
          '768',
        ],
        {
          cwd: directory,
          io: buffer.io,
          operations: {
            renderMermaidFile: async (input) => {
              renderInputs.push(input)
              return {
                ok: true,
                outputPath: input.outputPath,
              }
            },
          },
        },
      ),
    ).resolves.toBe(0)

    expect(renderInputs).toEqual([
      {
        inputPath: join(directory, 'diagram.mmd'),
        outputPath: join(directory, 'diagram.svg'),
        options: {
          theme: 'neutral',
          backgroundColor: 'transparent',
          width: 1024,
          height: 768,
        },
      },
    ])
  })

  it('reports unsupported render themes', async () => {
    const buffer = createBufferedIo()

    await expect(
      runCli(['render', 'diagram.mmd', 'diagram.svg', '--theme', 'ocean'], { io: buffer.io }),
    ).resolves.toBe(1)

    expect(buffer.output()).toEqual({
      stdout: '',
      stderr: 'Unsupported Mermaid theme "ocean". Use one of: default, forest, dark, neutral.\n',
    })
  })

  it('reports invalid render dimensions', async () => {
    const buffer = createBufferedIo()

    await expect(
      runCli(['render', 'diagram.mmd', 'diagram.svg', '--width', '0'], { io: buffer.io }),
    ).resolves.toBe(1)

    expect(buffer.output()).toEqual({
      stdout: '',
      stderr: 'Render option width must be a positive integer.\n',
    })
  })

  it('shows usage for missing arguments', async () => {
    const buffer = createBufferedIo()

    await expect(runCli(['validate'], { io: buffer.io })).resolves.toBe(1)

    expect(buffer.output().stderr).toContain('npm run validate -- <input.mmd>')
  })
})
