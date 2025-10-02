# RevoGrid Coordinate Translation Test

## Setup
- 2 pinned columns (colPinStart): `actions`, `name`
- 5+ dynamic columns (rgCol): sensor columns

## Test Case: Drag fill handle across 4 columns starting from column 1

### What RevoGrid sends:
```javascript
{
  newRange: {
    y: 0,
    y1: 0,
    x: 0,  // relative to rgCol (first sensor)
    x1: 3, // relative to rgCol (fourth sensor)
    colType: 'rgCol'
  },
  data: {
    0: {
      'sensor1_prop': 'value',
      'sensor2_prop': 'value',
      'sensor3_prop': 'value',
      'sensor4_prop': 'value'
    }
  }
}
```

### What our translate function does:
```javascript
// Count columns before 'rgCol':
// colPinStart has 2 columns (actions, name)
offset = 2

translated = {
  x: 0 + 2 = 2,
  x1: 3 + 2 = 5
}
```

### The getFlatColumns array:
```javascript
[
  0: {prop: 'actions', pin: 'colPinStart'},
  1: {prop: 'name', pin: 'colPinStart'},
  2: {prop: 'sensor1_spec', pin: undefined},  // rgCol
  3: {prop: 'sensor1_unit', pin: undefined},
  4: {prop: 'sensor2_spec', pin: undefined},
  5: {prop: 'sensor2_unit', pin: undefined},
  6: {prop: 'sensor3_spec', pin: undefined},  // This should be included
  7: {prop: 'sensor3_unit', pin: undefined},  // This should be included
  8: {prop: 'sensor4_spec', pin: undefined},  // But is it?
  9: {prop: 'sensor4_unit', pin: undefined}
]
```

## The Bug

When we iterate with translated coordinates (2 to 5), we're accessing:
- Index 2: sensor1_spec ✓
- Index 3: sensor1_unit ✓
- Index 4: sensor2_spec ✓
- Index 5: sensor2_unit ✓

But RevoGrid's `data` object has:
- sensor1_spec
- sensor1_unit
- sensor2_spec
- sensor2_unit
- **sensor3_spec** (MISSING!)
- **sensor3_unit** (MISSING!)

## Root Cause

**We're using translated coordinates to index into flatColumns, but then looking up data by column prop**. 

The mismatch: RevoGrid's x/x1 coordinates are relative to **RevoGrid's internal column array for that colType**, which doesn't include child columns as separate entries!

### RevoGrid's rgCol columns array:
```javascript
[
  0: {prop: 'sensor1', children: [...]}  // x=0
  1: {prop: 'sensor2', children: [...]}  // x=1
  2: {prop: 'sensor3', children: [...]}  // x=2
  3: {prop: 'sensor4', children: [...]}  // x=3
]
```

### Our flattened columns array:
```javascript
[
  0: 'actions'
  1: 'name'
  2: 'sensor1_spec'    // NOT sensor1!
  3: 'sensor1_unit'
  4: 'sensor2_spec'    // NOT sensor2!
  5: 'sensor2_unit'
  ...
]
```

## Solution

**Don't use coordinate translation for data access!** RevoGrid's `data` object already has the correct column props as keys. We should only translate coordinates for validation/display purposes, not for data access.

The `data` object format is: `{ [rowIndex]: { [columnProp]: value } }`

We should iterate through the `data` object directly by its keys, not by translated coordinates!
