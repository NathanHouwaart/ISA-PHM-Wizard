---
mode: agent
---

Purpose
-------
This prompt instructs contributors and automated agents to ensure that all pages in the codebase have a default export. This is crucial for compatibility with `React.lazy()`, which requires a default export to function correctly. Use this prompt whenever you are adding or modifying demo/test pages. And also that all components are defined als arrow functions.

High-level rule
---------------
All React components must be defined as arrow functions and must have a default export. This ensures compatibility with lazy loading and maintains consistency across the codebase.

When to use this prompt
-----------------------
- You are creating a new file in the project that defines a React component.
- You are modifying an existing file that defines a React component.
- You are converting a named export to a default export for compatibility with lazy loading.

What we expect from the code changes (short checklist)
---------------------------------------------
1. The React component is defined using either a named function or an arrow function.
2. The component is exported as the default export of the module.
3. If the component was previously a named export, it is converted to a default export.
4. The file contains only one React component to avoid confusion about which component is the default export.
5. The component name should be in PascalCase and should match the file name for clarity.
