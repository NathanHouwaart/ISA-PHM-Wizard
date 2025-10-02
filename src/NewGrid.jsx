import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { Plus, Trash2, Undo, Redo } from 'lucide-react';

const App = () => {
  // Data state
  const [studies, setStudies] = useState([
    { id: 1, name: 'Study Alpha', description: 'Initial research phase', publicationDate: '2024-03-15', submissionDate: '2024-02-01' },
    { id: 2, name: 'Study Beta', description: 'Follow-up analysis', publicationDate: '2024-06-20', submissionDate: '2024-05-10' }
  ]);

  const [sensors, setSensors] = useState([
    { id: 1, name: 'Sensor A', sensorType: 'Temperature', description: 'Measures ambient temperature' },
    { id: 2, name: 'Sensor B', sensorType: 'Humidity', description: 'Tracks moisture levels' },
    { id: 3, name: 'Sensor C', sensorType: 'Pressure', description: 'Monitors air pressure' }
  ]);

  // Combination data - stores values and units for each study-sensor pair
  const [combinationValues, setCombinationValues] = useState({});
  const [combinationUnits, setCombinationUnits] = useState({});

  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ID counters
  const [studyIdCounter, setStudyIdCounter] = useState(3);
  const [sensorIdCounter, setSensorIdCounter] = useState(4);

  // Save state to history
  const saveToHistory = useCallback((studiesData, sensorsData, combinationData, combinationUnitsData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ 
        studies: JSON.parse(JSON.stringify(studiesData)), 
        sensors: JSON.parse(JSON.stringify(sensorsData)),
        combinationValues: JSON.parse(JSON.stringify(combinationData)),
        combinationUnits: JSON.parse(JSON.stringify(combinationUnitsData))
      });
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ studies, sensors, combinationValues, combinationUnits }]);
      setHistoryIndex(0);
    }
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevState = history[newIndex];
      setHistoryIndex(newIndex);
      setStudies(JSON.parse(JSON.stringify(prevState.studies)));
      setSensors(JSON.parse(JSON.stringify(prevState.sensors)));
      setCombinationValues(JSON.parse(JSON.stringify(prevState.combinationValues)));
      setCombinationUnits(JSON.parse(JSON.stringify(prevState.combinationUnits)));
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setHistoryIndex(newIndex);
      setStudies(JSON.parse(JSON.stringify(nextState.studies)));
      setSensors(JSON.parse(JSON.stringify(nextState.sensors)));
      setCombinationValues(JSON.parse(JSON.stringify(nextState.combinationValues)));
      setCombinationUnits(JSON.parse(JSON.stringify(nextState.combinationUnits)));
    }
  }, [historyIndex, history]);

  // Study Grid Columns - stable reference
  const studyColumns = useMemo(() => [
    { prop: 'id', name: 'ID', size: 60, readonly: true },
    { prop: 'name', name: 'Study Name', size: 150 },
    { prop: 'description', name: 'Description', size: 200 },
    { prop: 'publicationDate', name: 'Publication Date', size: 140 },
    { prop: 'submissionDate', name: 'Submission Date', size: 140 }
  ], []);

  // Sensor Grid Columns - stable reference
  const sensorColumns = useMemo(() => [
    { prop: 'id', name: 'ID', size: 60, readonly: true },
    { prop: 'name', name: 'Sensor Name', size: 150 },
    { prop: 'sensorType', name: 'Type', size: 120 },
    { prop: 'description', name: 'Description', size: 250 }
  ], []);

  // Generate combination grid columns - updates when sensors change
  const combinationColumns = useMemo(() => {
    const baseColumns = [
      { prop: 'studyName', name: 'Study Name', size: 150, readonly: true, pin: 'colPinStart' },
      { prop: 'description', name: 'Description', size: 200, readonly: true },
      { prop: 'publicationDate', name: 'Pub Date', size: 120, readonly: true },
      { prop: 'submissionDate', name: 'Sub Date', size: 120, readonly: true }
    ];
    
    // Create column groups for each sensor with Value and Unit child columns
    const sensorGroups = sensors.map(sensor => ({
      name: `${sensor.name} (${sensor.sensorType})`,
      children: [
        {
          prop: `sensor_${sensor.id}_value`,
          name: 'Value',
          size: 100,
          readonly: false
        },
        {
          prop: `sensor_${sensor.id}_unit`,
          name: 'Unit',
          size: 80,
          readonly: false
        }
      ]
    }));
    
    return [...baseColumns, ...sensorGroups];
  }, [sensors]);

  // Generate combination grid data - updates when studies, sensors, or values change
  const combinationData = useMemo(() => {
    return studies.map(study => {
      const row = {
        studyId: study.id,
        studyName: study.name,
        description: study.description,
        publicationDate: study.publicationDate,
        submissionDate: study.submissionDate
      };
      
      // Add value and unit columns for each sensor
      sensors.forEach(sensor => {
        const valueKey = `sensor_${sensor.id}_value`;
        const unitKey = `sensor_${sensor.id}_unit`;
        row[valueKey] = combinationValues[`${study.id}-${sensor.id}`] || '';
        row[unitKey] = combinationUnits[`${study.id}-${sensor.id}`] || '';
      });
      
      return row;
    });
  }, [studies, sensors, combinationValues, combinationUnits]);

  // Add Study
  const addStudy = () => {
    const newStudy = {
      id: studyIdCounter,
      name: `New Study ${studyIdCounter}`,
      description: '',
      publicationDate: new Date().toISOString().split('T')[0],
      submissionDate: new Date().toISOString().split('T')[0]
    };
    setStudyIdCounter(prev => prev + 1);
    const newStudies = [...studies, newStudy];
    setStudies(newStudies);
    saveToHistory(newStudies, sensors, combinationValues, combinationUnits);
  };

  // Delete Study
  const deleteStudy = (id) => {
    const newStudies = studies.filter(s => s.id !== id);
    // Clean up combination values and units for deleted study
    const newCombinationValues = {...combinationValues};
    const newCombinationUnits = {...combinationUnits};
    Object.keys(newCombinationValues).forEach(key => {
      if (key.startsWith(`${id}-`)) {
        delete newCombinationValues[key];
      }
    });
    Object.keys(newCombinationUnits).forEach(key => {
      if (key.startsWith(`${id}-`)) {
        delete newCombinationUnits[key];
      }
    });
    setStudies(newStudies);
    setCombinationValues(newCombinationValues);
    setCombinationUnits(newCombinationUnits);
    saveToHistory(newStudies, sensors, newCombinationValues, newCombinationUnits);
  };

  // Add Sensor
  const addSensor = () => {
    const newSensor = {
      id: sensorIdCounter,
      name: `New Sensor ${sensorIdCounter}`,
      sensorType: 'Generic',
      description: ''
    };
    setSensorIdCounter(prev => prev + 1);
    const newSensors = [...sensors, newSensor];
    setSensors(newSensors);
    saveToHistory(studies, newSensors, combinationValues, combinationUnits);
  };

  // Delete Sensor
  const deleteSensor = (id) => {
    const newSensors = sensors.filter(s => s.id !== id);
    // Clean up combination values and units for deleted sensor
    const newCombinationValues = {...combinationValues};
    const newCombinationUnits = {...combinationUnits};
    Object.keys(newCombinationValues).forEach(key => {
      if (key.endsWith(`-${id}`)) {
        delete newCombinationValues[key];
      }
    });
    Object.keys(newCombinationUnits).forEach(key => {
      if (key.endsWith(`-${id}`)) {
        delete newCombinationUnits[key];
      }
    });
    setSensors(newSensors);
    setCombinationValues(newCombinationValues);
    setCombinationUnits(newCombinationUnits);
    saveToHistory(studies, newSensors, newCombinationValues, newCombinationUnits);
  };

  // Handle cell edit for studies - using lowercase event name
  const handleStudyEdit = useCallback((e) => {
    const { detail } = e;
    const updatedStudies = studies.map((study, idx) => {
      if (idx === detail.rowIndex) {
        return { ...study, [detail.prop]: detail.val };
      }
      return study;
    });
    setStudies(updatedStudies);
    saveToHistory(updatedStudies, sensors, combinationValues, combinationUnits);
  }, [studies, sensors, combinationValues, combinationUnits, saveToHistory]);

  // Handle cell edit for sensors - using lowercase event name
  const handleSensorEdit = useCallback((e) => {
    const { detail } = e;
    const updatedSensors = sensors.map((sensor, idx) => {
      if (idx === detail.rowIndex) {
        return { ...sensor, [detail.prop]: detail.val };
      }
      return sensor;
    });
    setSensors(updatedSensors);
    saveToHistory(studies, updatedSensors, combinationValues, combinationUnits);
  }, [studies, sensors, combinationValues, combinationUnits, saveToHistory]);

  // Handle cell edit for combination grid - using lowercase event name
  const handleCombinationEdit = useCallback((e) => {
    const { detail } = e;
    
    if (!detail) {
      return;
    }
    
    const newCombinationValues = {...combinationValues};
    const newCombinationUnits = {...combinationUnits};
    
    // Handle range operations (copy/paste, drag fill)
    if (detail.data && detail.models) {
      // Bulk edit operation - data and models are objects with numeric keys
      const indices = Object.keys(detail.data);
      
      indices.forEach(idx => {
        const rowModel = detail.models[idx];
        const changedData = detail.data[idx];
        
        if (!changedData || !rowModel || !rowModel.studyId) return;
        
        // Iterate through changed properties
        Object.keys(changedData).forEach(prop => {
          if (prop.includes('sensor_')) {
            const parts = prop.split('_');
            if (parts.length >= 3) {
              const sensorId = parseInt(parts[1]);
              const fieldType = parts[2]; // 'value' or 'unit'
              const studyId = rowModel.studyId;
              const key = `${studyId}-${sensorId}`;
              
              if (fieldType === 'value') {
                newCombinationValues[key] = changedData[prop];
              } else if (fieldType === 'unit') {
                newCombinationUnits[key] = changedData[prop];
              }
            }
          }
        });
      });
      
      setCombinationValues(newCombinationValues);
      setCombinationUnits(newCombinationUnits);
      saveToHistory(studies, sensors, newCombinationValues, newCombinationUnits);
    }
    // Handle single cell edit
    else if (detail.prop && detail.rowIndex !== undefined) {
      // Check if editing a sensor column
      if (detail.prop.includes('sensor_')) {
        const parts = detail.prop.split('_');
        if (parts.length >= 3) {
          const sensorId = parseInt(parts[1]);
          const fieldType = parts[2]; // 'value' or 'unit'
          
          // Get the study from the combinationData array
          const rowData = combinationData[detail.rowIndex];
          
          if (!rowData || !rowData.studyId) {
            return;
          }
          
          const studyId = rowData.studyId;
          const key = `${studyId}-${sensorId}`;
          
          if (fieldType === 'value') {
            newCombinationValues[key] = detail.val;
          } else if (fieldType === 'unit') {
            newCombinationUnits[key] = detail.val;
          }
          
          setCombinationValues(newCombinationValues);
          setCombinationUnits(newCombinationUnits);
          saveToHistory(studies, sensors, newCombinationValues, newCombinationUnits);
        }
      }
    }
  }, [studies, sensors, combinationValues, combinationUnits, combinationData, saveToHistory]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study-Sensor Management System</h1>
          <p className="text-gray-600">Manage studies, sensors, and their combinations with undo/redo support</p>
        </div>

        {/* Undo/Redo Controls */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Undo size={18} />
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Redo size={18} />
            Redo
          </button>
          <span className="ml-4 flex items-center text-sm text-gray-600">
            History: {historyIndex + 1} / {history.length}
          </span>
        </div>

        {/* Studies Grid */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Studies ({studies.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={addStudy}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add Study
              </button>
            </div>
          </div>
          <div style={{ height: '300px' }}>
            <RevoGrid
              source={studies}
              columns={studyColumns}
              theme="compact"
              resize={true}
              canFocus={true}
              range={true}
              readonly={false}
              onAfteredit={handleStudyEdit}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {studies.map(study => (
              <button
                key={study.id}
                onClick={() => deleteStudy(study.id)}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
              >
                <Trash2 size={14} />
                Delete {study.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sensors Grid */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Sensors ({sensors.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={addSensor}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                Add Sensor
              </button>
            </div>
          </div>
          <div style={{ height: '300px' }}>
            <RevoGrid
              source={sensors}
              columns={sensorColumns}
              theme="compact"
              resize={true}
              canFocus={true}
              range={true}
              readonly={false}
              onAfteredit={handleSensorEdit}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {sensors.map(sensor => (
              <button
                key={sensor.id}
                onClick={() => deleteSensor(sensor.id)}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
              >
                <Trash2 size={14} />
                Delete {sensor.name}
              </button>
            ))}
          </div>
        </div>

        {/* Combination Grid */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Study-Sensor Matrix ({studies.length} × {sensors.length} = {combinationData.length} rows)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Studies as rows, Sensors as columns - Enter values for each combination
            </p>
          </div>
          <div style={{ height: '500px' }}>
            <RevoGrid
              source={combinationData}
              columns={combinationColumns}
              theme="compact"
              resize={true}
              canFocus={true}
              range={true}
              onAfteredit={handleCombinationEdit}
            />
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Features:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Matrix Layout:</strong> Each study is a row, each sensor is a column</li>
            <li>• Click on sensor cells in the matrix to enter values</li>
            <li>• Use Ctrl+C / Ctrl+V to copy and paste data between cells</li>
            <li>• Drag to select multiple cells for bulk operations</li>
            <li>• Add/Delete studies (adds/removes rows in matrix)</li>
            <li>• Add/Delete sensors (adds/removes columns in matrix)</li>
            <li>• Undo/Redo support for ALL changes including single cell edits</li>
            <li>• Study info columns are pinned and readonly for reference</li>
            <li>• Matrix values persist when adding/deleting studies or sensors</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;