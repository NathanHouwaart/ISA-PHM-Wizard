---
mode: agent
---

Purpose
-------
This prompt instructs an automated agent or developer how to implement or refactor UI code in this repository while consistently re-using the project's existing reusable components for form fields, typography, and buttons. The goal is to keep UI consistent, accessible, and easy to maintain.

When to use this prompt
-----------------------
- Any new feature that renders forms, form controls, labels, or help text.
- Any refactor that replaces raw <input>, <textarea>, <select>, or ad-hoc button elements in React components.

Primary requirement
-------------------
Always prefer the project's shared, reusable components instead of creating new ad-hoc inputs, headings, paragraphs, or tooltip buttons. This reduces duplication and preserves consistent behavior and styling across the app.

Canonical components (use these)
--------------------------------
- Form fields: `FormField` — src/components/Form/FormField.jsx
	- Use for text, textarea, select, tags, license picker, and similar inputs.
	- Keep `name`, `value`, `onChange`, `label`, `placeholder`, `required`, `className`, `explanation`, `example`, `rows` props as appropriate.

- Typography:
	- `Heading3` — src/components/Typography/Heading3.jsx (section headings)
	- `SlidePageSubtitle` / `Paragraph` — src/components/Typography/Paragraph.jsx (subtitles, explanatory paragraphs)
	- Use these for all textual headings and body copy in the UI instead of raw <h*> or <p> elements.

- Buttons / Tooltip buttons:
	- `TooltipButton` — src/components/Widgets/TooltipButton.jsx (primary button with tooltip)
	- `IconTooltipButton` — src/components/Widgets/IconTooltipButton.jsx (icon-only buttons with tooltip)
	- Use these whenever a button or icon needs a tooltip, consistent hover/focus behavior, or accessibility helpers.

- Additional helpers:
	- `TableTooltip` — src/components/Widgets/TableTooltip.jsx (for explanatory tooltip tables)

Rules and constraints
---------------------
- Do not add raw `<input>`, `<textarea>`, or `<select>` markup in components that should use `FormField`. If a new specialized field is required, extend `FormField` or add a small wrapper that reuses it.
- Maintain the existing `onChange` contract used by `FormField` (it expects DOM events for text/textarea/select). If you must accept non-DOM handlers, adapt them at the call site and keep `FormField` usage consistent.
- Avoid adding new styling systems. Use `className` prop on the existing components to apply layout or spacing changes (Tailwind classes are accepted and preferred where used in the repo).
- Buttons that need tooltips must use `TooltipButton` or `IconTooltipButton`. If a button doesn't need a tooltip, prefer the existing `TooltipButton` without tooltip text for visual consistency (or a plain project-styled button component if one exists).
- For dynamic lists and maps, always provide a stable, unique `key` value derived from a persistent `id` field. Generate ids at creation time (e.g., `uuidv4()` / `v4`) and avoid using array index as the primary key for lists that can reorder or be edited.
- For overlays and popovers (modals, dropdowns, suggestion lists) prefer portal rendering where the existing components do so (see modal and `FormField` suggestion dropdown patterns) to avoid clipping and stacking-context issues.

File placement and structure
----------------------------
- New reusable components must be added under `src/components/` in an existing subfolder when appropriate (for example: `src/components/Form/`, `src/components/Typography/`, `src/components/Widgets/`, `src/components/TestSetup/`).
- If there is no suitable subfolder, propose and create a new subfolder under `src/components/` whose name reflects the component role (use kebab-case for folder names, e.g. `key-value-list`, `compact-row`).
- Component filenames should be PascalCase and colocated with any small companion files (styles, short README comment, and unit test). For example:
	- `src/components/compact-row/CompactRow.jsx`
	- `src/components/compact-row/CompactRow.test.jsx`
	- `src/components/compact-row/README.md` (one-paragraph summary and usage)
- Export the component as the default export and keep the public API small. Prefer named helpers only when necessary.
- When adding a new folder, include an index file only if you expect multiple exports; otherwise keep a single default export to simplify imports.

Accessibility
-------------
- Keep labels, aria attributes, and focus behavior. `FormField` supplies label handling; ensure every input has an associated label.
- Keyboard interactions must be preserved (tab order, enter to submit where appropriate, escape to cancel modal/popover).

Testing and verification
------------------------
- Unit: Add or update tests that assert the presence and behavior of the `FormField` under the new UI code (happy path + one edge case such as empty value or disabled state).
- Manual: Run the dev server and verify the updated UI visually. Confirm that tooltips still appear, modals do not get clipped, and dynamic lists maintain stable keys when items are added/removed.
- Lint/Build: Changes must pass the project's lint and build scripts.

Success criteria
----------------
The PR implementing these changes should satisfy:
1. All inputs, text blocks, and buttons in the touched UI use the canonical components listed above.
2. No new raw input/textarea/select elements are introduced in pages/forms that should use `FormField`.
3. Lists use stable ids for `key` values; no index-as-key for editable lists.
4. Linting and the dev build succeed locally.
5. Accessibility basics (labels + tooltips reachable via keyboard) are preserved.

Reviewer checklist (for PRs)
--------------------------
- Does every input come from `FormField`? If not, is there a justified reason and a short comment explaining it?
- Are tooltips implemented with `TooltipButton` / `IconTooltipButton`? (Look for consistent tooltip props.)
- Are headings and subtitles using `Heading3` / `SlidePageSubtitle` / `Paragraph`?
- Are dynamic list keys stable and derived from an `id` field created at item creation time?
- Does the change pass `npm run lint` and `npm run dev` locally without console errors?

Examples (patterns)
-------------------
- Recommended form field pattern:

	import FormField from 'src/components/Form/FormField';

	<FormField
		name={`sensor-${index}-alias`}
		label="Sensor alias"
		value={sensor.alias}
		onChange={(e) => updateSensor(index, 'alias', e.target.value)}
		placeholder="Enter a sensor name/alias"
	/>

- Recommended tooltip button pattern:

	<IconTooltipButton
		icon={Trash}
		onClick={() => removeItem(i)}
		tooltipText="Remove item"
	/>

If you need to deviate from any of the rules above, add a short comment in the code explaining the reason so reviewers can accept the exception.

End of prompt

Define the task to achieve, including specific requirements, constraints, and success criteria.


