import React, { useEffect, useState } from 'react';

const StudyDataTransformer = ({ studyVariables, studies, rawMeasurements }) => {
  const [structuredVariables, setStructuredVariables] = useState([]);

  useEffect(() => {
    // Build a lookup: variableId -> studyId -> value
    const valueMap = {};

    rawMeasurements.forEach(({ studyId, studyVariableId, value }) => {
      if (!valueMap[studyVariableId]) {
        valueMap[studyVariableId] = {};
      }
      valueMap[studyVariableId][studyId] = value;
    });

    // Transform each variable by attaching its values per study
    const merged = studyVariables.map((variable) => {
      const id = variable.id;
      const studyValues = valueMap[id] || {};

      // Add a key for each study with its corresponding value (if any)
      const studyEntries = {};
      studies.forEach((study) => {
        studyEntries[study.id] = studyValues[study.id] ?? null;
      });

      return {
        ...variable,
        ...studyEntries // dynamically add s01, s02, etc.
      };
    });

    setStructuredVariables(merged);
  }, [studyVariables, studies, rawMeasurements]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Structured Variables by Study</h2>
      <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
        {JSON.stringify(structuredVariables, null, 2)}
      </pre>
    </div>
  );
};

export function getStructuredVariables(studyVariables, studies, rawMeasurements) {
  // Build a lookup: variableId -> studyId -> value
  const valueMap = {};

  rawMeasurements.forEach(({ studyId, studyVariableId, value }) => {
    if (!valueMap[studyVariableId]) {
      valueMap[studyVariableId] = {};
    }
    valueMap[studyVariableId][studyId] = value;
  });

  // Transform each variable by attaching its values per study
  return studyVariables.map((variable) => {
    const id = variable.id;
    const studyValues = valueMap[id] || {};

    // Add a key for each study with its corresponding value (if any)
    const studyEntries = {};
    studies.forEach((study) => {
      studyEntries[study.id] = studyValues[study.id] ?? null;
    });

    return {
      ...variable,
      ...studyEntries // dynamically add s01, s02, etc.
    };
  });
}

export default StudyDataTransformer;
