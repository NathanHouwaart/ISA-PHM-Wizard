/**
 * Create mapping updates from a rectangular range and a list of files.
 *
 * This is a pure function. It does NOT inspect DOM or perform side effects.
 * It returns an array of objects in the shape:
 *   { mappingRowId, mappingColumnId, mappingValue }
 *
 * Assignment strategy (reasonable defaults):
 * - Iterate cells row-major from top-left to bottom-right.
 * - Assign one file per cell in order. If files < cells, remaining cells are left unassigned.
 * - If a File has `webkitRelativePath`, prefer that (gives a relative path inside selected dir), otherwise use file.name.
 *
 * Inputs:
 * - range: { x, y, x1?, y1? } (inclusive indices, x..x1 and y..y1)
 * - rows: array of row objects (must contain id or index info; function will use row.id when present)
 * - flatCols: flattened array of column definitions (each must have prop field)
 * - files: array-like of File objects (only name and webkitRelativePath used)
 */
export function applyFilesToRange(range, rows, flatCols, files) {
  if (!range || !rows || !flatCols || !files) return [];

  const x0 = typeof range.x === 'number' ? range.x : 0;
  const y0 = typeof range.y === 'number' ? range.y : 0;
  const x1 = typeof range.x1 === 'number' ? range.x1 : x0;
  const y1 = typeof range.y1 === 'number' ? range.y1 : y0;

  // Normalize bounds
  const sx = Math.min(x0, x1);
  const ex = Math.max(x0, x1);
  const sy = Math.min(y0, y1);
  const ey = Math.max(y0, y1);

  const totalCells = (ey - sy + 1) * (ex - sx + 1);
  const fileArray = Array.prototype.slice.call(files || []);

  const results = [];
  let fileIndex = 0;

  for (let r = sy; r <= ey; r++) {
    const row = rows[r];
    if (!row) continue;

    for (let c = sx; c <= ex; c++) {
      const col = flatCols[c];
      if (!col) continue;

      if (fileIndex >= fileArray.length) {
        // No more files to assign
        break;
      }

      const f = fileArray[fileIndex++];
      const path = f.webkitRelativePath && f.webkitRelativePath.trim() !== '' ? f.webkitRelativePath : f.name;

      results.push({
        mappingRowId: row.id ?? row.rowId ?? r,
        mappingColumnId: col.prop,
        mappingValue: path
      });
    }
  }

  return results;
}

export default applyFilesToRange;
