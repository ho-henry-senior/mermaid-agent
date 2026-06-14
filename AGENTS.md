# Repository Guidelines

## Project Structure & Module Organization

This repository is a TypeScript project. Keep code, tests, and assets separated by purpose:

- `src/` for application and agent code.
- `tests/` for automated tests that mirror `src/` modules.
- `docs/` for design notes, prompts, and contributor documentation.
- `examples/` for sample Mermaid inputs and generated-output checks.

Name modules after owned behavior, for example `src/mermaid/render.ts`, `src/agent/prompt.md`, or `tests/mermaid/validate.test.ts`.

## Project Direction

This repository explores an agent for Mermaid diagrams, with possible later SVG export and Figma workflows. Start Mermaid-first: generate valid diagrams from plain language, validate syntax, support revisions, and render `.mmd` files to `.svg`. Defer Figma integration.

## Design Goals

Build a repeatable diagram workflow, not a general Mermaid chatbot. The agent should outperform ad hoc Codex use by enforcing project conventions, validating and repairing diagrams, rendering outputs, supporting revisions, and handling batch documentation tasks. Favor repository-wide consistency.

## Tooling & Dependencies

Use TypeScript on Node.js for the core CLI because Mermaid tooling is JavaScript-native. Current packages are `@mermaid-js/mermaid-cli` for SVG rendering, `tsx` for local TypeScript execution, `typescript` for type-checking, `vitest` for tests, and `prettier` for formatting. Add Figma libraries only when an SVG-to-Figma workflow is ready.

## Build, Test, and Development Commands

Use npm scripts for repeatable local workflows:

- `npm run build`: type-check the TypeScript project.
- `npm test`: run the Vitest test suite.
- `npm run generate -- "show the signup flow from landing page to email verification" examples/signup-flow.mmd`:
  generate and validate a Mermaid file from a plain-language request.
- `npm run generate -- "show the signup flow from landing page to email verification" examples/signup-flow.mmd --render examples/signup-flow.svg`:
  generate, validate, and render SVG output.
- `npm run render -- examples/signup-flow.mmd examples/signup-flow.svg`: render Mermaid to SVG.
- `npm run render -- examples/signup-flow.mmd examples/signup-flow.svg --theme neutral --background-color transparent`: render with explicit output options.
- `npm run test:runtime`: run opt-in Mermaid CLI runtime rendering tests.
- `npm run format`: format files with Prettier.
- `npm run check`: run type-checking and tests.

Avoid relying on undocumented local scripts.

## Coding Style & Naming Conventions

Use descriptive names and small modules. Prefer behavior-oriented names such as `renderMermaidFile` rather than `utils`.

Use 2-space indentation, `camelCase` for functions and variables, and `PascalCase` for types/classes. Keep imports explicit and prefer typed result objects for tool outcomes. Format with Prettier.

## Testing Guidelines

Add tests alongside new behavior. Mirror source paths in `tests/` and use descriptive names, for example `test_planner_creates_ordered_steps` or `filesystem_tool.test.ts`.

Focus tests on observable behavior: inputs, outputs, tool calls, errors, and safety checks. Include regression tests for bug fixes. Keep the test command fast enough to run before every pull request.

## Agent-Specific Instructions

Agents should inspect files before editing, keep changes scoped, and avoid deleting or overwriting user work without explicit approval. When adding tooling, update this guide with new commands and layout.
