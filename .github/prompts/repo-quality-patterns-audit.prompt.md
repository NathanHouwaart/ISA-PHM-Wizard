# Repo Quality & Patterns Audit (ISA-PHM-Wizard)

Purpose
- Scan the ISA-PHM-Wizard repository and produce a concise, prioritized audit of coding patterns, best-practices, architecture, accessibility, security hints, and suggested fixes (including optional patches).
- Use the project’s own guidance files (listed below) as rules of engagement.

Primary files to consult (always reference these)
- `.github/copilot-instructions.md`
- `.github/prompts/promote-reusability.prompt.md`
- `.github/prompts/use-components.prompt.md`
- `.github/prompts/use-revogrid.prompt.md`
- `.github/prompts/use_const_lambda_function.prompt.md`

Repository scope (recommended scan targets)
- `src/` (all subfolders)
- `src/components/` (subcomponents, widgets, typography, Form)
- `src/contexts/` (GlobalDataContext usage patterns)
- `src/hooks/`
- `src/services/`
- `src/data/` (structure + JSON usage)
- `tests/`
- `package.json`, `vite.config.mjs`, `tailwind.config.cjs`, `eslint.config.js` or `.eslintrc`, `jsconfig.json`

High-level tasks (what to do)
1. Read the referenced guidance files first and apply their rules when evaluating code.
2. Produce a top-level executive summary (1–3 bullets) with overall repo health and biggest risks.
3. Produce a prioritized list of findings (most important first). For each finding include:
   - id (short string)
   - severity: {critical, high, medium, low, info}
   - category: {bug, style, architecture, accessibility, security, performance, testing, docs}
   - files: list of file paths touched
   - location: line-range or function/component name where relevant
   - concise description of the problem
   - rule/reference: which of the referenced prompt files, style guide, or ESLint rule this violates (if applicable)
   - suggested fix (one-paragraph)
   - optional small patch: a unified-diff or minimal code snippet implementing the fix (only if explicit flag allowPatches=true)
4. Scan for specific patterns (these are required checks):
   - Raw inputs usage: any raw `<input>`, `<textarea>`, `<select>` in UI components that should use `FormField` (per `use-components.prompt.md`).
   - Typography usage: headings/subtitles/body text using canonical typography components (`Heading3`, `SlidePageSubtitle`, `Paragraph`) instead of raw `<h*>`/`<p>`.
   - Exports & component shape: components defined as arrow functions and exported as default (per `use_const_lambda_function.prompt.md`).
   - RevoGrid usage: confirm RevoGrid code follows documented API patterns or flag undocumented usages (per `use-revogrid.prompt.md`).
   - Reusability: duplicated UI patterns across multiple files that justify extracting a component (per `promote-reusability.prompt.md`).
   - Global context use: calls that tightly couple components to `GlobalDataContext` where passing props would be preferable.
   - LocalStorage or persistence smells: verify keys, prefixes, and possible stale-data risks.
   - Dataset indexing & file-assign UX invariants (specific domain logic you may spot from code).
   - Disabled / gated UI: buttons that can be clicked while disabled, or inconsistent disabled styles/tooltip hints.
   - Portal/popover clipping issues: popovers not using portals in stacked containers.
   - Accessibility basics: missing labels, missing aria attributes on interactive elements, keyboard navigation gaps.
   - Test coverage: missing tests for modified or high-risk modules.
   - Lint / Type errors: any obvious JS/JSX syntax and common lint issues (note where you can't run tools).
5. Produce a small "action plan" with 1–3 prioritized next steps and an estimate (time/complexity) for each.

Output format (machine-friendly)
Return JSON with this shape (example):

```
{
  "summary": "short 1-3 bullet summary",
  "metrics": {
    "filesScanned": 123,
    "findings": 17,
    "highSeverity": 3
  },
  "findings": [
    {
      "id": "raw-input-formfield-01",
      "severity": "high",
      "category": "style",
      "files": ["src/components/Slides/IntroductionSlide.jsx"],
      "location": "Paragraphs area",
      "description": "Raw <p> tags used instead of `Paragraph`",
      "rule": "use-components.prompt.md -> Paragraph",
      "suggestedFix": "Replace <p> with `Paragraph` from `src/components/Typography/Paragraph.jsx` and keep styling via className.",
      "patch": "optional unified-diff or single-file snippet (when allowPatches=true)"
    }
  ],
  "actionPlan": [
    {"task":"Replace raw inputs with FormField","estimate":"1-2h","priority":"high"}
  ]
}
```

Rules & constraints for the auditor AI
- Always start by reading the project's prompt/guidance files listed above and use them as normative rules.
- Do not modify files unless the caller explicitly sets allowPatches=true.
- When providing patches, keep them minimal — one logical change per patch and include only the affected file sections.
- Don't perform network calls or leak secrets; avoid analyzing .env or private data.
- Prefer conservative, easy-to-review fixes that match existing project patterns (Tailwind, TooltipButton, FormField).
- When you flag a rule violation, always point to the relevant project prompt or file that justifies it.
- If you cannot determine severity from code (e.g., dynamic runtime behavior), mark as `info` and explain why.

Example checks you should run (concrete)
- Search for `<input` or `<textarea` outside `src/components/Form` and list occurrences.
- Find files that import `Paragraph` but still use `<p>` — flag as style inconsistency.
- Ensure components under `src/components/` export default arrow function. Flag the ones that don't.
- Identify duplicated JSX chunks across 2+ files that look identical or near-identical (candidate for `promote-reusability`).
- Check for creation of IDs using array indices in lists (index-as-key anti-pattern).
- Look for portal usage patterns (React.createPortal) in dropdowns/modals/popovers.

Deliverables & success criteria
- Deliver a JSON report as described above and a short human-friendly summary (3–6 bullets).
- If allowPatches=true, attach 1–5 small, ready-to-apply patches (unified-diff per file).
- Success = JSON report created, top 5 actionable findings with severity, and 1–3 safe fixes or refactor suggestions.

Optional extras (enable with flags)
- allowPatches=true — include small unified-diff patches for straightforward fixes.
- runLocalChecks=true — attempt to run local linters / tests (requires permission and environment); otherwise just produce static analysis.
- onlyHighSeverity=true — limit output to high/critical findings.

Short usage example (how a human should call the prompt)
- Basic: "Run the audit with default rules and return JSON."
- With patches: "Run the audit and include patches. allowPatches=true"
- Run linter: "Run the audit and also run ESLint. runLocalChecks=true"

Notes for reviewers
- This audit is static and heuristic; follow up with a dev-run (`npm run dev` / `npm run lint`) for runtime verification.
- If the repo is large, the agent may sample or focus on high-impact folders first (`src/components`, `src/contexts`, `src/hooks`, `tests`).

---

If you'd like, I can now run a first-pass scan using these rules and produce the JSON report (no file edits), or run the audit and also propose small patches for the top 3 findings (set `allowPatches=true`).
