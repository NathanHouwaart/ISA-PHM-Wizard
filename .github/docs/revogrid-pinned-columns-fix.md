# RevoGrid Pinned Columns Copy/Paste Fix (CORRECTED)

## Problem Description

When using RevoGrid with pinned columns (`colPinStart`) AND grouped columns (parent columns with children), copy/paste and fill handle operations across multiple columns were causing the **last 2+ column entries to disappear** from the pasted/filled selection.

### Root Cause - The Real Issue

The bug was caused by a **fundamental misunderstanding of how RevoGrid's coordinate system works with grouped columns**.

#### The Critical Difference

1. **RevoGrid's internal column arrays** (per colType):
   ```javascript
   // RevoGrid's rgCol array
   [
     {prop: 'sensor1', children: [{prop: 'sensor1_spec'}, {prop: 'sensor1_unit'}]},  // index 0
     {prop: 'sensor2', children: [{prop: 'sensor1_spec'}, {prop: 'sensor1_unit'}]},  // index 1
     {prop: 'sensor3', children: [{prop: 'sensor1_spec'}, {prop: 'sensor1_unit'}]},  // index 2
     {prop: 'sensor4', children: [{prop: 'sensor1_spec'}, {prop: 'sensor1_unit'}]}   // index 3
   ]
   ```

2. **Our flattened column array** (for rendering):
   ```javascript
   [
     {prop: 'actions'},        // index 0 (pinned)
     {prop: 'name'},           // index 1 (pinned)
     {prop: 'sensor1_spec'},   // index 2 (child of sensor1)
     {prop: 'sensor1_unit'},   // index 3 (child of sensor1)
     {prop: 'sensor2_spec'},   // index 4 (child of sensor2)
     {prop: 'sensor2_unit'},   // index 5 (child of sensor2)
     {prop: 'sensor3_spec'},   // index 6 (child of sensor3)
     {prop: 'sensor3_unit'},   // index 7 (child of sensor3)
     {prop: 'sensor4_spec'},   // index 8 (child of sensor4)
     {prop: 'sensor4_unit'}    // index 9 (child of sensor4)
   ]
   ```

3. **RevoGrid's data format** (the actual data):
   ```javascript
   {
     0: {  // rowIndex
       'sensor1_spec': 'value1',
       'sensor1_unit': 'value2',
       'sensor2_spec': 'value3',
       'sensor2_unit': 'value4',
       'sensor3_spec': 'value5',  // These were missing!
       'sensor3_unit': 'value6',  // These were missing!
     }
   }
   ```

#### What Was Going Wrong

When dragging across 4 parent columns (e.g., sensor1 through sensor4):

1. RevoGrid sends: `{ x: 0, x1: 3, colType: 'rgCol' }`
   - Meaning: columns 0-3 in RevoGrid's rgCol array (4 parent columns)

2. Our code translated: offset = 2 (pinned columns), so `{ x: 2, x1: 5 }`
   - We thought: indices 2-5 in our flattened array

3. We iterated: indices 2, 3, 4, 5
   - Getting props: `sensor1_spec`, `sensor1_unit`, `sensor2_spec`, `sensor2_unit`

4. **But RevoGrid's data had ALL 8 child columns** (4 parents × 2 children):
   - `sensor1_spec`, `sensor1_unit`, `sensor2_spec`, `sensor2_unit`, 
   - `sensor3_spec`, `sensor3_unit`, `sensor4_spec`, `sensor4_unit`

5. **Result**: We only processed the first 4 child columns, missing the last 4!

### The Bug in Code

```javascript
// WRONG: Using translated coordinates to iterate
const translatedRange = translateRangeCoordinates(newRange);
const flatColumns = getFlatColumns();

for (let colIndex = translatedRange.x; colIndex <= translatedRange.x1; colIndex++) {
    const column = flatColumns[colIndex];  // ← Gets wrong columns!
    const columnProp = column.prop;
    
    if (data[rowIndex][columnProp]) {  // ← Some props not found!
        // process...
    }
}
```

