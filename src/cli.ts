import { resolve } from "node:path";

import { renderMermaidFile } from "./mermaid/render.js";

function usage(): string {
  return [
    "Usage:",
    "  npm run render -- <input.mmd> <output.svg>",
    "",
    "Example:",
    "  npm run render -- examples/signup-flow.mmd examples/signup-flow.svg",
  ].join("\n");
}

async function main(args: string[]): Promise<void> {
  const [command, input, output] = args;

  if (command !== "render" || !input || !output) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const result = await renderMermaidFile({
    inputPath: resolve(input),
    outputPath: resolve(output),
  });

  if (!result.ok) {
    console.error(result.error);
    process.exitCode = 1;
    return;
  }

  console.log(`Rendered ${result.outputPath}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
