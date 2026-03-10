import React from 'react';
import { Layers } from 'lucide-react';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import WarningBanner from '../Widgets/WarningBanner';
import DataGrid from '../DataGrid/DataGrid';
import FilePickerPlugin from '../DataGrid/FilePickerPlugin';
import DualSidebarStudyRunPanel from '../Study/DualSidebarStudyRunPanel';
import StudyMeasurementMappingCard from '../StudyMeasurementMappingCard';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import SelectTypePlugin from '@revolist/revogrid-column-select';

const plugins = { select: new SelectTypePlugin() };

const ProtocolOutputPanel = ({
  selectedTab,
  onTabChange,
  selectedTestSetupId,
  sensors = [],
  protocolOptions = [],
  studies = [],
  selectedDataset,
  protocolMissingMessage,
  noDatasetMessage,
  simplePanelTitle,
  protocolLabel,
  selectedProtocolByStudy,
  onStudyProtocolChange,
  fileFieldLabel,
  studyRuns,
  mappings,
  onMappingInputChange,
  gridConfig,
  onDataChange,
  onRowDataChange,
  currentPage,
  pageIndex
}) => {
  return (
    <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>
      <TabSwitcher
        selectedTab={selectedTab}
        onTabChange={onTabChange}
        tabs={[
          { id: 'simple-view', label: 'Simple View', tooltip: 'View measurements in a simple list format' },
          { id: 'grid-view', label: 'Grid View', tooltip: 'View measurements in a grid format for better data management' }
        ]}
      />

      {!selectedTestSetupId && (
        <WarningBanner type="warning" icon={Layers}>
          <strong>No test setup selected.</strong> Go to the project settings <Layers className="inline w-4 h-4 mx-1" /> and select a test setup for your project.
        </WarningBanner>
      )}
      {selectedTestSetupId && sensors.length === 0 && (
        <WarningBanner type="warning">
          <strong>No sensors in test setup.</strong> The selected test setup must contain one or more sensors to map outputs. Add sensors to your test setup or select a different one.
        </WarningBanner>
      )}
      {selectedTestSetupId && protocolOptions.length === 0 && (
        <WarningBanner type="info">
          <strong>No protocols in test setup.</strong> {protocolMissingMessage}
        </WarningBanner>
      )}
      {studies.length === 0 && (
        <WarningBanner type="warning">
          <strong>No studies available.</strong> There are no studies in the workspace. Create or import studies first so you can map outputs to them.
        </WarningBanner>
      )}

      <TabPanel isActive={selectedTab === 'simple-view'} unmountOnHide>
        <div className="h-[45vh] flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DualSidebarStudyRunPanel
              title={simplePanelTitle}
              studies={studies}
              studyRuns={studyRuns}
              mappings={mappings}
              handleInputChange={onMappingInputChange}
              minHeight={WINDOW_HEIGHT}
              MappingCardComponent={StudyMeasurementMappingCard}
              mappingCardProps={{
                protocolLabel,
                protocolOptions,
                selectedProtocolByStudy,
                onStudyProtocolChange,
                fileFieldLabel
              }}
            />
          </div>
        </div>
      </TabPanel>

      <TabPanel isActive={selectedTab === 'grid-view'} unmountOnHide>
        {!selectedDataset && (
          <WarningBanner type="info">
            <strong>No dataset indexed.</strong> {noDatasetMessage}
          </WarningBanner>
        )}
        <DataGrid
          {...gridConfig}
          showControls={true}
          showDebug={false}
          onDataChange={onDataChange}
          onRowDataChange={onRowDataChange}
          height={"45vh"}
          isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
          actionPlugins={[FilePickerPlugin]}
          plugins={plugins}
        />
      </TabPanel>
    </div>
  );
};

export default ProtocolOutputPanel;
