# Roadmap

## Next Iteration: Mermaid Workflow CLI

The first iteration should be a deterministic Mermaid workflow CLI, not an AI agent yet.

Goal: given a Mermaid source file, validate it, render it to SVG, and report clear results.

Planned capabilities:

- Add `npm run validate -- <input.mmd>`.
- Make `render` validate input before calling Mermaid CLI.
- Return useful errors for missing files, empty files, and unsupported diagram starters.
- Add tests for validation and CLI behavior.
- Keep generated `.svg` files ignored unless the project later decides to commit outputs.

This comes first because the future agent needs reliable tools to call. Once validation and rendering are solid, the next phase can add AI behavior: user prompt to Mermaid source, then validate, repair, render, and save.
