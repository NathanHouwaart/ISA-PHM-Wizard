// Utility helpers for test setup content comparison and related helpers
// Keep this file small and focused so both the hook and import logic can reuse it.

/**
 * Compare two test setup objects by their content only (exclude version metadata).
 * Returns true when content differs, false when content is equal.
 */
export function hasContentChanged(setup1, setup2) {
  if (!setup1 || !setup2) return true;
  const { version: v1, lastModified: lm1, ...content1 } = setup1;
  const { version: v2, lastModified: lm2, ...content2 } = setup2;
  try {
    return JSON.stringify(content1) !== JSON.stringify(content2);
  } catch (e) {
    // Fallback: if stringify fails, conservatively assume changed
    return true;
  }
}

export default { hasContentChanged };
