import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Save } from 'lucide-react';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import Heading3 from '../Typography/Heading3';
import { v4 as uuid4 } from 'uuid';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { clearReviewForUnmappedNewSensors } from '../../utils/deviceDefinitions';

import TooltipButton from '../Widgets/TooltipButton';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';
import Paragraph from '../Typography/Paragraph';
import { Template } from '@revolist/react-datagrid';
import SelectTypePlugin from '@revolist/revogrid-column-select';
import UnitCellEditor from '../DataGrid/editors/UnitCellEditor';
import { UnitCellTemplate } from '../DataGrid/UnitCellTemplate';
import {
  BooleanCheckboxCellTemplate,
  DeleteRowCellTemplate,
  PatternCellTemplate
} from '../DataGrid/CellTemplates';
import ProtocolEntityGridSection from './ProtocolEntityGridSection';
import CharacteristicsEditor from './editors/CharacteristicsEditor';
import SensorsEditor from './editors/SensorsEditor';
import BasicInfoSection from './sections/BasicInfoSection';
import EntityGridTabPanel from './sections/EntityGridTabPanel';
import useProtocolSections from './hooks/useProtocolSections';
import {
  normalizeCharacteristic
} from '../../utils/testSetupCharacteristics';
import {
  normalizeSensor,
  SENSOR_USAGE_DATASET_OUTPUT
} from '../../utils/sensorUsage';
import { pruneProtocolSensorState } from '../../utils/protocolSensorScope';
import { getTestSetupReadiness } from '../../utils/testSetupReadiness';
import {
  cloneAttachmentRefs,
  cleanupUnreferencedAttachmentRefs,
  collectAttachmentRefs,
  getAttachmentCommitCleanup,
  getAttachmentRollbackCleanup,
  mergeAttachmentRefs,
} from '../../utils/attachmentLifecycle';

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

const normalizeSensorRows = (rows = [], previousSensors = [], sensorTypes = []) => (
  rows.map((row) => {
    const existing = previousSensors.find((sensor) => sensor.id === row.id) || {};
    const sensorType = sensorTypes.find((type) => type.id === row.sensorTypeId);
    const typeSnapshot = sensorType && sensorType.id !== existing.sensorTypeId
      ? {
        technologyPlatform: sensorType.technologyPlatform || '',
        technologyType: sensorType.technologyType || '',
        measurementType: row.measurementType || existing.measurementType || sensorType.measurementType || '',
        quantityKindIdentifier: row.quantityKindIdentifier || (row.measurementType ? '' : existing.quantityKindIdentifier || (!existing.measurementType ? sensorType.quantityKindIdentifier : '')) || ''
      }
      : {};
    return normalizeSensor({
      ...existing,
      ...row,
      ...typeSnapshot,
      additionalInfo: existing.additionalInfo || row.additionalInfo || []
    });
  })
);

