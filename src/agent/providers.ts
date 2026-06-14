import { createHeuristicDiagramProvider, type DiagramGenerationProvider } from './generate.js'
import { createOpenAiDiagramProvider } from './openai-provider.js'

export type DiagramProviderName = 'heuristic' | 'openai'

export type ResolveDiagramProviderResult =
  | {
      ok: true
      provider: DiagramGenerationProvider
    }
  | {
      ok: false
      error: string
    }

export const supportedDiagramProviderNames: DiagramProviderName[] = ['heuristic', 'openai']

export function resolveDiagramProvider(name: DiagramProviderName): ResolveDiagramProviderResult {
  if (name === 'heuristic') {
    return {
      ok: true,
      provider: createHeuristicDiagramProvider(),
    }
  }

  if (name === 'openai') {
    return {
      ok: true,
      provider: createOpenAiDiagramProvider(),
    }
  }

  return {
    ok: false,
    error: `Unsupported diagram generation provider "${name}". Use one of: ${supportedDiagramProviderNames.join(
      ', ',
    )}.`,
  }
}

export function isDiagramProviderName(value: string): value is DiagramProviderName {
  return supportedDiagramProviderNames.includes(value as DiagramProviderName)
}
