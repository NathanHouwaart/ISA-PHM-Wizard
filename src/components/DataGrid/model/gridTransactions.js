const isPrimitive = (value) => ['string', 'number', 'boolean'].includes(typeof value);

const isChildColumnId = (columnId) =>
    typeof columnId === 'string' && (columnId.endsWith('_spec') || columnId.endsWith('_unit'));

const toBaseColumnId = (columnId) =>
    isChildColumnId(columnId) ? columnId.replace(/_(spec|unit)$/, '') : columnId;

export function extractCellValue(value) {
    if (!value || typeof value !== 'object') return value;

    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
        const candidate = value.value;
        if (candidate === null || candidate === undefined) return '';
        if (isPrimitive(candidate)) return candidate;
    }

    if (Object.prototype.hasOwnProperty.call(value, 'id')) {
        const candidate = value.id;
        if (candidate === null || candidate === undefined) return '';
        if (isPrimitive(candidate)) return candidate;
    }

    return value;
}

export function scrubControlChars(input) {
    let hadControlChars = false;
    let output = '';
    let previousWasSpace = false;

    for (const ch of input) {
        const code = ch.charCodeAt(0);
        const isControl = code <= 31 || code === 127;
        if (isControl) {
            hadControlChars = true;
            if (!previousWasSpace) {
                output += ' ';
                previousWasSpace = true;
            }
            continue;
        }

        output += ch;
        previousWasSpace = false;
    }

    return hadControlChars ? output.replace(/\s+/g, ' ').trim() : input;
}

export function normalizeCellValue(value) {
    const extractedValue = extractCellValue(value);
    if (extractedValue === undefined || extractedValue === null) return '';
    if (!isPrimitive(extractedValue)) return '';
    return scrubControlChars(String(extractedValue));
}

export function parseChildMappingValue(rawValue) {
    if (Array.isArray(rawValue)) {
        return {
            specification: rawValue[0] ?? '',
            unit: rawValue[1] ?? ''
        };
    }

    if (typeof rawValue === 'string') {
        const [specification = '', unit = ''] = rawValue.split(';');
        return { specification, unit };
    }

    if (rawValue && typeof rawValue === 'object') {
        return {
            specification: rawValue.specification ?? '',
            unit: rawValue.unit ?? ''
        };
    }

    return { specification: '', unit: '' };
}

export function applyRowUpdates(baseRows, rowDataUpdates, rowIdKey = 'id') {
    if (!rowDataUpdates || rowDataUpdates.length === 0) return baseRows;

    const updatesByRowId = new Map();
    rowDataUpdates.forEach(({ rowId, columnProp, value }) => {
        if (!updatesByRowId.has(rowId)) {
            updatesByRowId.set(rowId, {});
        }
        updatesByRowId.get(rowId)[columnProp] = normalizeCellValue(value);
    });

    return (baseRows || []).map((row) => {
        const rowId = row?.[rowIdKey];
        const updates = updatesByRowId.get(rowId);
        if (!updates) return row;
        return { ...row, ...updates };
    });
}

export function applyMappingUpdates(baseMappings, mappingUpdates, fields) {
    if (!mappingUpdates || mappingUpdates.length === 0) return baseMappings;

    const {
        mappingRowId = 'studyId',
        mappingColumnId = 'studyVariableId',
        mappingValue = 'value',
        hasChildColumns = false
    } = fields || {};

    const nextMappings = [...(baseMappings || [])];

    mappingUpdates.forEach(({ rowId, columnId, value }) => {
        const cleanedValue = normalizeCellValue(value);
        const isChildColumn = isChildColumnId(columnId);
        const actualColumnId = toBaseColumnId(columnId);

        const existingIndex = nextMappings.findIndex((mapping) =>
            mapping?.[mappingRowId] === rowId &&
            mapping?.[mappingColumnId] === actualColumnId
        );

        if (existingIndex >= 0) {
            const existing = nextMappings[existingIndex];

            if (isChildColumn && hasChildColumns) {
                const parsedValue = parseChildMappingValue(existing?.[mappingValue]);
                const nextValue = columnId.endsWith('_spec')
                    ? [cleanedValue, parsedValue.unit]
                    : [parsedValue.specification, cleanedValue];

                nextMappings[existingIndex] = {
                    ...existing,
                    [mappingValue]: nextValue
                };
            } else {
                nextMappings[existingIndex] = {
                    ...existing,
                    [mappingValue]: cleanedValue
                };
            }
            return;
        }

        const initialValue = (isChildColumn && hasChildColumns)
            ? (columnId.endsWith('_spec') ? [cleanedValue, ''] : ['', cleanedValue])
            : cleanedValue;

        nextMappings.push({
            [mappingRowId]: rowId,
            [mappingColumnId]: actualColumnId,
            [mappingValue]: initialValue
        });
    });

    return nextMappings;
}

export function getNormalizedCurrentMappingValue(baseMappings, rowId, columnId, fields) {
    const {
        mappingRowId = 'studyId',
        mappingColumnId = 'studyVariableId',
        mappingValue = 'value',
        hasChildColumns = false
    } = fields || {};

    const isChildColumn = isChildColumnId(columnId);
    const actualColumnId = toBaseColumnId(columnId);

    const existing = (baseMappings || []).find((mapping) =>
        mapping?.[mappingRowId] === rowId &&
        mapping?.[mappingColumnId] === actualColumnId
    );
    if (!existing) return '';

    if (isChildColumn && hasChildColumns) {
        const parsed = parseChildMappingValue(existing?.[mappingValue]);
        const rawValue = columnId.endsWith('_spec') ? parsed.specification : parsed.unit;
        return normalizeCellValue(rawValue);
    }

    return normalizeCellValue(existing?.[mappingValue]);
}

export function filterEffectiveRowUpdates(updates, baseRows, rowIdKey = 'id') {
    if (!updates || updates.length === 0) return [];

    const rowLookup = new Map((baseRows || []).map((row) => [row?.[rowIdKey], row]));
    const deduped = new Map();

    updates.forEach((update) => {
        if (!update?.rowId || !update?.columnProp) return;
        const key = `${update.rowId}::${update.columnProp}`;
        deduped.set(key, {
            rowId: update.rowId,
            columnProp: update.columnProp,
            value: normalizeCellValue(update.value)
        });
    });

    return Array.from(deduped.values()).filter((update) => {
        const row = rowLookup.get(update.rowId);
        const currentValue = normalizeCellValue(row?.[update.columnProp]);
        return currentValue !== update.value;
    });
}

export function filterEffectiveMappingUpdates(updates, baseMappings, fields) {
    if (!updates || updates.length === 0) return [];

    const deduped = new Map();
    updates.forEach((update) => {
        if (!update?.rowId || !update?.columnId) return;
        const key = `${update.rowId}::${update.columnId}`;
        deduped.set(key, {
            rowId: update.rowId,
            columnId: update.columnId,
            value: normalizeCellValue(update.value)
        });
    });

    return Array.from(deduped.values()).filter((update) => {
        const currentValue = getNormalizedCurrentMappingValue(
            baseMappings,
            update.rowId,
            update.columnId,
            fields
        );
        return currentValue !== update.value;
    });
}

