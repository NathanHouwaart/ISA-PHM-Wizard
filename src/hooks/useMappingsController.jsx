import { useCallback, useRef } from 'react';
import { useProjectData } from '../contexts/GlobalDataContext';

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const normalizeMappingsForComparison = (mappings, keyNames) => {
  const { sourceKey, targetKey } = keyNames;
  return (Array.isArray(mappings) ? mappings : [])
    .map((mapping) => {
      const source = String(mapping?.[sourceKey] ?? '');
      const target = String(mapping?.[targetKey] ?? '');
      return `${source}::${target}::${stableStringify(mapping ?? {})}`;
    })
    .sort();
};

const mappingsEqual = (left, right, keyNames) => {
  const normalizedLeft = normalizeMappingsForComparison(left, keyNames);
  const normalizedRight = normalizeMappingsForComparison(right, keyNames);
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
};

/**
 * Lightweight mappings controller that provides a stable API for reading and
 * updating study<->variable mappings. Defaults to the global context but can
 * be adapted by callers who pass their own mappings/update handlers.
 */
export default function useMappingsController(mappingKey = 'studyToStudyVariableMapping', keyNames = { sourceKey: 'studyVariableId', targetKey: 'studyId' }) {
  // mappingKey: name of the mapping in GlobalDataContext.dataMap
  // keyNames: object with sourceKey and targetKey naming the mapping fields
  const { dataMap } = useProjectData();

  // Fallback to the study<->variable mapping if dataMap doesn't contain mappingKey
  const mapped = (dataMap && dataMap[mappingKey]) || null;
  const [mappingsState, setMappingsState] = mapped || [[], () => {}];

  const lastRef = useRef(mappingsState || []);

  const setMappings = useCallback((next) => {
    setMappingsState((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const resolved = typeof next === 'function' ? next(base) : next;
      const nextValue = Array.isArray(resolved) ? resolved : [];

      if (mappingsEqual(nextValue, base, keyNames)) {
        lastRef.current = base;
        return base; // no-op when identical
      }

      lastRef.current = nextValue;
      return nextValue;
    });
  }, [setMappingsState, keyNames]);

  // updateMappingValue supports two signatures for backward compatibility:
  // 1) updateMappingValue(itemIndex, mappingObj, value)  (old)
  // 2) updateMappingValue(mappingObj, value)            (preferred)
  const updateMappingValue = useCallback((...args) => {
    let mappingObj, value;

    if (typeof args[0] === 'number') {
      // old signature: (itemIndex, mappingObj, value)
      mappingObj = args[1];
      value = args[2];
    } else {
      // new signature: (mappingObj, value)
      mappingObj = args[0];
      value = args[1];
    }

    const { sourceKey, targetKey } = keyNames;

    setMappingsState(prev => {
      const copy = Array.isArray(prev) ? prev.slice() : [];
      const idx = copy.findIndex(m => String(m[sourceKey]) === String(mappingObj[sourceKey]) && String(m[targetKey]) === String(mappingObj[targetKey]));
      const merged = {
        ...copy[idx],
        ...mappingObj,
        [sourceKey]: mappingObj[sourceKey],
        [targetKey]: mappingObj[targetKey],
        value
      };

      if (idx >= 0) {
        copy[idx] = merged;
      } else {
        copy.push(merged);
      }

      if (mappingsEqual(copy, prev, keyNames)) {
        lastRef.current = prev;
        return prev;
      }

      lastRef.current = copy;
      return copy;
    });
  }, [setMappingsState, keyNames]);

  return {
    mappings: mappingsState || [],
    setMappings,
    updateMappingValue,
    _lastRef: lastRef
  };
}
