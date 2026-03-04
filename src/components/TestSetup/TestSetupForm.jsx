import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import Heading3 from '../Typography/Heading3';
import { v4 as uuid4 } from 'uuid';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

import TooltipButton from '../Widgets/TooltipButton';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';
import Paragraph from '../Typography/Paragraph';
import { Template } from '@revolist/react-datagrid';
import { DeleteRowCellTemplate, PatternCellTemplate } from '../DataGrid/CellTemplates';
import ProtocolEntityGridSection from './ProtocolEntityGridSection';
import CharacteristicsEditor from './editors/CharacteristicsEditor';
import SensorsEditor from './editors/SensorsEditor';
import ConfigurationsEditor from './editors/ConfigurationsEditor';
import BasicInfoSection from './sections/BasicInfoSection';
import EntityGridTabPanel from './sections/EntityGridTabPanel';
import useProtocolSections from './hooks/useProtocolSections';

const normalizeForDirtyCheck = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeForDirtyCheck);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (key === 'id') return acc;
        const normalized = normalizeForDirtyCheck(value[key]);
        if (normalized !== undefined) {
          acc[key] = normalized;
        }
        return acc;
      }, {});
  }

  return value;
};

const getDirtyFingerprint = (value) => JSON.stringify(normalizeForDirtyCheck(value));

