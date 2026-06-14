import { createHeuristicDiagramProvider, type DiagramGenerationProvider } from './generate.js'

export type DiagramProviderName = 'heuristic'

export type ResolveDiagramProviderResult =
  | {
      ok: true
      provider: DiagramGenerationProvider
    }
  | {
      ok: false
      error: string
    }

export const supportedDiagramProviderNames: DiagramProviderName[] = ['heuristic']

export function resolveDiagramProvider(name: DiagramProviderName): ResolveDiagramProviderResult {
  if (name === 'heuristic') {
    return {
      ok: true,
      provider: createHeuristicDiagramProvider(),
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
