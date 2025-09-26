This README explains the new "Assign files to selection" feature added to the DataGrid and how to run the dev server and tests.

Run dev server:

```powershell
npm install
npm run dev
```

Run unit tests (Vitest):

```powershell
npm install
npm test
```

Feature summary:
- Select a rectangular range in the RevoGrid.
- Use the controls: "Assign files" to select multiple files, or "Assign directory" to select a directory (uses webkitdirectory when available).
- Files are mapped row-major to the rectangular range. Only file names or webkitRelativePath are used; file contents are NOT read.
- After applying mappings, the grid is forced to re-render so new values appear immediately.

Notes:
- Directory selection relies on the non-standard `webkitdirectory` attribute; browsers that don't support it will fall back to selecting multiple files.
- The implementation avoids storing large FileList objects in React state; files are temporarily held in a ref and processed immediately.
