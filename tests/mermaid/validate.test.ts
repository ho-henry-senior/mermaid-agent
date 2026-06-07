import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { validateMermaidFile, validateMermaidSource } from '../../src/mermaid/validate.js'

describe('validateMermaidSource', () => {
  it('accepts a supported Mermaid diagram', () => {
    expect(validateMermaidSource('flowchart TD\n  A --> B')).toEqual({
      ok: true,
    })
  })

  it('rejects empty input', () => {
    expect(validateMermaidSource('')).toEqual({
      ok: false,
      error: 'Mermaid source is empty.',
    })
  })

  it('rejects input without a supported diagram starter', () => {
    expect(validateMermaidSource('A --> B')).toEqual({
      ok: false,
      error: 'First line must start with a supported Mermaid diagram type. Found: "A --> B"',
    })
  })
})

describe('validateMermaidFile', () => {
  it('accepts a valid Mermaid file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mermaid-agent-'))
    const inputPath = join(directory, 'valid.mmd')
    await writeFile(inputPath, 'flowchart TD\n  A --> B')

    await expect(validateMermaidFile(inputPath)).resolves.toEqual({
      ok: true,
      inputPath,
    })
  })

  it('returns a useful error for a missing file', async () => {
    const inputPath = join(tmpdir(), 'missing-diagram-file.mmd')

    await expect(validateMermaidFile(inputPath)).resolves.toEqual({
      ok: false,
      error: `Mermaid source file not found: ${inputPath}`,
    })
  })
})
