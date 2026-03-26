import { useCallback, useMemo } from 'react';
import { normalizeStudyOutputMode, OUTPUT_MODE_RAW_ONLY } from '../utils/studyOutputMode';

const useStudyOutputModeSelection = ({
  studies = [],
  setStudies,
}) => {
  const selectedOutputModeByStudy = useMemo(() => {
    const byStudy = {};
    (studies || []).forEach((study) => {
      if (!study?.id) return;
      byStudy[study.id] = normalizeStudyOutputMode(study.outputMode, OUTPUT_MODE_RAW_ONLY);
    });
    return byStudy;
  }, [studies]);

  const updateStudyOutputMode = useCallback((studyId, outputMode) => {
    if (!studyId) return;
    const normalizedMode = normalizeStudyOutputMode(outputMode, OUTPUT_MODE_RAW_ONLY);

    setStudies((prevStudies) => (prevStudies || []).map((study) => {
      if (study.id !== studyId) return study;
      if (normalizeStudyOutputMode(study.outputMode, OUTPUT_MODE_RAW_ONLY) === normalizedMode) return study;
      return { ...study, outputMode: normalizedMode };
    }));
  }, [setStudies]);

  const updateAllStudyOutputModes = useCallback((outputMode) => {
    const normalizedMode = normalizeStudyOutputMode(outputMode, OUTPUT_MODE_RAW_ONLY);

    setStudies((prevStudies) => {
      const safePrev = Array.isArray(prevStudies) ? prevStudies : [];
      let changed = false;

      const nextStudies = safePrev.map((study) => {
        const current = normalizeStudyOutputMode(study?.outputMode, OUTPUT_MODE_RAW_ONLY);
        if (current === normalizedMode) {
          return study;
        }
        changed = true;
        return { ...study, outputMode: normalizedMode };
      });

      return changed ? nextStudies : prevStudies;
    });
  }, [setStudies]);

  const handleGridRowDataChange = useCallback((nextRows) => {
    const currentModesByStudy = new Map(
      (studies || []).map((study) => [study.id, normalizeStudyOutputMode(study.outputMode, OUTPUT_MODE_RAW_ONLY)])
    );

    const seenValuesByStudy = new Map();
    (nextRows || []).forEach((row) => {
      if (!row?.studyId) return;
      if (!seenValuesByStudy.has(row.studyId)) {
        seenValuesByStudy.set(row.studyId, new Set());
      }
      seenValuesByStudy.get(row.studyId).add(normalizeStudyOutputMode(row.outputMode, OUTPUT_MODE_RAW_ONLY));
    });

    const nextModesByStudy = new Map();
    seenValuesByStudy.forEach((valueSet, studyId) => {
      const values = Array.from(valueSet);
      const currentMode = currentModesByStudy.get(studyId) || OUTPUT_MODE_RAW_ONLY;
      const changedMode = values.find((value) => value !== currentMode);
      const nextMode = changedMode ?? (values[0] ?? currentMode);
      if (nextMode !== currentMode) {
        nextModesByStudy.set(studyId, nextMode);
      }
    });

    if (!nextModesByStudy.size) return;

    setStudies((prevStudies) => {
      let changed = false;
      const nextStudies = (prevStudies || []).map((study) => {
        if (!nextModesByStudy.has(study.id)) return study;
        const nextMode = nextModesByStudy.get(study.id) || OUTPUT_MODE_RAW_ONLY;
        if (normalizeStudyOutputMode(study.outputMode, OUTPUT_MODE_RAW_ONLY) === nextMode) {
          return study;
        }
        changed = true;
        return { ...study, outputMode: nextMode };
      });
      return changed ? nextStudies : prevStudies;
    });
  }, [studies, setStudies]);

  return {
    selectedOutputModeByStudy,
    updateStudyOutputMode,
    updateAllStudyOutputModes,
    handleGridRowDataChange,
  };
};

export default useStudyOutputModeSelection;
