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

  it('shows usage for missing arguments', async () => {
    const buffer = createBufferedIo()

    await expect(runCli(['validate'], { io: buffer.io })).resolves.toBe(1)

    expect(buffer.output().stderr).toContain('npm run validate -- <input.mmd>')
  })
})
