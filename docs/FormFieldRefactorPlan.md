# FormField Refactor Proposal

## Design Brief
- **Why**: `src/components/Form/FormField.jsx` currently couples the shared label/tooltip shell with every niche input type. The 470-line component is hard to reason about, mixes unrelated state (text input buffering, tag suggestion dropdowns, author management), and blocks incremental enhancements. Extracting the field renderers will keep `FormField` as the canonical shell demanded by `.github/prompts/use-components.prompt.md` while reducing cognitive load.
- **Where it will be used**: The new shell/renderer split will power the existing `PublicationForm`, `DatasetPicker`, and other consumers that already import `FormField`. No call-site changes are required; only the internal implementation evolves.
- **Alternatives considered**: 1) Leave the monolith as-is (rejected because it keeps the maintenance burden). 2) Break `FormField` into many exported components (rejected; callers rely on a single API and `.github/prompts/use-components.prompt.md` mandates keeping it central). The chosen approach keeps the API stable but modularises internals.

## API Sketch
All type-specific renderers live under `src/components/Form/fields/` and share a minimal contract:
```js
const TextInputField = ({
  name,
  value,
  placeholder,
  required,
  className,
  commitOnBlur,
  onChange,
  inputRef,
}) => { /* ... */ };
```
Common props (`name`, `value`, `onChange`, `placeholder`, `required`, `className`, `inputRef`) pass through unchanged. Specialised props (e.g. `tags`, `onAddTag`, `correspondingAuthorId`) are forwarded only to the renderer that needs them.

`FormField` remains the default export orchestrator:
```js
const FormField = ({ type = 'text', ...props }) => (
  <FormFieldShell {...shellProps}>
    <Renderer {...props} />
  </FormFieldShell>
);
```

## Accessibility Notes
- `FormFieldShell` keeps the `<label>` element and `required` indicator, ensuring every renderer receives a labelled control via `htmlFor`.
- Tooltip usage stays in the shell with `TooltipButton`, maintaining keyboard access to explanations.
- Each renderer preserves existing keyboard interactions: text inputs still respect Enter-on-blur, tags dropdown keeps arrow navigation, multi-select chips remain focusable, and the authors renderer maintains drag-to-reorder plus corresponding-author toggles.

## Usage Examples
```jsx
// Text input (default)
<FormField name="title" label="Title" value={title} onChange={handleChange} />

// Multi-select tags
<FormField
  type="tags"
  name="keywords"
  label="Keywords"
  value={keywords}
  tags={availableKeywords}
  onAddTag={addKeyword}
  onRemoveTag={removeKeyword}
/>

// Authors with corresponding author toggle
<FormField
  type="authors"
  name="authors"
  label="Authors"
  value={selectedAuthors}
  tags={contactOptions}
  correspondingAuthorId={correspondingId}
  onCorrespondingAuthorChange={setCorrespondingId}
/>;
```
Call sites do not change; these snippets match existing usage.

## Implementation Plan
1. Create `FormFieldShell.jsx` for the shared label, tooltip toggle button, and animated tooltip content.
2. Under `src/components/Form/fields/`, add renderer components: `TextInputField`, `TextareaField`, `SelectField`, `TagsField`, `MultiSelectField`, `LicenseField`, `AuthorsField`.
3. Move the logic from the current `switch`/helper blocks into the appropriate renderer.
4. Replace the `switch` with a lookup map in `FormField.jsx`; default to `TextInputField`.
5. Ensure each renderer exports a default arrow function per `.github/prompts/use_const_lambda_function.prompt.md`.

## Migration Strategy
- Step 1 introduces the new components and updates `FormField` without touching consumers.
- Step 2 (future) can adopt renderers elsewhere if we ever need to expose them directly.
- No deprecations are required; the internal refactor is transparent to calling code.

## Tests & Documentation
- Add targeted tests for the shell (renders label/explanation) and at least one renderer (e.g. commit-on-blur behaviour for `TextInputField`) using React Testing Library.
- Inline README-style comments at the top of new renderer files describing their scope.
- Manual sanity check via `npm run dev` once practical (documented if not executed).

## Immediate Adoption
- `FormField` is the only adoption site required because it remains the canonical primitive. The change reduces its responsibilities while preserving its API, satisfying the incremental adoption expectation from `.github/prompts/promote-reusability.prompt.md`.
