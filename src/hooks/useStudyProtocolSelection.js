import { useCallback, useMemo } from 'react';

const useStudyProtocolSelection = ({
  studies = [],
  setStudies,
  selection = [],
  setSelection,
  protocolField
}) => {
  const selectedProtocolByStudy = useMemo(() => {
    const byStudy = {};

    (selection || []).forEach((entry) => {
      if (!entry?.studyId) return;
      byStudy[entry.studyId] = entry.protocolId || '';
    });

    (studies || []).forEach((study) => {
      if (!study?.id) return;
      if (study[protocolField] && !byStudy[study.id]) {
        byStudy[study.id] = study[protocolField];
      }
    });

    return byStudy;
  }, [selection, studies, protocolField]);

  const updateStudyProtocol = useCallback((studyId, protocolId) => {
    if (!studyId) return;

    setStudies((prevStudies) => (prevStudies || []).map((study) => (
      study.id === studyId ? { ...study, [protocolField]: protocolId || '' } : study
    )));

    setSelection((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const withoutStudy = safePrev.filter((entry) => entry?.studyId !== studyId);
      return [...withoutStudy, { studyId, protocolId: protocolId || '' }];
    });
  }, [setSelection, setStudies, protocolField]);

  const handleGridRowDataChange = useCallback((nextRows) => {
    const currentProtocolByStudy = new Map(
      (studies || []).map((study) => [study.id, study[protocolField] || ''])
    );

    const seenValuesByStudy = new Map();
    (nextRows || []).forEach((row) => {
      if (!row?.studyId) return;
      if (!seenValuesByStudy.has(row.studyId)) {
        seenValuesByStudy.set(row.studyId, new Set());
      }
      seenValuesByStudy.get(row.studyId).add(row[protocolField] || '');
    });

    const protocolByStudy = new Map();
    seenValuesByStudy.forEach((valueSet, studyId) => {
      const values = Array.from(valueSet);
      const currentValue = currentProtocolByStudy.get(studyId) || '';
      const changedValue = values.find((value) => value !== currentValue);
      const nextValue = changedValue ?? (values[0] ?? currentValue);
      if (nextValue !== currentValue) {
        protocolByStudy.set(studyId, nextValue);
      }
    });

    if (!protocolByStudy.size) return;

    setStudies((prevStudies) => {
      let changed = false;
      const nextStudies = (prevStudies || []).map((study) => {
        if (!protocolByStudy.has(study.id)) return study;
        const nextProtocolId = protocolByStudy.get(study.id) || '';
        if ((study[protocolField] || '') === nextProtocolId) return study;
        changed = true;
        return {
          ...study,
          [protocolField]: nextProtocolId
        };
      });
      return changed ? nextStudies : prevStudies;
    });

    setSelection((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const filtered = safePrev.filter((entry) => !protocolByStudy.has(entry?.studyId));
      const nextSelections = [...filtered];
      protocolByStudy.forEach((protocolId, studyId) => {
        nextSelections.push({ studyId, protocolId: protocolId || '' });
      });
      const unchanged = safePrev.length === nextSelections.length && safePrev.every((entry, index) => (
        entry?.studyId === nextSelections[index]?.studyId &&
        (entry?.protocolId || '') === (nextSelections[index]?.protocolId || '')
      ));
      if (unchanged) return safePrev;
      return nextSelections;
    });
  }, [studies, setStudies, setSelection, protocolField]);

  return {
    selectedProtocolByStudy,
    updateStudyProtocol,
    handleGridRowDataChange
  };
};

export default useStudyProtocolSelection;
