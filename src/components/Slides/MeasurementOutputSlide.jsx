import React, { forwardRef, useCallback, useMemo } from 'react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import usePageTab from '../../hooks/usePageWidth';
import useMappingsController from '../../hooks/useMappingsController';
import useStudyRuns from '../../hooks/useStudyRuns';
import { buildStudyRunRowData } from '../../utils/studyRunLayouts';
import { studyCellTemplate, runCellTemplate, studyCellProperties, runCellProperties } from '../../utils/gridCellTemplates';
import useStudyProtocolSelection from '../../hooks/useStudyProtocolSelection';
import { OUTPUT_MODE_RAW_ONLY, isRawOutputEnabled, normalizeStudyOutputMode } from '../../utils/studyOutputMode';
import ProtocolOutputPanel from './ProtocolOutputPanel';

const normalizeMappingPath = (value) => {
  if (typeof value !== 'string') return '';
  let next = value.trim();
  if (!next) return '';
  next = next.replace(/\\/g, '/');
  next = next.replace(/^\.\/+/, '');
  next = next.replace(/^\/+/, '');
  next = next.replace(/\/{2,}/g, '/');
  return next;
};

export const MeasurementOutputSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
  const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');
  const elementToObserveRef = useResizeObserver(onHeightChange);
  const combinedRef = useCombinedRefs(ref, elementToObserveRef);

  const {
    studies,
    testSetups,
    selectedTestSetupId,
    selectedDataset,
    studyToMeasurementProtocolSelection
  } = useProjectData();
  const { setStudies, setStudyToMeasurementProtocolSelection } = useProjectActions();

  const selectedTestSetup = testSetups.find((setup) => setup.id === selectedTestSetupId);
  const studyRuns = useStudyRuns();

  const sensors = useMemo(() => (
    Array.isArray(selectedTestSetup?.sensors)
      ? selectedTestSetup.sensors
      : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, sensor]) => ({ id, ...sensor })) : [])
  ), [selectedTestSetup]);

  const measurementProtocolOptions = useMemo(
    () => (selectedTestSetup?.measurementProtocols || []).map((protocol) => ({
      value: protocol.id,
      label: protocol.name || 'Unnamed protocol'
    })),
    [selectedTestSetup]
  );

  const {
    selectedProtocolByStudy: selectedMeasurementProtocolByStudy,
    updateStudyProtocol: updateStudyMeasurementProtocol,
    handleGridRowDataChange: handleMeasurementProtocolGridRowDataChange
  } = useStudyProtocolSelection({
    studies,
    setStudies,
    selection: studyToMeasurementProtocolSelection,
    setSelection: setStudyToMeasurementProtocolSelection,
    protocolField: 'measurementProtocolId'
  });

  const mappingsController = useMappingsController(
    'studyToSensorMeasurementMapping',
    { sourceKey: 'sensorId', targetKey: 'studyRunId' }
  );

  const handleDataGridMappingsChange = useCallback((newMappings) => {
    mappingsController.setMappings(newMappings);
  }, [mappingsController]);
  const handleGridRowDataChange = useCallback((nextRows) => {
    handleMeasurementProtocolGridRowDataChange(nextRows);
  }, [handleMeasurementProtocolGridRowDataChange]);

  const hierarchicalRows = useMemo(
    () => buildStudyRunRowData(studies, studyRuns),
    [studies, studyRuns]
  );
  const sensorIdSet = useMemo(
    () => new Set((sensors || []).map((sensor) => String(sensor?.id || ''))),
    [sensors]
  );
  const studyModeByStudyId = useMemo(() => {
    const map = new Map();
    (studies || []).forEach((study) => {
      if (!study?.id) return;
      map.set(
        String(study.id),
        normalizeStudyOutputMode(study?.outputMode, OUTPUT_MODE_RAW_ONLY)
      );
    });
    return map;
  }, [studies]);
  const isRawEnabledForStudy = useCallback((studyId) => {
    const mode = studyModeByStudyId.get(String(studyId)) || OUTPUT_MODE_RAW_ONLY;
    return isRawOutputEnabled(mode);
  }, [studyModeByStudyId]);
  const rowsById = useMemo(() => {
    const lookup = new Map();
    (hierarchicalRows || []).forEach((row) => {
      if (!row?.id) return;
      lookup.set(String(row.id), row);
    });
    return lookup;
  }, [hierarchicalRows]);
  const firstRunIdByStudyId = useMemo(() => {
    const lookup = new Map();
    (hierarchicalRows || []).forEach((row) => {
      const studyId = String(row?.studyId || '');
      if (!studyId || lookup.has(studyId)) return;
      lookup.set(studyId, String(row?.id || ''));
    });
    return lookup;
  }, [hierarchicalRows]);
  const duplicateRawCellKeys = useMemo(() => {
    const keysByPath = new Map();

    (mappingsController.mappings || []).forEach((mapping) => {
      const sensorId = String(mapping?.sensorId || '');
      if (!sensorId) return;

      const runId = mapping?.studyRunId
        ? String(mapping.studyRunId)
        : firstRunIdByStudyId.get(String(mapping?.studyId || '')) || '';
      if (!runId) return;

      const row = rowsById.get(runId);
      if (!row) return;
      if (!isRawEnabledForStudy(row.studyId)) return;

      const normalizedPath = normalizeMappingPath(mapping?.value);
      if (!normalizedPath) return;

      const cellKey = `${runId}::${sensorId}`;
      const bucket = keysByPath.get(normalizedPath) || [];
      bucket.push(cellKey);
      keysByPath.set(normalizedPath, bucket);
    });

    const duplicates = new Set();
    keysByPath.forEach((cellKeys) => {
      if (cellKeys.length < 2) return;
      cellKeys.forEach((cellKey) => duplicates.add(cellKey));
    });

    return duplicates;
  }, [mappingsController.mappings, firstRunIdByStudyId, rowsById, isRawEnabledForStudy]);

  const measurementOutputGridConfig = useMemo(() => ({
    title: 'Mappings for measurement output',
    rowData: hierarchicalRows,
    columnData: selectedTestSetup?.sensors || [],
    mappings: mappingsController.mappings,
    fieldMappings: {
      rowId: 'id',
      rowName: 'name',
      columnId: 'id',
      columnName: 'alias',
      columnUnit: '',
      mappingRowId: 'studyRunId',
      mappingColumnId: 'sensorId',
      mappingValue: 'value'
    },
    customActions: [],
    staticColumns: [
      {
        prop: 'studyDisplayName',
        name: 'Study',
        size: 220,
        readonly: true,
        pin: 'colPinStart',
        cellTemplate: studyCellTemplate,
        cellProperties: studyCellProperties
      },
      {
        prop: 'runLabel',
        name: 'Run',
        size: 140,
        readonly: true,
        pin: 'colPinStart',
        cellTemplate: runCellTemplate,
        cellProperties: runCellProperties
      },
      {
        prop: 'measurementProtocolId',
        name: 'Measurement Protocol',
        size: 260,
        readonly: false,
        pin: 'colPinStart',
        columnType: 'select',
        labelKey: 'label',
        valueKey: 'value',
        source: measurementProtocolOptions,
        cellProperties: (props) => {
          const model = props?.model;
          const style = {
            'border-right': '3px solid black'
          };
          if (model?.isLastRunInStudy) {
            style['border-bottom'] = '3px solid black';
          }
          if (!model?.showStudyLabel) {
            style.background = '#f3f4f6';
            style.color = '#6b7280';
          }
          return { style };
        }
      }
    ],
    isCellEditable: ({ row, columnProp }) => {
      if (!row || !columnProp) return false;
      if (columnProp === 'measurementProtocolId') {
        return Boolean(row?.showStudyLabel);
      }
      if (sensorIdSet.has(String(columnProp))) {
        return isRawEnabledForStudy(row?.studyId);
      }
      return true;
    },
    mappingCellProperties: ({ row, columnId }) => {
      const style = {};
      if (!isRawEnabledForStudy(row?.studyId)) {
        style.background = '#f3f4f6';
        style.color = '#9ca3af';
        return { style };
      }

      const cellKey = `${String(row?.id || '')}::${String(columnId || '')}`;
      if (duplicateRawCellKeys.has(cellKey)) {
        style.background = '#fef3c7';
        style.color = '#92400e';
      }
      return Object.keys(style).length > 0 ? { style } : {};
    }
  }), [
    hierarchicalRows,
    selectedTestSetup,
    mappingsController.mappings,
    measurementProtocolOptions,
    sensorIdSet,
    isRawEnabledForStudy,
    duplicateRawCellKeys
  ]);

  return (
    <div ref={combinedRef}>
      <SlidePageTitle>
        Raw Measurement Output
      </SlidePageTitle>

      <SlidePageSubtitle>
        This slide allows you to view and edit raw measurement output mappings across studies, runs, and sensors of the selected test setup. Use the Study Output Mode slide first; rows set to processed-only are automatically grayed out and locked here, while measurement protocol selection remains required.
      </SlidePageSubtitle>

      <ProtocolOutputPanel
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        selectedTestSetupId={selectedTestSetupId}
        sensors={sensors}
        protocolOptions={measurementProtocolOptions}
        studies={studies}
        selectedDataset={selectedDataset}
        protocolMissingMessage="Define one or more measurement protocol variants in the Test Setup page to select them per study."
        noDatasetMessage={
          <>To use the file assignment feature (<strong>📁 Assign files</strong> button), you need to index a dataset first. Go to the project settings and index a folder containing your measurement files.</>
        }
        simplePanelTitle="Sensor Output Mapping"
        protocolLabel="Measurement Protocol"
        selectedProtocolByStudy={selectedMeasurementProtocolByStudy}
        onStudyProtocolChange={updateStudyMeasurementProtocol}
        fileFieldScope="raw"
        fileFieldLabel="Raw Measurement File"
        studyRuns={studyRuns}
        mappings={mappingsController.mappings}
        onMappingInputChange={mappingsController.updateMappingValue}
        gridConfig={measurementOutputGridConfig}
        onDataChange={handleDataGridMappingsChange}
        onRowDataChange={handleGridRowDataChange}
        currentPage={currentPage}
        pageIndex={pageIndex}
      />
    </div>
  );
});

MeasurementOutputSlide.displayName = 'Measurement Output';

export default MeasurementOutputSlide;
