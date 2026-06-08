import { describe, expect, it } from 'vitest'

import { validateMermaidFile } from '../src/mermaid/validate.js'

const validExamples = [
  'examples/order-sequence.mmd',
  'examples/orders-er.mmd',
  'examples/publishing-state.mmd',
  'examples/signup-flow.mmd',
]

const invalidExamples = [
  {
    path: 'examples/failures/missing-diagram-type.mmd',
    error: 'First line must start with a supported Mermaid diagram type. Found: "A --> B"',
  },
  {
    path: 'examples/failures/invalid-flowchart-syntax.mmd',
    errorPrefix: 'Mermaid syntax error:',
  },
]

describe('Mermaid examples', () => {
  it.each(validExamples)('validates %s', async (path) => {
    await expect(
      validateMermaidFile(path, {
        validateWithRenderer: async () => ({ ok: true }),
      }),
    ).resolves.toEqual({
      ok: true,
      inputPath: path,
    })
  })

  it.each(invalidExamples)('rejects $path', async (example) => {
    const result = await validateMermaidFile(example.path)

    expect(result.ok).toBe(false)

    if (result.ok) {
      return
    }

    if ('error' in example) {
      expect(result.error).toBe(example.error)
      return
    }

    expect(result.error).toContain(example.errorPrefix)
  })
})
