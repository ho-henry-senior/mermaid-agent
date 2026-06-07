import { describe, expect, it } from "vitest";

import { validateMermaidSource } from "../../src/mermaid/validate.js";

describe("validateMermaidSource", () => {
  it("accepts a supported Mermaid diagram", () => {
    expect(validateMermaidSource("flowchart TD\n  A --> B")).toEqual({
      ok: true,
    });
  });

  it("rejects empty input", () => {
    expect(validateMermaidSource("")).toEqual({
      ok: false,
      error: "Mermaid source is empty.",
    });
  });

  it("rejects input without a supported diagram starter", () => {
    expect(validateMermaidSource("A --> B")).toEqual({
      ok: false,
      error:
        'First line must start with a supported Mermaid diagram type. Found: "A --> B"',
    });
  });
});
