// Helpers to interact with RevoGrid data grid components, especially for
// capturing selection state from the DOM/webcomponent API.

// Get the grid element from a ref or query the DOM
function getGrid(gridEl) {
  return gridEl || document.querySelector('revo-grid');
}

// Normalize a raw range object from RevoGrid into our standard {x,y,x1,y1} format
// Returns null if the input is invalid.
// Also preserves column type information for coordinate translation
function normalize(r) {
  if (!r || typeof r !== 'object') return null;
  const x = typeof r.x === 'number' ? r.x : (typeof r.left === 'number' ? r.left : null);
  const y = typeof r.y === 'number' ? r.y : (typeof r.top === 'number' ? r.top : null);
  if (x === null || y === null) return null;
  
  const result = {
    x,
    y,
    x1: typeof r.x1 === 'number' ? r.x1 : (typeof r.right === 'number' ? r.right : x),
    y1: typeof r.y1 === 'number' ? r.y1 : (typeof r.bottom === 'number' ? r.bottom : y)
  };
  
  // Preserve column type information if available (needed for coordinate translation)
  if (r.colType) {
    result.colType = r.colType;
  }
  if (r.rowType) {
    result.rowType = r.rowType;
  }
  
  return result;
}

// Attempt to get the current selection from the grid's DOM state.
// Returns a normalized range object or null if not available.
export async function captureGridSelection(gridEl) {
  const el = getGrid(gridEl);
  if (!el) return null;
  if (typeof el.getSelectedRange !== 'function') return null;
  try {
    const raw = await el.getSelectedRange();
    return normalize(raw);
  } catch (err) {
    if (typeof console !== 'undefined' && console.debug) console.debug('[dataGridHelpers] getSelectedRange failed', err);
    return null;
  }
}