The issue: We're using **RevoGrid's parent column count** to index into **our flattened child column array**. They don't align!

## Solution

**Key Insight**: RevoGrid's clipboard and autofill events provide data in the format `{ rowIndex: { columnProp: value } }`. The `columnProp` keys are **already absolute** - they're the column's `prop` field, not relative indexes.

### Changes Made

1. **Removed coordinate translation from data processing**
   - Keep translation only for range validation/display
   - Process data using column props directly

2. **Improved coordinate translation function**
   - Added better null/undefined checks
   - Enhanced logging for debugging

3. **Fixed clipboard paste handler** (`handleClipboardRangePaste`)
   ```javascript
   // AFTER (CORRECT) - Use column props directly
   for (const [rowIndexStr, rowDataObj] of Object.entries(data)) {
       const rowIndex = parseInt(rowIndexStr, 10);
       const row = getRowByIndex(rowIndex);
       
       // Iterate through column props (NOT indexes)
       for (const [columnProp, value] of Object.entries(rowDataObj)) {
           // columnProp is already the correct column identifier
           const isStaticColumn = staticColumns.some(col => col.prop === columnProp);
           // ... process update
       }
   }
   ```

4. **Fixed autofill handler** (`handleBeforeAutofill`)
   - Same principle: use column props from `detail.newData`, not translated coordinates

## How RevoGrid Actually Works

Based on RevoGrid source code analysis:

### Clipboard Events

1. **`clipboardrangepaste`** event detail structure:
   ```typescript
   {
       data: { 
           [rowIndex: number]: { 
               [columnProp: string]: value 
           } 
       },
       range: RangeArea,  // For display/validation only
       models: Partial<DataLookup>
   }
   ```

2. **`beforeautofill`** event detail structure:
   ```typescript
   {
       newData: { 
           [rowIndex: number]: { 
               [columnProp: string]: value 
           } 
       },
       newRange: RangeArea,
       oldRange: RangeArea,
       colType: DimensionCols,  // Type of columns involved
       mapping: OldNewRangeMapping
   }
   ```

### Key Takeaway

**RevoGrid's internal clipboard/autofill system already handles pinned column complexity**. The data it provides is:
- Keyed by column `prop` (string property name)
- **NOT** keyed by colType-relative index
- Safe to process without coordinate translation

## Testing

To verify the fix works:

1. **Setup**: Create a grid with pinned columns and multiple dynamic columns
   ```javascript
   staticColumns = [
       { prop: 'name', pin: 'colPinStart' },  // Pinned
       { prop: 'description', pin: 'colPinStart' }  // Pinned
   ]
   // + multiple dynamic columns
   ```

2. **Test Copy/Paste**:
   - Select multiple cells across 4+ columns (including some after pinned columns)
   - Copy (Ctrl+C)
   - Paste to another row (Ctrl+V)
   - ✅ All columns should paste correctly, including the last ones

3. **Test Fill Handle**:
   - Select a cell with a value
   - Drag the fill handle across 4+ columns
   - ✅ All columns should fill correctly, including the last ones

## Files Modified

- `src/components/DataGrid/DataGrid.jsx`
  - `translateRangeCoordinates()` - Better error handling
  - `handleClipboardRangePaste()` - Fixed to use column props
  - `handleBeforeAutofill()` - Fixed to use column props

## References

- [RevoGrid Clipboard Documentation](https://rv-grid.com/guide/clipboard/)
- [RevoGrid Column Pinning](https://rv-grid.com/guide/column/pinning.html)
- [RevoGrid Source - autofill.service.tsx](https://github.com/revolist/revogrid/tree/main/src/components/overlay/autofill.service.tsx)
- [RevoGrid Source - column.service.ts](https://github.com/revolist/revogrid/tree/main/src/components/data/column.service.ts)

## Lesson Learned

**Trust the library's data format**. When RevoGrid provides data keyed by `columnProp`, don't try to translate it back to indexes - the library has already done the hard work of handling pinned columns internally. Our job is to consume the data as provided.
