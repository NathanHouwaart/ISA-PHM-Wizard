# AI Prompt & Copilot Instruction Reference

## How to Use This Guide
- Start new AI-assisted work by reminding the agent which instructions apply (copy the relevant bullets below into the chat).
- Link directly to the referenced files when raising PRs so reviewers can confirm the guidance you followed.
- Update this document whenever new prompts are added under `.github/prompts` or the baseline guidance changes.

## Baseline Copilot Instructions
- Path: `.github/copilot-instructions.md`
- Scope: High-level architecture, data flows, component patterns, and development workflows for the ISA-PHM Wizard.
- Highlights: Global data context as single source of truth, auto-save to localStorage, mapping controllers, canonical UI components, and the required npm scripts for dev/build/deploy.
- Use when: Giving an AI agent overall project context or orienting new contributors before they touch the codebase.

## Prompt Catalog

### Promote Reusability
- Path: `.github/prompts/promote-reusability.prompt.md`
- Use when: Proposing or implementing shared UI primitives or extracting duplicated UI into reusable components.
- Key requirements: Provide a design brief, API sketch, accessibility notes, usage examples, incremental adoption plan, tests, and migration strategy before shipping the component.
- Reviewer focus: Ensure the proposal stays small, composable, and accompanied by documentation plus 1-3 immediate adoption sites.

### Use Components
- Path: `.github/prompts/use-components.prompt.md`
- Use when: Building or refactoring forms, typography, or buttons to ensure they rely on the project’s canonical components.
- Key requirements: Prefer `FormField`, `Heading3`, `SlidePageSubtitle`, `Paragraph`, `TooltipButton`, and `IconTooltipButton`; maintain DOM event contracts; keep stable keys for lists; run lint/build checks.
- Reviewer focus: Confirm no raw inputs/buttons slipped in and that accessibility contracts (labels, tooltips, keyboard paths) stay intact.

### Use RevoGrid
- Path: `.github/prompts/use-revogrid.prompt.md`
- Use when: Adding, configuring, or debugging RevoGrid-based tables.
- Key requirements: Reference official documentation and source code, avoid undocumented APIs, explain trade-offs, and share minimal working code snippets.
- Reviewer focus: Validate that recommended patterns align with RevoGrid docs and that explanations justify the approach.

### Use Const Arrow Function Default Exports
- Path: `.github/prompts/use_const_lambda_function.prompt.md`
- Use when: Creating or updating React components, especially demo/test pages.
- Key requirements: Define components as arrow functions, export them as the default export, keep one component per file, and align component name with the filename.
- Reviewer focus: Verify compatibility with `React.lazy()` and consistent component naming/export conventions.

## Quick Reference Snippet
Copy, adapt, and paste the relevant lines below into a new AI request to keep agents aligned:
```
Ground context: `.github/copilot-instructions.md`.
Apply reusable-component workflow: `.github/prompts/promote-reusability.prompt.md`.
Enforce canonical UI primitives: `.github/prompts/use-components.prompt.md`.
Follow RevoGrid best practices: `.github/prompts/use-revogrid.prompt.md`.
Require arrow-function default exports: `.github/prompts/use_const_lambda_function.prompt.md`.
```
