import { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuid4 } from 'uuid';
import { Template } from '@revolist/react-datagrid';
import { DeleteRowCellTemplate, PatternCellTemplate } from '../../DataGrid/CellTemplates';
import {
  MEASUREMENT_PROTOCOL_PARAMETER_SUGGESTIONS,
  PROCESSING_PROTOCOL_PARAMETER_SUGGESTIONS
} from '../../../constants/suggestionCatalog';

const useProtocolSections = ({ formData, setFormData }) => {
  const [activeMeasurementProtocolId, setActiveMeasurementProtocolId] = useState(null);
  const [activeProcessingProtocolId, setActiveProcessingProtocolId] = useState(null);

  useEffect(() => {
    if (!formData.measurementProtocols.length) {
      setActiveMeasurementProtocolId(null);
      return;
    }
    const hasActive = formData.measurementProtocols.some((protocol) => protocol.id === activeMeasurementProtocolId);
    if (activeMeasurementProtocolId && !hasActive) {
      setActiveMeasurementProtocolId(formData.measurementProtocols[0].id);
    }
  }, [formData.measurementProtocols, activeMeasurementProtocolId]);

  useEffect(() => {
    if (!formData.processingProtocols.length) {
      setActiveProcessingProtocolId(null);
      return;
    }
    const hasActive = formData.processingProtocols.some((protocol) => protocol.id === activeProcessingProtocolId);
    if (activeProcessingProtocolId && !hasActive) {
      setActiveProcessingProtocolId(formData.processingProtocols[0].id);
    }
  }, [formData.processingProtocols, activeProcessingProtocolId]);

  const activeMeasurementProtocol = useMemo(
    () => formData.measurementProtocols.find((protocol) => protocol.id === activeMeasurementProtocolId) || null,
    [formData.measurementProtocols, activeMeasurementProtocolId]
  );

  const activeProcessingProtocol = useMemo(
    () => formData.processingProtocols.find((protocol) => protocol.id === activeProcessingProtocolId) || null,
    [formData.processingProtocols, activeProcessingProtocolId]
  );

  const activeMeasurementProtocolRows = useMemo(
    () => activeMeasurementProtocol?.parameters || [],
    [activeMeasurementProtocol]
  );

  const activeProcessingProtocolRows = useMemo(
    () => activeProcessingProtocol?.parameters || [],
    [activeProcessingProtocol]
  );

  const activeMeasurementProtocolMappings = useMemo(
    () => (formData.sensorToMeasurementProtocolMapping || [])
      .filter((mapping) => mapping.protocolId === activeMeasurementProtocolId),
    [formData.sensorToMeasurementProtocolMapping, activeMeasurementProtocolId]
  );

  const activeProcessingProtocolMappings = useMemo(
    () => (formData.sensorToProcessingProtocolMapping || [])
      .filter((mapping) => mapping.protocolId === activeProcessingProtocolId),
    [formData.sensorToProcessingProtocolMapping, activeProcessingProtocolId]
  );

  const addMeasurementProtocol = useCallback(() => {
    const newProtocolId = uuid4();
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: [
        ...(prev.measurementProtocols || []),
        {
          id: newProtocolId,
          name: `Measurement Protocol ${prev.measurementProtocols.length + 1}`,
          description: '',
          parameters: []
        }
      ]
    }));
    setActiveMeasurementProtocolId(newProtocolId);
  }, [setFormData]);

  const addProcessingProtocol = useCallback(() => {
    const newProtocolId = uuid4();
    setFormData((prev) => ({
      ...prev,
      processingProtocols: [
        ...(prev.processingProtocols || []),
        {
          id: newProtocolId,
          name: `Processing Protocol ${prev.processingProtocols.length + 1}`,
          description: '',
          parameters: []
        }
      ]
    }));
    setActiveProcessingProtocolId(newProtocolId);
  }, [setFormData]);

  const updateMeasurementProtocol = useCallback((protocolId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).map((protocol) =>
        protocol.id === protocolId ? { ...protocol, [field]: value } : protocol
      )
    }));
  }, [setFormData]);

  const updateProcessingProtocol = useCallback((protocolId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).map((protocol) =>
        protocol.id === protocolId ? { ...protocol, [field]: value } : protocol
      )
    }));
  }, [setFormData]);

  const removeMeasurementProtocol = useCallback((protocolId) => {
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).filter((protocol) => protocol.id !== protocolId),
      sensorToMeasurementProtocolMapping: (prev.sensorToMeasurementProtocolMapping || [])
        .filter((mapping) => mapping.protocolId !== protocolId)
    }));
    setActiveMeasurementProtocolId((prev) => (prev === protocolId ? null : prev));
  }, [setFormData]);

  const removeProcessingProtocol = useCallback((protocolId) => {
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).filter((protocol) => protocol.id !== protocolId),
      sensorToProcessingProtocolMapping: (prev.sensorToProcessingProtocolMapping || [])
        .filter((mapping) => mapping.protocolId !== protocolId)
    }));
    setActiveProcessingProtocolId((prev) => (prev === protocolId ? null : prev));
  }, [setFormData]);

  const toggleMeasurementProtocol = useCallback((protocolId) => {
    setActiveMeasurementProtocolId((prev) => (prev === protocolId ? null : protocolId));
  }, []);

  const toggleProcessingProtocol = useCallback((protocolId) => {
    setActiveProcessingProtocolId((prev) => (prev === protocolId ? null : protocolId));
  }, []);

  const addMeasurementProtocolParameter = useCallback(() => {
    if (!activeMeasurementProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).map((protocol) => {
        if (protocol.id !== activeMeasurementProtocolId) return protocol;
        return {
          ...protocol,
          parameters: [
            ...(protocol.parameters || []),
            {
              id: uuid4(),
              name: `Parameter ${(protocol.parameters || []).length + 1}`,
              description: '',
              unit: ''
            }
          ]
        };
      })
    }));
  }, [activeMeasurementProtocolId, setFormData]);

  const addMeasurementProtocolParameterSuggestion = useCallback((suggestion) => {
    if (!activeMeasurementProtocolId || !suggestion) return;
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).map((protocol) => {
        if (protocol.id !== activeMeasurementProtocolId) return protocol;
        return {
          ...protocol,
          parameters: [
            ...(protocol.parameters || []),
            {
              id: uuid4(),
              name: suggestion.name || `Parameter ${(protocol.parameters || []).length + 1}`,
              description: suggestion.description || '',
              unit: suggestion.unit || ''
            }
          ]
        };
      })
    }));
  }, [activeMeasurementProtocolId, setFormData]);

  const addProcessingProtocolParameter = useCallback(() => {
    if (!activeProcessingProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).map((protocol) => {
        if (protocol.id !== activeProcessingProtocolId) return protocol;
        return {
          ...protocol,
          parameters: [
            ...(protocol.parameters || []),
            {
              id: uuid4(),
              name: `Parameter ${(protocol.parameters || []).length + 1}`,
              description: '',
              unit: ''
            }
          ]
        };
      })
    }));
  }, [activeProcessingProtocolId, setFormData]);

  const addProcessingProtocolParameterSuggestion = useCallback((suggestion) => {
    if (!activeProcessingProtocolId || !suggestion) return;
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).map((protocol) => {
        if (protocol.id !== activeProcessingProtocolId) return protocol;
        return {
          ...protocol,
          parameters: [
            ...(protocol.parameters || []),
            {
              id: uuid4(),
              name: suggestion.name || `Parameter ${(protocol.parameters || []).length + 1}`,
              description: suggestion.description || '',
              unit: suggestion.unit || ''
            }
          ]
        };
      })
    }));
  }, [activeProcessingProtocolId, setFormData]);

  const handleMeasurementProtocolMappingsChange = useCallback((newMappings) => {
    if (!activeMeasurementProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      sensorToMeasurementProtocolMapping: [
        ...(prev.sensorToMeasurementProtocolMapping || []).filter((mapping) => mapping.protocolId !== activeMeasurementProtocolId),
        ...newMappings.map((mapping) => ({ ...mapping, protocolId: activeMeasurementProtocolId }))
      ]
    }));
  }, [activeMeasurementProtocolId, setFormData]);

  const handleProcessingProtocolMappingsChange = useCallback((newMappings) => {
    if (!activeProcessingProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      sensorToProcessingProtocolMapping: [
        ...(prev.sensorToProcessingProtocolMapping || []).filter((mapping) => mapping.protocolId !== activeProcessingProtocolId),
        ...newMappings.map((mapping) => ({ ...mapping, protocolId: activeProcessingProtocolId }))
      ]
    }));
  }, [activeProcessingProtocolId, setFormData]);

  const handleMeasurementProtocolRowsChange = useCallback((protocolId, nextRows) => {
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).map((targetProtocol) => {
        if (targetProtocol.id !== protocolId) return targetProtocol;
        return {
          ...targetProtocol,
          parameters: nextRows.map((row) => {
            const existing = (targetProtocol.parameters || []).find((parameter) => parameter.id === row.id) || {};
            return { ...existing, ...row };
          })
        };
      })
    }));
  }, [setFormData]);

  const handleProcessingProtocolRowsChange = useCallback((protocolId, nextRows) => {
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).map((targetProtocol) => {
        if (targetProtocol.id !== protocolId) return targetProtocol;
        return {
          ...targetProtocol,
          parameters: nextRows.map((row) => {
            const existing = (targetProtocol.parameters || []).find((parameter) => parameter.id === row.id) || {};
            return { ...existing, ...row };
          })
        };
      })
    }));
  }, [setFormData]);

  const measurementProtocolGridConfig = useMemo(() => ({
    title: activeMeasurementProtocol
      ? `${activeMeasurementProtocol.name} - Sensor parameter mapping`
      : 'Measurement Protocol parameter mapping',
    rowData: activeMeasurementProtocolRows,
    columnData: formData.sensors,
    mappings: activeMeasurementProtocolMappings,
    fieldMappings: {
      rowId: 'id',
      rowName: 'name',
      columnId: 'id',
      columnName: 'alias',
      columnUnit: 'measurementUnit',
      mappingRowId: 'targetId',
      mappingColumnId: 'sourceId',
      mappingValue: 'value',
      hasChildColumns: true
    },
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
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Parameter P' })
      },
      { prop: 'name', name: 'Parameter Name', size: 240, readonly: false },
      {
        prop: 'description',
        name: 'Description',
        size: 320,
        readonly: false,
        cellProperties: () => ({
          style: {
            'border-right': '3px solid '
          }
        })
      }
    ],
    customActions: [
      {
        label: '+ Add parameter',
        title: 'Add parameter row',
        onClick: addMeasurementProtocolParameter,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [
    activeMeasurementProtocol,
    activeMeasurementProtocolRows,
    activeMeasurementProtocolMappings,
    formData.sensors,
    addMeasurementProtocolParameter
  ]);

  const processingProtocolGridConfig = useMemo(() => ({
    title: activeProcessingProtocol
      ? `${activeProcessingProtocol.name} - Sensor parameter mapping`
      : 'Processing Protocol parameter mapping',
    rowData: activeProcessingProtocolRows,
    columnData: formData.sensors,
    mappings: activeProcessingProtocolMappings,
    fieldMappings: {
      rowId: 'id',
      rowName: 'name',
      columnId: 'id',
      columnName: 'alias',
      columnUnit: 'measurementUnit',
      mappingRowId: 'targetId',
      mappingColumnId: 'sourceId',
      mappingValue: 'value',
      hasChildColumns: true
    },
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
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Parameter P' })
      },
      { prop: 'name', name: 'Parameter Name', size: 240, readonly: false },
      {
        prop: 'description',
        name: 'Description',
        size: 320,
        readonly: false,
        cellProperties: () => ({
          style: {
            'border-right': '3px solid '
          }
        })
      }
    ],
    customActions: [
      {
        label: '+ Add parameter',
        title: 'Add parameter row',
        onClick: addProcessingProtocolParameter,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [
    activeProcessingProtocol,
    activeProcessingProtocolRows,
    activeProcessingProtocolMappings,
    formData.sensors,
    addProcessingProtocolParameter
  ]);

  return {
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
    measurementParameterSuggestions: MEASUREMENT_PROTOCOL_PARAMETER_SUGGESTIONS,
    processingParameterSuggestions: PROCESSING_PROTOCOL_PARAMETER_SUGGESTIONS,
    measurementProtocolGridConfig,
    processingProtocolGridConfig,
  };
};

export default useProtocolSections;
