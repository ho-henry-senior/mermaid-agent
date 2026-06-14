import { describe, expect, it } from 'vitest'

import {
  createOpenAiDiagramProvider,
  parseOpenAiDiagramResponse,
  type OpenAiResponseCreateInput,
} from '../../src/agent/openai-provider.js'

describe('createOpenAiDiagramProvider', () => {
  it('calls the Responses API client with structured output instructions', async () => {
    const requests: OpenAiResponseCreateInput[] = []
    const provider = createOpenAiDiagramProvider({
      apiKey: 'test-key',
      model: 'test-model',
      prompt: 'You are a Mermaid diagram agent.',
      client: {
        async createResponse(input) {
          requests.push(input)
          return {
            output_text: JSON.stringify({
              diagramType: 'flowchart',
              source: 'flowchart TD\n  A --> B\n',
              assumptions: ['No source context was provided.'],
            }),
          }
        },
      },
    })

    await expect(
      provider.generate({
        request: 'show the signup flow',
        type: 'flowchart',
      }),
    ).resolves.toEqual({
      diagramType: 'flowchart',
      source: 'flowchart TD\n  A --> B\n',
      assumptions: ['No source context was provided.'],
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      model: 'test-model',
      instructions: expect.stringContaining('You are a Mermaid diagram agent.'),
      input: ['Diagram request: show the signup flow', 'Required diagram type: flowchart'].join(
        '\n',
      ),
      text: {
        format: {
          type: 'json_schema',
          name: 'mermaid_diagram_generation',
          strict: true,
        },
      },
    })
  })
})

describe('parseOpenAiDiagramResponse', () => {
  it('parses output_text responses', () => {
    expect(
      parseOpenAiDiagramResponse({
        output_text: JSON.stringify({
          diagramType: 'sequence',
          source: 'sequenceDiagram\n  A->>B: Hello\n',
          assumptions: [],
        }),
      }),
    ).toEqual({
      diagramType: 'sequence',
      source: 'sequenceDiagram\n  A->>B: Hello\n',
      assumptions: [],
    })
  })

  it('parses nested Responses API output text', () => {
    expect(
      parseOpenAiDiagramResponse({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  diagramType: 'state',
                  source: 'stateDiagram-v2\n  [*] --> Open\n',
                  assumptions: ['States are inferred.'],
                }),
              },
            ],
          },
        ],
      }),
    ).toEqual({
      diagramType: 'state',
      source: 'stateDiagram-v2\n  [*] --> Open\n',
      assumptions: ['States are inferred.'],
    })
  })

  it('rejects invalid structured output', () => {
    expect(() =>
      parseOpenAiDiagramResponse({
        output_text: JSON.stringify({
          diagramType: 'timeline',
          source: 'timeline\n',
          assumptions: [],
        }),
      }),
    ).toThrow('unsupported diagramType')
  })
})