// Main TestSetupForm Component
const TestSetupForm = ({ item, onSave, onCancel, isEditing = false }) => {
  const { setScreenWidth } = useGlobalDataContext();
  
  const initialFormState = useMemo(() => ({
    name: '',
    location: '',
    experimentPreparationProtocolName: '',
    testSpecimenName: '',
    description: '',
    characteristics: [],
    sensors: [],
    configurations: [],
    measurementProtocols: [],
    processingProtocols: [],
    sensorToMeasurementProtocolMapping: [],
    sensorToProcessingProtocolMapping: []
  }), []);

  const buildFormState = useCallback((sourceItem) => {
    if (!sourceItem) return initialFormState;
    return {
      name: sourceItem.name || '',
      location: sourceItem.location || '',
      experimentPreparationProtocolName: sourceItem.experimentPreparationProtocolName || '',
      testSpecimenName: sourceItem.testSpecimenName || '',
      description: sourceItem.description || '',
      characteristics: sourceItem.characteristics || [],
      sensors: sourceItem.sensors || [],
      configurations: sourceItem.configurations || [],
      measurementProtocols: sourceItem.measurementProtocols || [],
      processingProtocols: sourceItem.processingProtocols || [],
      sensorToMeasurementProtocolMapping: sourceItem.sensorToMeasurementProtocolMapping || [],
      sensorToProcessingProtocolMapping: sourceItem.sensorToProcessingProtocolMapping || []
    };
  }, [initialFormState]);

  const [newFormHistoryScope] = useState(() => `new:${uuid4()}`);
  const formHistoryScope = item?.id ? `testsetup:${item.id}` : `testsetup:${newFormHistoryScope}`;

  const [formData, setFormData] = useState(() => buildFormState(item));
  const [formError, setFormError] = useState('');
  const [selectedTab, setSelectedTab] = useState('basic-info');
  const [characteristicsView, setCharacteristicsView] = useState('simple-view');
  const [sensorsView, setSensorsView] = useState('simple-view');
  const [configurationsView, setConfigurationsView] = useState('simple-view');
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [initialFingerprint, setInitialFingerprint] = useState(() => getDirtyFingerprint(buildFormState(item)));


  // Calculate number of sensors from sensors array
  const numberOfSensors = formData.sensors.length;
  const numberOfCharacteristics = formData.characteristics.length;
  const numberOfConfigurations = formData.configurations.length;
  const numberOfMeasurementProtocols = formData.measurementProtocols.length;
  const numberOfProcessingProtocols = formData.processingProtocols.length;

  // Update screen width based on active view
  useEffect(() => {
    const isGridActive = 
      (selectedTab === 'characteristics' && characteristicsView === 'grid-view') ||
      (selectedTab === 'sensors' && sensorsView === 'grid-view') ||
      (selectedTab === 'configurations' && configurationsView === 'grid-view') ||
      selectedTab === 'measurement-protocols' ||
      selectedTab === 'processing-protocols';
    setScreenWidth(isGridActive ? 'max-w-[100rem]' : 'max-w-5xl');
    
    // Reset to default width when component unmounts
    return () => {
      setScreenWidth('max-w-5xl');
    };
  }, [
    selectedTab,
    characteristicsView,
    sensorsView,
    configurationsView,
    setScreenWidth
  ]);

  useEffect(() => {
    const nextFormData = buildFormState(item);
    setFormData(nextFormData);
    setInitialFingerprint(getDirtyFingerprint(nextFormData));
  }, [item, buildFormState]);

  useEffect(() => {
    const needsCharacteristicIds = formData.characteristics.some((c) => !c.id);
    const needsSensorIds = formData.sensors.some((s) => !s.id);
    const needsConfigurationIds = formData.configurations.some((c) => !c.id);
    const needsMeasurementProtocolIds = formData.measurementProtocols.some(
      (protocol) => !protocol.id || (protocol.parameters || []).some((parameter) => !parameter.id)
    );
    const needsProcessingProtocolIds = formData.processingProtocols.some(
      (protocol) => !protocol.id || (protocol.parameters || []).some((parameter) => !parameter.id)
    );

    if (
      needsCharacteristicIds ||
      needsSensorIds ||
      needsConfigurationIds ||
      needsMeasurementProtocolIds ||
      needsProcessingProtocolIds
    ) {
      setFormData((prev) => ({
        ...prev,
        characteristics: prev.characteristics.map((c) => (c.id ? c : { ...c, id: uuid4() })),
        sensors: prev.sensors.map((s) => (s.id ? s : { ...s, id: uuid4() })),
        configurations: prev.configurations.map((c) => (c.id ? c : { ...c, id: uuid4() })),
        measurementProtocols: (prev.measurementProtocols || []).map((protocol) => ({
          ...protocol,
          id: protocol.id || uuid4(),
          parameters: (protocol.parameters || []).map((parameter) =>
            parameter.id ? parameter : { ...parameter, id: uuid4() }
          )
        })),
        processingProtocols: (prev.processingProtocols || []).map((protocol) => ({
          ...protocol,
          id: protocol.id || uuid4(),
          parameters: (protocol.parameters || []).map((parameter) =>
            parameter.id ? parameter : { ...parameter, id: uuid4() }
          )
        })),
      }));
    }
  }, [
    formData.characteristics,
    formData.sensors,
    formData.configurations,
    formData.measurementProtocols,
    formData.processingProtocols
  ]);

  const currentFingerprint = useMemo(() => getDirtyFingerprint(formData), [formData]);
  const hasUnsavedChanges = currentFingerprint !== initialFingerprint;
  const historyScopeBase = `${formHistoryScope}:${initialFingerprint}`;

  const saveForm = useCallback(() => {
    if (
      !formData.name.trim() ||
      !formData.location.trim() ||
      !formData.experimentPreparationProtocolName.trim() ||
      !formData.testSpecimenName.trim()
    ) {
      setFormError('Please fill in all required fields (Name, Location, Experiment Preparation Protocol Name, Set-up or test specimen-name).');
      return false;
    }
    setFormError('');

    const testSetupData = {
      ...formData,
      number_of_sensors: numberOfSensors,
      id: isEditing && item?.id ? item.id : `testsetup-${Date.now()}`
    };

    onSave(testSetupData);
    setInitialFingerprint(currentFingerprint);
    return true;
  }, [formData, numberOfSensors, isEditing, item, onSave, currentFingerprint]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    saveForm();
  }, [saveForm]);

  const handleCloseRequest = useCallback(() => {
    if (isEditing || hasUnsavedChanges) {
      setShowCloseWarning(true);
      return;
    }
    onCancel?.();
  }, [isEditing, hasUnsavedChanges, onCancel]);

  const handleKeepEditing = useCallback(() => {
    setShowCloseWarning(false);
  }, []);

  const handleSaveAndClose = useCallback(() => {
    setShowCloseWarning(false);
    saveForm();
  }, [saveForm]);

  const handleDiscardAndClose = useCallback(() => {
    setShowCloseWarning(false);
    onCancel?.();
  }, [onCancel]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const characteristicRows = useMemo(() => {
    return formData.characteristics.map((c) => ({
      ...c,
      commentsCount: Array.isArray(c?.comments) ? c.comments.length : 0,
      commentHint: 'Manage comments in Simple View'
    }));
  }, [formData.characteristics]);
  const sensorRows = useMemo(() => formData.sensors, [formData.sensors]);

  const addCharacteristicRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      characteristics: [
        ...prev.characteristics,
        {
          id: uuid4(),
          category: '',
          value: '',
          unit: '',
          comments: [],
          commentsCount: 0,
          commentHint: 'Manage comments in Simple View'
        }
      ]
    }));
  }, []);

  const addSensorRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      sensors: [
        ...prev.sensors,
        {
          id: uuid4(),
          alias: `Sensor SE${String(prev.sensors.length + 1).padStart(2, '0')}`,
          technologyPlatform: '',
          technologyType: '',
          measurementType: '',
          description: '',
          additionalInfo: []
        }
      ]
    }));
  }, []);

  const characteristicGridConfig = useMemo(() => ({
    title: 'Characteristics',
    rowData: characteristicRows,
    columnData: [],
    mappings: [],
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 150,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Characteristic C' })
      },
      { prop: 'category', name: 'Category', size: 180, readonly: false },
      { prop: 'value', name: 'Value', size: 200, readonly: false },
      { prop: 'unit', name: 'Unit', size: 120, readonly: false },
      { prop: 'commentsCount', name: 'Comments (#)', size: 140, readonly: true },
      { prop: 'commentHint', name: 'Comments', size: 200, readonly: true },
    ],
    customActions: [
      {
        label: '+ Add characteristic',
        title: 'Add characteristic row',
        onClick: addCharacteristicRow,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [characteristicRows, addCharacteristicRow]);

  const sensorGridConfig = useMemo(() => ({
    title: 'Sensors',
    rowData: sensorRows,
    columnData: [],
    mappings: [],
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 140,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Sensor S' })
      },
      { prop: 'alias', name: 'Alias', size: 160, readonly: false },
      { prop: 'technologyPlatform', name: 'Sensor Model', size: 200, readonly: false },
      { prop: 'technologyType', name: 'Sensor Type', size: 180, readonly: false },
      { prop: 'measurementType', name: 'Measurement Type', size: 180, readonly: false },
      { prop: 'description', name: 'Description', size: 220, readonly: false },
    ],
    customActions: [
      {
        label: '+ Add sensor',
        title: 'Add sensor row',
        onClick: addSensorRow,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [sensorRows, addSensorRow]);

  const configurationRows = useMemo(() => {
    return formData.configurations.map((c) => ({
      ...c,
      detailsCount: Array.isArray(c?.details) ? c.details.length : 0,
      detailsHint: Array.isArray(c?.details) && c.details.length > 0
        ? c.details.map((d) => `${d.name}: ${d.value}`).join(', ')
        : 'No details'
    }));
  }, [formData.configurations]);

  const addConfigurationRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      configurations: [
        ...prev.configurations,
        {
          id: uuid4(),
          name: '',
          replaceableComponentId: '',
          details: [],
          detailsCount: 0,
          detailsHint: 'No details'
        }
      ]
    }));
  }, []);

  const configurationGridConfig = useMemo(() => ({
    title: 'Configurations',
    rowData: configurationRows,
    columnData: [],
    mappings: [],
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 150,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Config C' })
      },
      { prop: 'name', name: 'Name', size: 200, readonly: false },
      { prop: 'replaceableComponentId', name: 'Replaceable Component ID', size: 200, readonly: false },
      { prop: 'detailsCount', name: 'Details (#)', size: 140, readonly: true },
      { prop: 'detailsHint', name: 'Details', size: 300, readonly: true },
    ],
    customActions: [
      {
        label: '+ Add configuration',
        title: 'Add configuration row',
        onClick: addConfigurationRow,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [configurationRows, addConfigurationRow]);

  const handleCharacteristicRowsChange = useCallback((nextRows) => {
    setFormData((prev) => ({
      ...prev,
      characteristics: nextRows.map((row) => {
        const existing = prev.characteristics.find((c) => c.id === row.id) || {};
        return {
          ...existing,
          ...row,
          comments: existing.comments || row.comments || [],
          commentsCount: undefined,
          commentHint: undefined
        };
      })
    }));
  }, []);

  const handleSensorRowsChange = useCallback((nextRows) => {
    setFormData((prev) => ({
      ...prev,
      sensors: nextRows.map((row) => {
        const existing = prev.sensors.find((s) => s.id === row.id) || {};
        return {
          ...existing,
          ...row,
          additionalInfo: existing.additionalInfo || row.additionalInfo || []
        };
      })
    }));
  }, []);

  const handleConfigurationRowsChange = useCallback((nextRows) => {
    setFormData((prev) => ({
      ...prev,
      configurations: nextRows.map((row) => {
        const existing = prev.configurations.find((c) => c.id === row.id) || {};
        return {
          ...existing,
          ...row,
          details: existing.details || row.details || [],
          detailsCount: undefined,
          detailsHint: undefined
        };
      })
    }));
  }, []);

  const {
    activeMeasurementProtocolId,
    activeProcessingProtocolId,
    addMeasurementProtocol,
    addProcessingProtocol,
    updateMeasurementProtocol,
    updateProcessingProtocol,
    removeMeasurementProtocol,
    removeProcessingProtocol,
    toggleMeasurementProtocol,
    toggleProcessingProtocol,
    handleMeasurementProtocolMappingsChange,
    handleProcessingProtocolMappingsChange,
    handleMeasurementProtocolRowsChange,
    handleProcessingProtocolRowsChange,
    measurementProtocolGridConfig,
    processingProtocolGridConfig,
  } = useProtocolSections({ formData, setFormData });
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between">
          <Heading3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Test Setup' : 'Add New Test Setup'}
          </Heading3>
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={handleCloseRequest}
            tooltipText="Close"
          >
            <X className="w-5 h-5" />
          </TooltipButton>
        </div>
      </div>

      <div className="p-4">
        {formError && (
          <Paragraph className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {formError}
          </Paragraph>
        )}
        <TabSwitcher
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          tabs={[
            { id: 'basic-info', label: 'Basic Info', tooltip: 'Basic Information about the test setup' },
            { id: 'characteristics', label: `Characteristics (${numberOfCharacteristics})`, tooltip: 'Characteristics of the test setup' },
            { id: 'sensors', label: `Sensors (${numberOfSensors})`, tooltip: 'Sensors used in the test setup' },
            { id: 'configurations', label: `Configurations (${numberOfConfigurations})`, tooltip: 'Manage test setup configurations' },
            { id: 'measurement-protocols', label: `Measurement (${numberOfMeasurementProtocols})`, tooltip: 'Define raw data acquisition protocol variants and parameter values' },
            { id: 'processing-protocols', label: `Processing (${numberOfProcessingProtocols})`, tooltip: 'Define processing protocol variants and parameter values' },
          ]}
        />

        <TabPanel isActive={selectedTab === 'basic-info'}>
          <BasicInfoSection formData={formData} onFieldChange={handleChange} />
        </TabPanel>

        <EntityGridTabPanel
          isActive={selectedTab === 'characteristics'}
          selectedView={characteristicsView}
          onViewChange={setCharacteristicsView}
          simpleViewTooltip="Edit characteristics with collapsible cards"
          gridViewTooltip="Edit characteristics inline in a grid"
          simpleContent={
            <CharacteristicsEditor
              characteristics={formData.characteristics}
              onCharacteristicsChange={(characteristics) =>
                setFormData((prev) => ({ ...prev, characteristics }))
              }
            />
          }
          gridConfig={characteristicGridConfig}
          historyScopeKey={`${historyScopeBase}:characteristics`}
          isGridActive={selectedTab === 'characteristics' && characteristicsView === 'grid-view'}
          onRowDataChange={handleCharacteristicRowsChange}
        />

        <EntityGridTabPanel
          isActive={selectedTab === 'sensors'}
          selectedView={sensorsView}
          onViewChange={setSensorsView}
          simpleViewTooltip="Edit sensors with collapsible cards"
          gridViewTooltip="Edit sensors inline in a grid"
          simpleContent={
            <SensorsEditor
              sensors={formData.sensors}
              onSensorsChange={(sensors) =>
                setFormData((prev) => ({ ...prev, sensors }))
              }
            />
          }
          gridConfig={sensorGridConfig}
          historyScopeKey={`${historyScopeBase}:sensors`}
          isGridActive={selectedTab === 'sensors' && sensorsView === 'grid-view'}
          onRowDataChange={handleSensorRowsChange}
        />

        <EntityGridTabPanel
          isActive={selectedTab === 'configurations'}
          selectedView={configurationsView}
          onViewChange={setConfigurationsView}
          simpleViewTooltip="Edit configurations with collapsible cards"
          gridViewTooltip="Edit configurations inline in a grid"
          simpleContent={
            <ConfigurationsEditor
              configurations={formData.configurations}
              onConfigurationsChange={(configurations) =>
                setFormData((prev) => ({ ...prev, configurations }))
              }
            />
          }
          gridConfig={configurationGridConfig}
          historyScopeKey={`${historyScopeBase}:configurations`}
          isGridActive={selectedTab === 'configurations' && configurationsView === 'grid-view'}
          onRowDataChange={handleConfigurationRowsChange}
        />
        <TabPanel isActive={selectedTab === 'measurement-protocols'}>
          <ProtocolEntityGridSection
            title="Measurement Protocols"
            count={numberOfMeasurementProtocols}
            items={formData.measurementProtocols || []}
            itemPrefix="mp"
            activeItemId={activeMeasurementProtocolId}
            onToggleItem={toggleMeasurementProtocol}
            onAddItem={addMeasurementProtocol}
            onRemoveItem={removeMeasurementProtocol}
            onUpdateItemField={updateMeasurementProtocol}
            addButtonTooltip="Add Measurement Protocol"
            removeButtonTooltip="Remove measurement protocol"
            accentDotClassName="bg-indigo-500"
            description="Define measurement protocol variants. Open a variant to edit its name, description, and sensor-parameter mapping grid."
            sensors={formData.sensors || []}
            gridConfig={measurementProtocolGridConfig}
            onGridMappingsChange={handleMeasurementProtocolMappingsChange}
            onGridRowDataChange={handleMeasurementProtocolRowsChange}
            isTabActive={selectedTab === 'measurement-protocols'}
            historyScopeKey={`${historyScopeBase}:measurement-protocol:${activeMeasurementProtocolId || 'none'}`}
            emptyStateTitle="No measurement protocols added yet."
            emptyStateHint='Click "Add Measurement Protocol" to get started.'
          />
        </TabPanel>

        <TabPanel isActive={selectedTab === 'processing-protocols'}>
          <ProtocolEntityGridSection
            title="Processing Protocols"
            count={numberOfProcessingProtocols}
            items={formData.processingProtocols || []}
            itemPrefix="pp"
            activeItemId={activeProcessingProtocolId}
            onToggleItem={toggleProcessingProtocol}
            onAddItem={addProcessingProtocol}
            onRemoveItem={removeProcessingProtocol}
            onUpdateItemField={updateProcessingProtocol}
            addButtonTooltip="Add Processing Protocol"
            removeButtonTooltip="Remove processing protocol"
            accentDotClassName="bg-orange-500"
            description="Define processing protocol variants. Open a variant to edit its name, description, and sensor-parameter mapping grid."
            sensors={formData.sensors || []}
            gridConfig={processingProtocolGridConfig}
            onGridMappingsChange={handleProcessingProtocolMappingsChange}
            onGridRowDataChange={handleProcessingProtocolRowsChange}
            isTabActive={selectedTab === 'processing-protocols'}
            historyScopeKey={`${historyScopeBase}:processing-protocol:${activeProcessingProtocolId || 'none'}`}
            emptyStateTitle="No processing protocols added yet."
            emptyStateHint='Click "Add Processing Protocol" to get started.'
          />
        </TabPanel>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end space-x-3">
        <TooltipButton
          onClick={handleCloseRequest}
          tooltipText={"Cancel"}
          className="cursor-pointer px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span>Cancel</span>
        </TooltipButton>

        <TooltipButton
          onClick={handleSubmit}
          tooltipText={isEditing ? 'Update Test Setup' : 'Add Test Setup'}
        >
          <Save className="w-4 h-4" />
          <span>{isEditing ? 'Update Test Setup' : 'Add Test Setup'}</span>
        </TooltipButton>
      </div>

      <AlertDecisionDialog
        open={showCloseWarning}
        tone="warning"
        title="Unsaved changes"
        message="You are closing the test setup editor. Save changes before closing, or discard them."
        confirmLabel="Save and close"
        cancelLabel="Keep editing"
        confirmTooltip="Save test setup and close the editor"
        cancelTooltip="Return to the form without closing"
        tertiaryLabel="Discard and close"
        tertiaryTooltip="Close and discard unsaved changes"
        tertiaryButtonProps={{
          className: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'
        }}
        onConfirm={handleSaveAndClose}
        onTertiary={handleDiscardAndClose}
        onCancel={handleKeepEditing}
      />
    </div>
  );
};

export default TestSetupForm;




