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

export const ProcessingOutputSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
  const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');
  const elementToObserveRef = useResizeObserver(onHeightChange);
  const combinedRef = useCombinedRefs(ref, elementToObserveRef);

  const {
    studies,
    testSetups,
    selectedTestSetupId,
    selectedDataset,
    studyToProcessingProtocolSelection
  } = useProjectData();
  const { setStudies, setStudyToProcessingProtocolSelection } = useProjectActions();

  const selectedTestSetup = testSetups.find((setup) => setup.id === selectedTestSetupId);
  const studyRuns = useStudyRuns();

  const sensors = Array.isArray(selectedTestSetup?.sensors)
    ? selectedTestSetup.sensors
    : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, sensor]) => ({ id, ...sensor })) : []);

  const processingProtocolOptions = useMemo(
    () => (selectedTestSetup?.processingProtocols || []).map((protocol) => ({
      value: protocol.id,
      label: protocol.name || 'Unnamed protocol'
    })),
    [selectedTestSetup]
  );

  const {
    selectedProtocolByStudy: selectedProcessingProtocolByStudy,
    updateStudyProtocol: updateStudyProcessingProtocol,
    handleGridRowDataChange
  } = useStudyProtocolSelection({
    studies,
    setStudies,
    selection: studyToProcessingProtocolSelection,
    setSelection: setStudyToProcessingProtocolSelection,
    protocolField: 'processingProtocolId'
  });

  const mappingsController = useMappingsController(
    'studyToSensorProcessingMapping',
    { sourceKey: 'sensorId', targetKey: 'studyRunId' }
  );

  const handleDataGridMappingsChange = useCallback((newMappings) => {
    mappingsController.setMappings(newMappings);
  }, [mappingsController]);

  const hierarchicalRows = useMemo(
    () => buildStudyRunRowData(studies, studyRuns),
    [studies, studyRuns]
  );

  const processingOutputGridConfig = useMemo(() => ({
    title: 'Mappings for processing protocol output',
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
        prop: 'processingProtocolId',
        name: 'Processing Protocol',
        size: 260,
        readonly: false,
        pin: 'colPinStart',
        columnType: 'select',
        labelKey: 'label',
        valueKey: 'value',
        source: processingProtocolOptions,
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
  }), [hierarchicalRows, selectedTestSetup, mappingsController.mappings, processingProtocolOptions]);

  return (
    <div ref={combinedRef}>
      <SlidePageTitle>
        Processing Protocol Output
      </SlidePageTitle>

      <SlidePageSubtitle>
        This slide allows you to view and edit the processed data files across different studies and sensors of the selected test set-up. You can switch between a simple view and a grid view. Please leave fields empty if no processed data (i.e. if only raw measurement data) are available.
      </SlidePageSubtitle>

      <ProtocolOutputPanel
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        selectedTestSetupId={selectedTestSetupId}
        sensors={sensors}
        protocolOptions={processingProtocolOptions}
        studies={studies}
        selectedDataset={selectedDataset}
        protocolMissingMessage="Define one or more processing protocol variants in the Test Setup page to select them per study."
        noDatasetMessage={
          <>To use the file assignment feature (<strong>📁 Assign files</strong> button), you need to index a dataset first. Go to the project settings and index a folder containing your processed data files.</>
        }
        simplePanelTitle="Studies"
        protocolLabel="Processing Protocol"
        selectedProtocolByStudy={selectedProcessingProtocolByStudy}
        onStudyProtocolChange={updateStudyProcessingProtocol}
        fileFieldLabel="Processed Data File"
        studyRuns={studyRuns}
        mappings={mappingsController.mappings}
        onMappingInputChange={mappingsController.updateMappingValue}
        gridConfig={processingOutputGridConfig}
        onDataChange={handleDataGridMappingsChange}
        onRowDataChange={handleGridRowDataChange}
        currentPage={currentPage}
        pageIndex={pageIndex}
      />
    </div>
  );
});

ProcessingOutputSlide.displayName = 'Processing Output Slide';

export default ProcessingOutputSlide;
