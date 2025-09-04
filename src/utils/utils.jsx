import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { GrayCell, PatternCellTemplate } from '../components/GridTable/CellTemplates';

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

  rawMeasurements.forEach((measurement) => {
    const {studyId, value} = measurement;
    const dynamicFieldId = measurement[Object.keys(measurement).find(k => k !== 'studyId' && k !== 'value')];

    if (!valueMap[dynamicFieldId]) valueMap[dynamicFieldId] = {};
    valueMap[dynamicFieldId][studyId] = value;
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



// Converts normalized global state to transposed grid format (studies as rows, sensors as columns)
export function getTransposedGridData(studies, sensors, mappings) {
  if (!studies || !sensors || !mappings) {
    return [];
  }
  
  return studies.map(study => {
    const studyRow = {
      id: study.id,
      name: study.name,
      description: study.description,
      submissionDate: study.submissionDate,
      publicationDate: study.publicationDate
    };

    // Add sensor values as columns
    sensors.forEach(sensor => {
      const mapping = mappings.find(
        m => m.studyId === study.id && m.sensorId === sensor.id
      );
      studyRow[sensor.id] = mapping?.value || '';
    });

    return studyRow;
  });
}

// Converts transposed grid data back to normalized global mapping
export function flattenTransposedGridData(gridData, sensors) {
  const mappings = [];
  
  gridData.forEach(studyRow => {
    sensors.forEach(sensor => {
      const value = studyRow[sensor.id];
      if (value !== undefined && value !== null && value !== '') {
        mappings.push({
          studyId: studyRow.id,
          sensorId: sensor.id,
          value: value
        });
      }
    });
  });

  return mappings;
}

// Generates transposed column structure for RevoGrid
export function getTransposedColumns(studies, sensors, sensorPrefix = "Sensor S", studyProperties = [
  { 
      prop: 'id', 
      name: 'Study ID', 
      pin: 'colPinStart', 
      readonly: true, 
      size: 100, 
      cellTemplate: Template(PatternCellTemplate, { prefix: "Study S" }), 
      cellProperties: GrayCell 
  },
  { prop: 'name', name: 'Study Title', size: 200, readonly: true },
  { prop: 'description', name: 'Description', size: 300, readonly: true },
]) {
  return [
    ...studyProperties.map((prop, index) => ({
      ...prop,
      cellProperties: index === studyProperties.length - 1 
        ? () => ({ style: { "border-right": "3px solid black" } })
        : prop.cellProperties
    })),
    ...(sensors || []).map((sensor, index) => ({
      prop: sensor.id,
      name: `${sensorPrefix}${(index + 1).toString().padStart(2, '0')}`,
      size: 150
    }))
  ];
}