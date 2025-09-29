---
mode: agent
---

Purpose
-------
This prompt guides contributors and automated agents to "push for" more reusable components in the codebase in a disciplined way — by proposing well-designed, documented, tested, and incrementally-adopted components rather than dumping copy-pasted code. Use this prompt whenever you plan to add a new shared UI primitive or convert duplicated UI into a reusable component.

High-level rule
---------------
Always propose a design and a small adoption plan before implementing a new reusable component. The PR should include: design rationale, minimal API contract, usage examples, accessibility considerations, tests, and a migration plan for 1–3 places to adopt the component.

When to use this prompt
-----------------------
- You find repeated UI patterns across 2+ files (similar form fields, buttons, row layouts, subtitle patterns).
- You want to extract a piece of UI into a shared component (e.g., a custom labeled pair, a compact row with an icon, a consistent list item).
- You are about to add a utility component that other features might consume (e.g., a centered card, collapsible panel, data row).

What we expect from proposals (short checklist)
---------------------------------------------
1. Design brief (1–3 paragraphs): why the component is needed, where it will be used, alternatives considered.
2. API sketch (props): a short list of props (names, types, purpose). Keep the public API small and composable.
3. Accessibility notes: labelled controls, keyboard interaction, aria roles, focus management.
4. Visual examples: 2–3 usage snippets showing common variants (compact, expanded, with/without tooltip). Do not paste the entire implementation — show usage and expected behavior first.
5. Implementation plan: a minimal implementation (one file) + tests + 1–3 adoption patches where you replace duplicated code with the new component.
6. Migration strategy: incremental adoption steps and a deprecation plan for the old code.
7. Tests & docs: unit tests (happy path + one edge case), and a short README comment at the top of the component file explaining purpose and props.

Design guidelines (how to build components)
----------------------------------------
- Keep components small and single-responsibility. If you need composition, prefer small building blocks over a large monolithic API.
- Prefer composition over configuration: accept children or render props where sensible instead of many boolean flags.
- Provide sensible defaults that match existing project styles (Tailwind classes, spacing, typography components).
- Expose `className` and `data-testid` as optional props for layout customisation and tests.
- Keep interaction contracts consistent with existing primitives: `FormField` expects DOM events for onChange; tooltips use `TooltipButton`/`IconTooltipButton`.
- Avoid tight coupling to global context; pass callbacks and state down via props. If a component truly needs context, document why.

API & naming conventions
-----------------------
- Names should indicate the role: `LabeledPair`, `CompactRow`, `CollapsibleCard`, `IconAction`, `KeyValueList`.
- Props should be minimal: `value`, `onChange`, `label`, `className`, `id`/`name`, `disabled`, `explanation` (if needed).
- Prefer `camelCase` consistent with React conventions for prop names. Export default component and named helpers if needed.

Documentation & examples
------------------------
- Include a short example block near the top of the component file showing common usage:

  // Example
  // <CompactRow label="Name" value="Motor" onChange={...} />

- Add a one-paragraph README comment describing when to use the component and an example adoption scenario.

Testing
-------
- Add a unit test that renders the component and asserts core behavior (rendering, onClick/onChange, tooltip visibility).
- Add one edge-case test (empty value, disabled, long text truncation).
- Use react-testing-library for DOM-focused assertions and keyboard interactions.

Adoption plan (small, incremental)
---------------------------------
1. Identify 1–3 places where the component removes duplicated code; include those small adopters in the same PR.
2. Keep the initial implementation minimal; do not attempt to replace every occurrence in one giant change.
3. Add migration comments in replaced files linking to the new component (so reviewers can trace the change).

Review checklist for PRs that add reusable components
---------------------------------------------------
- Is the API small and documented? (Yes/No)
- Are usage examples provided? (Yes/No)
- Are accessibility concerns addressed? (Yes/No)
- Are tests added for happy path and one edge case? (Yes/No)
- Are 1–3 adoption sites included and small? (Yes/No)
- Is there a short migration/deprecation note? (Yes/No)
- Does the change pass `npm run lint` and the dev build? (Yes/No)

Reviewer guidance (how to evaluate)
---------------------------------
- Prefer reviewing API and usage first; only then review implementation details.
- Confirm that the component is not over-generalized; if you see many boolean flags, ask for composition instead.
- Confirm the component uses existing primitives (`FormField`, `TooltipButton`, `Heading3`, `SlidePageSubtitle`) rather than re-implementing them.
- If the component touches global state or context, ensure the reason is documented and justified.

When not to create a new component
----------------------------------
- The UI is unique to a single page and unlikely to be reused.
- The abstraction would only be used in one place and adds complexity.

Enforcement
-----------
Automated agents should refuse to merge or apply bulk changes that create reusable components without the design brief and adoption plan described above. Instead, open a draft PR with the design and request a short review.

End of prompt
