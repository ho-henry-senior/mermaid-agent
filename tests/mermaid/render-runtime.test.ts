import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { renderMermaidFile } from '../../src/mermaid/render.js'

const runRuntimeTests = process.env.RUN_MERMAID_RUNTIME_TESTS === '1'

describe.skipIf(!runRuntimeTests)('renderMermaidFile runtime', () => {
  it('renders SVG with the installed Mermaid CLI', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-runtime-'))
    const inputPath = join(directory, 'diagram.mmd')
    const outputPath = join(directory, 'diagram.svg')
    await writeFile(inputPath, 'flowchart TD\n  A[Start] --> B[End]')

    await expect(
      renderMermaidFile({
        inputPath,
        outputPath,
        options: {
          theme: 'neutral',
          backgroundColor: 'transparent',
        },
      }),
    ).resolves.toEqual({
      ok: true,
      outputPath,
    })

    await expect(readFile(outputPath, 'utf8')).resolves.toContain('<svg')
  })
})
