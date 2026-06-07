import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { renderMermaidFile } from '../../src/mermaid/render.js'

describe('renderMermaidFile', () => {
  it('validates input before rendering', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    const inputPath = join(directory, 'invalid.mmd')
    await writeFile(inputPath, 'A --> B')

    await expect(
      renderMermaidFile({
        inputPath,
        outputPath: join(directory, 'invalid.svg'),
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'First line must start with a supported Mermaid diagram type. Found: "A --> B"',
    })
  })
})
