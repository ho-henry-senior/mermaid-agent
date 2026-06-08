# Roadmap

## Direction

Build a repeatable Mermaid diagram workflow before expanding into broader design tooling. The
project should first provide reliable local tools for validating, rendering, revising, and
batch-producing Mermaid diagrams. Figma integration stays deferred until SVG export is predictable
enough to support it.

## Completed: Mermaid Workflow CLI Foundation

Goal: given a Mermaid source file, validate it, render it to SVG, and report clear results.

Implemented capabilities:

- Add `npm run validate -- <input.mmd>`.
- Make `render` validate input before calling Mermaid CLI.
- Return useful errors for missing files, empty files, and unsupported diagram starters.
- Add tests for validation and CLI behavior.

This came first because the future agent needs reliable tools to call.

## Completed: Harden the CLI

Goal: make validation and rendering dependable enough to become agent tools.

Implemented capabilities:

- Add real Mermaid syntax validation rather than only checking diagram starters.
- Cover successful SVG rendering in tests where the runtime dependencies are available.
- Improve renderer error handling so syntax, missing binary, browser, and filesystem failures
  produce clear messages.
- Keep generated `.svg` files ignored unless the project later decides to commit outputs.
- Add examples that exercise common diagram types and known failure cases.
- Support explicit render options for theme, background color, width, and height.
- Handle normal Mermaid preambles such as leading comments and YAML frontmatter.

Remaining hardening opportunities:

- Add more diagram-type fixtures as new project workflows need them.
- Expand runtime tests across more output options if they become important to agent behavior.

## Next: Diagram Generation Agent

Goal: convert plain-language requests into valid Mermaid source files.

Planned capabilities:

- Choose an appropriate Mermaid diagram type unless the user specifies one.
- Generate `.mmd` files that follow repository conventions for naming and structure.
- Validate generated diagrams before reporting success.
- Attempt a focused repair pass when validation or rendering fails.
- Render the final diagram to SVG and report the input/output paths.

## Next: Revision Workflow

Goal: revise existing diagrams without losing the user's original intent.

Planned capabilities:

- Load an existing `.mmd` file and apply a requested change.
- Preserve unrelated diagram content.
- Validate and render the revised diagram.
- Surface a concise summary of what changed.

## Later: Batch Documentation Workflow

Goal: support repeatable diagram generation across docs and examples.

Planned capabilities:

- Process multiple Mermaid requests or source documents in one run.
- Apply consistent naming, output directories, and diagram conventions.
- Detect duplicate or near-duplicate diagram requests.
- Produce a report of generated, revised, skipped, and failed diagrams.

## Later: SVG Export Workflow

Goal: make SVG output predictable enough for downstream workflows.

Planned capabilities:

- Standardize SVG filenames and output paths.
- Support theme and style options.
- Add accessibility metadata where practical.
- Add regression checks for rendered outputs.

## Deferred: Figma Workflow

Explore Figma only after the SVG workflow is reliable. Possible future work includes SVG-to-Figma
import, plugin integration, or a handoff format for design review.
