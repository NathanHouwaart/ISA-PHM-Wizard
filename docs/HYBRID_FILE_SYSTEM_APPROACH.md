# Browser-Specific File System Handling

## Problem Discovery

Testing revealed different browser behaviors with large datasets (100,000+ files):

- **Firefox**: `browser-fs-access` works perfectly with 100k+ files ✅
- **Chrome**: `browser-fs-access` throws `NotFoundError` with 100k+ files ❌

## Solution: Hybrid Approach

The `useFileSystem` hook now intelligently chooses the best method per browser:

### Chrome/Edge/Opera (Chromium)
- **Uses**: Native File System Access API (`window.showDirectoryPicker()`)
- **Why**: Handles 100k+ files without errors
- **Fallback**: If native API fails, automatically tries `browser-fs-access`

### Firefox/Safari
- **Uses**: `browser-fs-access` library
- **Why**: More compatible, works great for large datasets in Firefox

## Implementation Details

```javascript
if (isNativeSupported()) {
  // Chromium: Try native API first
  try {
    dataset = await indexDirectoryNative(onProgress);
  } catch (nativeErr) {
    // Fallback to browser-fs-access if native fails
    dataset = await indexDirectoryFallback(onProgress);
  }
} else {
  // Firefox/Safari: Use browser-fs-access directly
  dataset = await indexDirectoryFallback(onProgress);
}
```

## Error Handling Improvements

### Better Error Messages
The error handling now provides specific guidance based on the error type:

- **NotFoundError** (Chrome with large folders):
  ```
  The operation was canceled by the browser.
  
  This can happen with very large folders in Chrome. Try:
  • Selecting a smaller folder
  • Using Firefox instead (better for large datasets)
  • Closing other browser tabs to free memory
  • Restarting your browser
  ```

- **NotAllowedError**: "Permission denied. Please grant access to the folder."
- **AbortError**: "Operation was cancelled."

### Robust Directory Walking
The native API walker now:
- Catches errors on individual files/folders (doesn't fail entire operation)
- Logs warnings for skipped items
- Continues processing even if some entries are inaccessible
- Returns partial results instead of complete failure

```javascript
try {
  // Process entry
} catch (entryErr) {
  console.warn(`Skipping entry: ${name}`, entryErr);
  // Continue to next entry instead of failing
}
```

## User Experience

### Progress Display (All Browsers)
Both methods now show consistent progress:
- ✅ "Indexed 1,234 of 65,000 files"
- ❌ ~~"Indexing: folder/subfolder/file.txt"~~ (removed)

### No Interruptions
- Removed confirmation popup for large folders
- Indexing starts immediately after selection
- Progress bar shows status in real-time

## Recommendations

### For Users
- **100k+ files**: Use Firefox (most reliable)
- **Chrome users**: Native API works but may struggle with extremely large folders
- **Edge users**: Same as Chrome (Chromium-based)

### For Developers
The hybrid approach is transparent:
```javascript
const fileSystem = useFileSystem();
const dataset = await fileSystem.pickAndIndexDirectory();
// Automatically uses best method for current browser
```

## Tested Configurations

| Browser | Method | 50k files | 100k files | Notes |
|---------|--------|-----------|------------|-------|
| Firefox | browser-fs-access | ✅ | ✅ | Most reliable |
| Chrome | Native API | ✅ | ✅ | May need fallback |
| Chrome | browser-fs-access | ✅ | ❌ | NotFoundError |
| Edge | Native API | ✅ | ✅ | Same as Chrome |
| Safari | browser-fs-access | ✅ | ⚠️ | Untested at 100k |

## Known Limitations

1. **Chrome browser-fs-access**: Fails with NotFoundError on 100k+ files
2. **Memory**: All browsers may struggle with 500k+ files
3. **Permissions**: Must grant access each time (no persistent permissions)
4. **Performance**: 100k+ files takes 30-60 seconds regardless of method

## Future Improvements

- [ ] Add Web Worker support to offload processing from main thread
- [ ] Implement streaming/chunked IndexedDB saves for very large datasets
- [ ] Add option to limit file types during indexing (reduce dataset size)
- [ ] Investigate SharedArrayBuffer for better memory management
- [ ] Add cancellation support for long-running operations
