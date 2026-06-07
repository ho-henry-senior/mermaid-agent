const knownDiagramStarters = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "requirementDiagram",
  "C4Context",
];

export type MermaidValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export function validateMermaidSource(source: string): MermaidValidationResult {
  const trimmed = source.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Mermaid source is empty." };
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const startsWithKnownDiagram = knownDiagramStarters.some(
    (starter) => firstLine === starter || firstLine.startsWith(`${starter} `),
  );

  if (!startsWithKnownDiagram) {
    return {
      ok: false,
      error: `First line must start with a supported Mermaid diagram type. Found: "${firstLine}"`,
    };
  }

  return { ok: true };
}
