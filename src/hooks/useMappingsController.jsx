import { useCallback, useRef } from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

/**
 * Lightweight mappings controller that provides a stable API for reading and
 * updating study<->variable mappings. Defaults to the global context but can
 * be adapted by callers who pass their own mappings/update handlers.
 */
export default function useMappingsController() {
  const { studyToStudyVariableMapping, setStudyToStudyVariableMapping } = useGlobalDataContext();
  const lastRef = useRef(studyToStudyVariableMapping || []);

  const setMappings = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(lastRef.current) : next;
    const a = JSON.stringify(resolved || []);
    const b = JSON.stringify(lastRef.current || []);
    if (a === b) return; // no-op when identical
    lastRef.current = resolved || [];
    setStudyToStudyVariableMapping(lastRef.current);
  }, [setStudyToStudyVariableMapping]);

  const updateMappingValue = useCallback((itemIndex, mappingObj, value) => {
    // mappingObj expected to contain { studyVariableId, studyId }
    setStudyToStudyVariableMapping(prev => {
      const copy = Array.isArray(prev) ? prev.slice() : [];
      const idx = copy.findIndex(m => m.studyVariableId === mappingObj.studyVariableId && m.studyId === mappingObj.studyId);
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], value };
      } else {
        copy.push({ studyVariableId: mappingObj.studyVariableId, studyId: mappingObj.studyId, value });
      }
      lastRef.current = copy;
      return copy;
    });
  }, [setStudyToStudyVariableMapping]);

  return {
    mappings: studyToStudyVariableMapping || [],
    setMappings,
    updateMappingValue,
    _lastRef: lastRef
  };
}
