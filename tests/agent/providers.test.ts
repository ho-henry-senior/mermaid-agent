import { describe, expect, it } from 'vitest'

import {
  isDiagramProviderName,
  resolveDiagramProvider,
  supportedDiagramProviderNames,
} from '../../src/agent/providers.js'

describe('diagram provider registry', () => {
  it('supports heuristic and OpenAI providers', () => {
    expect(supportedDiagramProviderNames).toEqual(['heuristic', 'openai'])
    expect(isDiagramProviderName('heuristic')).toBe(true)
    expect(isDiagramProviderName('openai')).toBe(true)
  })

  it('resolves the OpenAI provider', () => {
    const result = resolveDiagramProvider('openai')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.provider).toEqual({
        generate: expect.any(Function),
      })
    }
  })
})
