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
import ProtocolOutputPanel from './ProtocolOutputPanel';

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

  const sensors = Array.isArray(selectedTestSetup?.sensors)
    ? selectedTestSetup.sensors
    : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, sensor]) => ({ id, ...sensor })) : []);

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
          return { style };
        }
      }
    ]
  }), [hierarchicalRows, selectedTestSetup, mappingsController.mappings, measurementProtocolOptions]);

  return (
    <div ref={combinedRef}>
      <SlidePageTitle>
        Raw Measurement Output
      </SlidePageTitle>

      <SlidePageSubtitle>
        This slide allows you to view and edit the output of measurements across different studies and sensors of the selected test set-up. You can switch between a simple view and a grid view. Please leave fields empty if no raw measurement data (i.e. if only processed measurement data) are available. Processed measurement data will be implemented in further sheets.
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
