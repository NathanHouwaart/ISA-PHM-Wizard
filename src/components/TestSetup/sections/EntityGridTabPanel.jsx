import React from 'react';
import TabSwitcher, { TabPanel } from '../../TabSwitcher';
import DataGrid from '../../DataGrid/DataGrid';

const EntityGridTabPanel = ({
  isActive,
  selectedView,
  onViewChange,
  simpleViewTooltip,
  gridViewTooltip,
  simpleContent,
  gridConfig,
  historyScopeKey,
  isGridActive,
  onRowDataChange,
}) => {
  return (
    <TabPanel isActive={isActive}>
      <TabSwitcher
        selectedTab={selectedView}
        onTabChange={onViewChange}
        tabs={[
          { id: 'simple-view', label: 'Simple View', tooltip: simpleViewTooltip },
          { id: 'grid-view', label: 'Grid View', tooltip: gridViewTooltip },
        ]}
      />
      <TabPanel isActive={selectedView === 'simple-view'}>
        {simpleContent}
      </TabPanel>
      <TabPanel isActive={selectedView === 'grid-view'}>
        <div className="mt-3 border border-gray-200 rounded-lg">
          <DataGrid
            {...gridConfig}
            showControls={true}
            showDebug={false}
            historyScopeKey={historyScopeKey}
            isActive={isGridActive}
            onRowDataChange={onRowDataChange}
            height={'45vh'}
            hideClearAllMappings={true}
          />
        </div>
      </TabPanel>
    </TabPanel>
  );
};

export default EntityGridTabPanel;
