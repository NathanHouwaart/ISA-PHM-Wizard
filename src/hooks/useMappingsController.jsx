import { useCallback, useRef } from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

/**
 * Lightweight mappings controller that provides a stable API for reading and
 * updating study<->variable mappings. Defaults to the global context but can
 * be adapted by callers who pass their own mappings/update handlers.
 */
export default function useMappingsController(mappingKey = 'studyToStudyVariableMapping', keyNames = { sourceKey: 'studyVariableId', targetKey: 'studyId' }) {
  // mappingKey: name of the mapping in GlobalDataContext.dataMap
  // keyNames: object with sourceKey and targetKey naming the mapping fields
  const { dataMap } = useGlobalDataContext();

  // Fallback to the study<->variable mapping if dataMap doesn't contain mappingKey
  const mapped = (dataMap && dataMap[mappingKey]) || null;
  const [mappingsState, setMappingsState] = mapped || [[], () => {}];

  const lastRef = useRef(mappingsState || []);

  const setMappings = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(lastRef.current) : next;
    const a = JSON.stringify(resolved || []);
    const b = JSON.stringify(lastRef.current || []);
    if (a === b) return; // no-op when identical
    lastRef.current = resolved || [];
    setMappingsState(lastRef.current);
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
      const copy = Array.isArray(prev) ? prev.slice() : [];
      const idx = copy.findIndex(m => String(m[sourceKey]) === String(mappingObj[sourceKey]) && String(m[targetKey]) === String(mappingObj[targetKey]));
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], value };
      } else {
        copy.push({ [sourceKey]: mappingObj[sourceKey], [targetKey]: mappingObj[targetKey], value });
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
