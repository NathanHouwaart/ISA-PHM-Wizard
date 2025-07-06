import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatAuthorName = (author) => {
  if (!author) return 'Unknown Author';
  return `${author.firstName} ${author.midInitials ? author.midInitials + ' ' : ''}${author.lastName}`.trim();
};

// Converts normalized global state to grid-compatible flat format
export function getStructuredVariables(studyVariables, studies, rawMeasurements) {
  const valueMap = {};

  rawMeasurements.forEach(({ studyId, studyVariableId, value }) => {
    if (!valueMap[studyVariableId]) valueMap[studyVariableId] = {};
    valueMap[studyVariableId][studyId] = value;
  });


  return studyVariables.map((variable) => {
    const id = variable.id;
    const studyValues = valueMap[id] || {};

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

// Converts grid state back to normalized global mapping
export function flattenGridDataToMappings(gridData, studies, idFieldName = 'studyVariableId') {
  const mappings = [];

  gridData.forEach((row) => {
    const variableId = row.id;

    studies.forEach((study) => {
      const value = row[study.id];
      if (value !== undefined && value !== null && value !== '') {
        mappings.push({
          studyId: study.id,
          [idFieldName]: variableId,
          value,
        });
      }
    });
  });


  return mappings;
}

