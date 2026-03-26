import { useCallback, useRef } from 'react';
import { useProjectData } from '../contexts/GlobalDataContext';

const isShallowEqualObject = (left, right) => {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!Object.is(left[key], right[key])) return false;
  }
  return true;
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

      if (nextValue === base) {
        lastRef.current = base;
        return base; // no-op when identical
      }

      lastRef.current = nextValue;
      return nextValue;
    });
  }, [setMappingsState]);

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
      const base = Array.isArray(prev) ? prev : [];
      const idx = base.findIndex(m => String(m[sourceKey]) === String(mappingObj[sourceKey]) && String(m[targetKey]) === String(mappingObj[targetKey]));
      const copy = base.slice();
      const merged = {
        ...copy[idx],
        ...mappingObj,
        [sourceKey]: mappingObj[sourceKey],
        [targetKey]: mappingObj[targetKey],
        value
      };

      if (idx >= 0) {
        if (isShallowEqualObject(copy[idx], merged)) {
          lastRef.current = prev;
          return prev;
        }
        copy[idx] = merged;
      } else {
        copy.push(merged);
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