// Main TestSetupForm Component
const TestSetupForm = ({ item, onSave, onCancel, isEditing = false }) => {
  const { setScreenWidth } = useProjectActions();
  const {
    testSetups = [],
    configurationTypes = [],
    currentProjectId
  } = useProjectData();
  
  const initialFormState = useMemo(() => ({
    name: '',
    location: '',
    experimentPreparationProtocolName: '',
    testSpecimenName: '',
    description: '',
    images: [],
    characteristics: [],
    sensors: [],
    sensorTypes: [],
    physicalDevices: [],
    deviceDefinitions: [],
    configurations: [],
    measurementProtocols: [],
    processingProtocols: [],
    sensorToMeasurementProtocolMapping: [],
    sensorToProcessingProtocolMapping: []
  }), []);

  const buildFormState = useCallback((sourceItem) => {
    if (!sourceItem) return initialFormState;
    return {
      ...sourceItem,
      name: sourceItem.name || '',
      location: sourceItem.location || '',
      experimentPreparationProtocolName: sourceItem.experimentPreparationProtocolName || '',
      testSpecimenName: sourceItem.testSpecimenName || '',
      description: sourceItem.description || '',
      images: Array.isArray(sourceItem.images) ? sourceItem.images : [],
      characteristics: (sourceItem.characteristics || []).map(normalizeCharacteristic),
      sensors: (sourceItem.sensors || []).map(normalizeSensor),
      sensorTypes: sourceItem.sensorTypes || [],
      physicalDevices: Array.isArray(sourceItem.physicalDevices) ? sourceItem.physicalDevices : [],
      deviceDefinitions: Array.isArray(sourceItem.deviceDefinitions) ? sourceItem.deviceDefinitions : [],
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
  const persistedSensorIds = useRef(new Set(isEditing ? (item?.sensors || []).map((sensor) => sensor.id) : []));
  const [selectedTab, setSelectedTab] = useState('basic-info');
  const [characteristicsView, setCharacteristicsView] = useState('simple-view');
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [initialFingerprint, setInitialFingerprint] = useState(() => getDirtyFingerprint(buildFormState(item)));
  const initialAttachmentRefs = useRef(collectAttachmentRefs(buildFormState(item)));
  const seenAttachmentRefs = useRef(cloneAttachmentRefs(initialAttachmentRefs.current));


  // Calculate number of sensors from sensors array
  const numberOfSensors = formData.sensors.length;
  const numberOfCharacteristics = formData.characteristics.length;
  const numberOfMeasurementProtocols = formData.measurementProtocols.length;
  const numberOfProcessingProtocols = formData.processingProtocols.length;

  // Update screen width based on active view
  useEffect(() => {
    const isGridActive = 
      (selectedTab === 'characteristics' && characteristicsView === 'grid-view') ||
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
    setScreenWidth
  ]);

  useEffect(() => {
    mergeAttachmentRefs(seenAttachmentRefs.current, collectAttachmentRefs(formData));
  }, [formData]);

  useEffect(() => {
    const nextFormData = buildFormState(item);
    persistedSensorIds.current = new Set(isEditing ? (item?.sensors || []).map((sensor) => sensor.id) : []);
    setFormData(nextFormData);
    setInitialFingerprint(getDirtyFingerprint(nextFormData));
    initialAttachmentRefs.current = collectAttachmentRefs(nextFormData);
    seenAttachmentRefs.current = cloneAttachmentRefs(initialAttachmentRefs.current);
  }, [item, isEditing, buildFormState]);

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
  const readinessIssues = useMemo(() => getTestSetupReadiness(formData), [formData]);
  const hasUnsavedChanges = currentFingerprint !== initialFingerprint;
  const historyScopeBase = `${formHistoryScope}:${initialFingerprint}`;

  const saveForm = useCallback(async () => {
    const testSetupData = {
      ...formData,
      ...pruneProtocolSensorState(formData),
      number_of_sensors: numberOfSensors,
      id: isEditing && item?.id ? item.id : `testsetup-${Date.now()}`
    };

    await onSave(testSetupData);
    persistedSensorIds.current = new Set((testSetupData.sensors || []).map((sensor) => sensor.id));
    const finalRefs = collectAttachmentRefs(testSetupData);
    const removedSavedRefs = getAttachmentCommitCleanup(
      initialAttachmentRefs.current,
      seenAttachmentRefs.current,
      finalRefs
    );
    try {
      const retainedTestSetups = [
        ...testSetups.filter((testSetup) => testSetup?.id !== testSetupData.id),
        testSetupData,
      ];
      await cleanupUnreferencedAttachmentRefs(
        removedSavedRefs,
        [retainedTestSetups, configurationTypes],
        {
          excludeGlobalTestSetups: true,
          excludeProjectIds: [currentProjectId],
        }
      );
    } catch (cleanupError) {
      console.warn('[TestSetupForm] unable to clean up replaced attachments', cleanupError);
    }
    initialAttachmentRefs.current = cloneAttachmentRefs(finalRefs);
    seenAttachmentRefs.current = cloneAttachmentRefs(finalRefs);
    setInitialFingerprint(currentFingerprint);
    return true;
  }, [
    formData,
    numberOfSensors,
    isEditing,
    item,
    onSave,
    currentFingerprint,
    testSetups,
    configurationTypes,
    currentProjectId
  ]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    await saveForm();
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

  const handleSaveAndClose = useCallback(async () => {
    setShowCloseWarning(false);
    await saveForm();
  }, [saveForm]);

  const handleDiscardAndClose = useCallback(async () => {
    setShowCloseWarning(false);
    const stagedRefs = getAttachmentRollbackCleanup(
      initialAttachmentRefs.current,
      seenAttachmentRefs.current
    );
    try {
      await cleanupUnreferencedAttachmentRefs(
        stagedRefs,
        [testSetups, configurationTypes],
        {
          excludeGlobalTestSetups: true,
          excludeProjectIds: [currentProjectId],
        }
      );
    } catch (cleanupError) {
      console.warn('[TestSetupForm] unable to clean up discarded attachments', cleanupError);
    }
    onCancel?.();
  }, [onCancel, testSetups, configurationTypes, currentProjectId]);

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
          description: '',
          isReplaceable: false,
          comments: [],
          commentsCount: 0,
          commentHint: 'Manage comments in Simple View'
        }
      ]
    }));
  }, []);

  const characteristicGridConfig = useMemo(() => ({
    title: 'Components',
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
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Component C' })
      },
      { prop: 'category', name: 'Category', size: 180, readonly: false },
      {
        prop: 'isReplaceable',
        name: 'Replaceable',
        size: 120,
        readonly: false,
        cellTemplate: Template(BooleanCheckboxCellTemplate)
      },
      { prop: 'value', name: 'Value', size: 200, readonly: false, cellProperties: ({ model }) => model?.isReplaceable ? { style: { background: '#f3f4f6', color: '#9ca3af' } } : {} },
      { prop: 'unit', name: 'Unit', size: 160, readonly: false, unitSelector: true, editor: UnitCellEditor, cellTemplate: UnitCellTemplate, cellProperties: ({ model }) => model?.isReplaceable ? { style: { background: '#f3f4f6', color: '#9ca3af' } } : {} },
      {
        prop: 'description',
        name: 'Replaceable Component Description',
        size: 280,
        readonly: false,
        cellProperties: ({ model }) => !model?.isReplaceable
          ? { style: { background: '#f3f4f6', color: '#9ca3af' } }
          : {}
      },
      { prop: 'commentsCount', name: 'Comments (#)', size: 140, readonly: true },
      { prop: 'commentHint', name: 'Comments', size: 200, readonly: true },
    ],
    customActions: [
      {
        label: '+ Add component',
        title: 'Add component row',
        onClick: addCharacteristicRow,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ],
    isCellEditable: ({ row, columnProp }) => {
      if (row?.isReplaceable) return columnProp !== 'value' && columnProp !== 'unit';
      return columnProp !== 'description';
    }
  }), [characteristicRows, addCharacteristicRow]);

  const handleCharacteristicRowsChange = useCallback((nextRows) => {
    setFormData((prev) => ({
      ...prev,
      characteristics: nextRows.map((row) => {
        const existing = prev.characteristics.find((c) => c.id === row.id) || {};
        return normalizeCharacteristic({
          ...existing,
          ...row,
          comments: existing.comments || row.comments || [],
          commentsCount: undefined,
          commentHint: undefined
        });
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
    addMeasurementProtocolParameterSuggestion,
    addProcessingProtocolParameterSuggestion,
    measurementParameterSuggestions,
    processingParameterSuggestions,
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
        <div className={`mb-4 rounded-md border p-3 text-sm ${readinessIssues.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-green-200 bg-green-50 text-green-800'}`}>
          <p className="font-semibold">{readinessIssues.length ? `Incomplete — ${readinessIssues.length} item${readinessIssues.length === 1 ? '' : 's'} to complete` : 'Ready for questionnaire'}</p>
          {readinessIssues.length > 0 && <><p className="mt-1">You can save this draft and complete it later.</p><ul className="mt-2 list-inside list-disc">{readinessIssues.map((issue, index) => <li key={`${issue.section}-${index}`}><button type="button" className="text-left underline" onClick={() => setSelectedTab(issue.section)}>{issue.message}</button></li>)}</ul></>}
        </div>
        <TabSwitcher
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          tabs={[
            { id: 'basic-info', label: 'Basic Info', tooltip: 'Basic Information about the test setup' },
            { id: 'characteristics', label: `Components (${numberOfCharacteristics})`, tooltip: 'Components of the test setup' },
            { id: 'sensors', label: `Sensors (${numberOfSensors})`, tooltip: 'Sensors used in the test setup' },
            { id: 'measurement-protocols', label: `Measurement (${numberOfMeasurementProtocols})`, tooltip: 'Define raw data acquisition protocol variants and parameter values' },
            { id: 'processing-protocols', label: `Processing (${numberOfProcessingProtocols})`, tooltip: 'Define processing protocol variants and parameter values' },
          ]}
        />

        <TabPanel isActive={selectedTab === 'basic-info'}>
          <BasicInfoSection
            formData={formData}
            onFieldChange={handleChange}
            onImagesChange={(images) => setFormData((prev) => ({ ...prev, images }))}
          />
        </TabPanel>

        <EntityGridTabPanel
          isActive={selectedTab === 'characteristics'}
          selectedView={characteristicsView}
          onViewChange={setCharacteristicsView}
          simpleViewTooltip="Edit components with collapsible cards"
          gridViewTooltip="Edit components inline in a grid"
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

        <TabPanel isActive={selectedTab === 'sensors'} unmountOnHide>
            <SensorsEditor
              sensors={formData.sensors}
              sensorTypes={formData.sensorTypes}
              physicalDevices={formData.physicalDevices}
              deviceDefinitions={formData.deviceDefinitions}
              onDeviceDefinitionsChange={(deviceDefinitions) => setFormData((prev) => ({ ...prev, deviceDefinitions }))}
              onPhysicalDevicesChange={(physicalDevices) => setFormData((prev) => ({ ...prev, physicalDevices }))}
              onSensorsChange={(nextSensors) => setFormData((prev) => {
                const sensors = clearReviewForUnmappedNewSensors(
                  normalizeSensorRows(nextSensors, prev.sensors, prev.sensorTypes), prev.sensors,
                  persistedSensorIds.current,
                  [...(prev.sensorToMeasurementProtocolMapping || []), ...(prev.sensorToProcessingProtocolMapping || [])],
                );
                return {
                  ...prev,
                  sensors,
                  ...pruneProtocolSensorState({ ...prev, sensors })
                };
              })}
              onSensorTypesChange={(sensorTypes) =>
                setFormData((prev) => ({ ...prev, sensorTypes }))
              }
            />
        </TabPanel>

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
            onUpdateApplicableSensors={(protocolId, ids) => updateMeasurementProtocol(protocolId, 'applicableSensorIds', ids)}
            addButtonTooltip="Add Measurement Protocol"
            removeButtonTooltip="Remove measurement protocol"
            accentDotClassName="bg-indigo-500"
            description="Define measurement protocol variants. Open a variant to edit its name, description, and sensor-parameter mapping grid."
            sensors={measurementProtocolGridConfig.columnData}
            gridConfig={measurementProtocolGridConfig}
            onGridMappingsChange={handleMeasurementProtocolMappingsChange}
            onGridRowDataChange={handleMeasurementProtocolRowsChange}
            parameterSuggestions={measurementParameterSuggestions}
            onAddSuggestedParameter={addMeasurementProtocolParameterSuggestion}
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
            onUpdateApplicableSensors={(protocolId, ids) => updateProcessingProtocol(protocolId, 'applicableSensorIds', ids)}
            addButtonTooltip="Add Processing Protocol"
            removeButtonTooltip="Remove processing protocol"
            accentDotClassName="bg-orange-500"
            description="Define processing protocol variants. Open a variant to edit its name, description, and sensor-parameter mapping grid."
            sensors={processingProtocolGridConfig.columnData}
            gridConfig={processingProtocolGridConfig}
            onGridMappingsChange={handleProcessingProtocolMappingsChange}
            onGridRowDataChange={handleProcessingProtocolRowsChange}
            parameterSuggestions={processingParameterSuggestions}
            onAddSuggestedParameter={addProcessingProtocolParameterSuggestion}
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
          tooltipText="Save Test Setup"
        >
          <Save className="w-4 h-4" />
          <span>Save Test Setup</span>
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




