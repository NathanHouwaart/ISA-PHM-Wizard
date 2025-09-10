import React, { useEffect, useState } from 'react';
import PageWrapper from "../layout/PageWrapper";
import "./About.css";
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import DataGrid from '../components/DataGrid';
import { BoldCell, HTML5DateCellTemplate, PatternCellTemplate } from '../components/GridTable/CellTemplates';
import { Template } from '@revolist/react-datagrid';
import { VARIABLE_TYPE_OPTIONS } from '../constants/variableTypes';
import SelectTypePlugin from '@revolist/revogrid-column-select'


const variables = [
  {
    "id": "fd14bdba-b880-4ead-b592-f59ca706d613",
    "name": "Fault Type",
    "type": "Qualitative fault specification",
    "unit": "",
    "description": "Describes the kind of fault detected in the system."
  },
  {
    "id": "8aac8b6c-1774-4814-9916-b24171044ce6",
    "name": "Fault Position",
    "type": "Qualitative fault specification",
    "unit": "",
    "description": "Indicates the physical location of the fault."
  },
  {
    "id": "fac02919-811b-4653-9127-ce76807f2cd2",
    "name": "Fault Severity",
    "type": "Quantitative fault specification",
    "unit": "",
    "description": "Measures the impact or intensity of the fault."
  },
  {
    "id": "36897f6c-8144-4e8b-a375-65ad88bb6d94",
    "name": "Motor Speed",
    "type": "Operating condition",
    "unit": "RPM",
    "description": "The rotational speed of the motor."
  },
  {
    "id": "9c451f87-2eb8-4ee1-8610-1bb6790ef025",
    "name": "Discharge Pressure",
    "type": "Operating condition",
    "unit": "bar",
    "description": "Pressure at the discharge point of the system."
  },
  {
    "id": "c1dc436d-c95c-4784-921e-481d98716cd4",
    "name": "Volumetric Flow Rate",
    "type": "Qualitative fault specification",
    "unit": "m^3/h",
    "description": "The volumetric flow rate through the system."
  }
]

const initial_studies = [
  {
    "id": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "name": "Test Study 1",
    "description": "Description of test study 1",
    "submissionDate": "2025-09-03",
    "publicationDate": "2025-10-10"
  },
  {
    "id": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "name": "Test study 2",
    "description": "Description of test study 2",
    "submissionDate": "2025-09-02",
    "publicationDate": "2025-10-02"
  },
  {
    "id": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "name": "Test study 3",
    "description": "Description of test study 3",
    "submissionDate": "2025-09-12",
    "publicationDate": "2025-10-08"
  },
  {
    "id": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "name": "Test study 4",
    "description": "Description of test study 4",
    "submissionDate": "2025-09-12",
    "publicationDate": "2025-09-02"
  }
]

const mappings = [
  {
    "studyId": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "studyVariableId": "fd14bdba-b880-4ead-b592-f59ca706d613",
    "value": "BPFO"
  },
  {
    "studyId": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "studyVariableId": "fd14bdba-b880-4ead-b592-f59ca706d613",
    "value": "BPFO"
  },
  {
    "studyId": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "studyVariableId": "fd14bdba-b880-4ead-b592-f59ca706d613",
    "value": "BPFO"
  },
  {
    "studyId": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "studyVariableId": "fd14bdba-b880-4ead-b592-f59ca706d613",
    "value": "BPFO"
  },
  {
    "studyId": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "studyVariableId": "8aac8b6c-1774-4814-9916-b24171044ce6",
    "value": "Bearing"
  },
  {
    "studyId": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "studyVariableId": "8aac8b6c-1774-4814-9916-b24171044ce6",
    "value": "Bearing"
  },
  {
    "studyId": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "studyVariableId": "8aac8b6c-1774-4814-9916-b24171044ce6",
    "value": "Bearing"
  },
  {
    "studyId": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "studyVariableId": "8aac8b6c-1774-4814-9916-b24171044ce6",
    "value": "Bearing"
  },
  {
    "studyId": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "studyVariableId": "fac02919-811b-4653-9127-ce76807f2cd2",
    "value": "2"
  },
  {
    "studyId": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "studyVariableId": "fac02919-811b-4653-9127-ce76807f2cd2",
    "value": "2"
  },
  {
    "studyId": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "studyVariableId": "fac02919-811b-4653-9127-ce76807f2cd2",
    "value": "2"
  },
  {
    "studyId": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "studyVariableId": "fac02919-811b-4653-9127-ce76807f2cd2",
    "value": "2"
  },
  {
    "studyId": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "studyVariableId": "36897f6c-8144-4e8b-a375-65ad88bb6d94",
    "value": "1750"
  },
  {
    "studyId": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "studyVariableId": "36897f6c-8144-4e8b-a375-65ad88bb6d94",
    "value": "1750"
  },
  {
    "studyId": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "studyVariableId": "36897f6c-8144-4e8b-a375-65ad88bb6d94",
    "value": "1750"
  },
  {
    "studyId": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "studyVariableId": "36897f6c-8144-4e8b-a375-65ad88bb6d94",
    "value": "1750"
  },
  {
    "studyId": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "studyVariableId": "9c451f87-2eb8-4ee1-8610-1bb6790ef025",
    "value": "20"
  },
  {
    "studyId": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "studyVariableId": "9c451f87-2eb8-4ee1-8610-1bb6790ef025",
    "value": "20"
  },
  {
    "studyId": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "studyVariableId": "9c451f87-2eb8-4ee1-8610-1bb6790ef025",
    "value": "20"
  },
  {
    "studyId": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "studyVariableId": "9c451f87-2eb8-4ee1-8610-1bb6790ef025",
    "value": "20"
  },
  {
    "studyId": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "studyVariableId": "c1dc436d-c95c-4784-921e-481d98716cd4",
    "value": "900"
  },
  {
    "studyId": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "studyVariableId": "c1dc436d-c95c-4784-921e-481d98716cd4",
    "value": "900"
  },
  {
    "studyId": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "studyVariableId": "c1dc436d-c95c-4784-921e-481d98716cd4",
    "value": "900"
  },
  {
    "studyId": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "studyVariableId": "c1dc436d-c95c-4784-921e-481d98716cd4",
    "value": "900"
  }
]

const initial_sensors =  [
        {
            "id": "37ab2ad3-9e41-4707-a2f5-2ecde5fb5aee",
            "alias": "Press Radial Cylinder",
            "measurementType": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
            "measurementUnit": "bar",
            "description": "measures pressure on the radial cylinder",
            "technologyType": "pressure transmitter",
            "technologyPlatform": "PT5401",
            "dataAcquisitionUnit": "PLC S7-1200",
            "samplingRate": "50",
            "samplingUnit": "Hz",
            "sensorLocation": "In radial cylinder tubes",
            "locationUnit": "",
            "sensorOrientation": "Slightly rotated forward",
            "orientationUnit": ""
        },
        {
            "id": "58b81aac-73fb-4775-ad1d-d49c409ee9b2",
            "alias": "Press Axial Cylinder",
            "measurementType": "Pressure",
            "measurementUnit": "bar",
            "description": "measures pressure in the axial cylinder",
            "technologyType": "pressure transmitter",
            "technologyPlatform": "PT5401",
            "dataAcquisitionUnit": "PLC S7-1200",
            "samplingRate": "50",
            "samplingUnit": "Hz",
            "sensorLocation": "In Axial cylinder tubes",
            "locationUnit": "",
            "sensorOrientation": "Slightly rotated forward",
            "orientationUnit": ""
        },
        {
            "id": "2f948c90-f7e7-4f8e-af16-0c4e8f339a10",
            "alias": "Temp Bearing",
            "measurementType": "Temperature",
            "measurementUnit": "celcius",
            "description": "measures temperature of bearing",
            "technologyType": "PT",
            "technologyPlatform": "PT100",
            "dataAcquisitionUnit": "PLC S7-1200",
            "samplingRate": "10",
            "samplingUnit": "Hz",
            "sensorLocation": "Bearing House",
            "locationUnit": "",
            "sensorOrientation": "",
            "orientationUnit": ""
        }
    ]

const initial_protocols = [
  {
    "id": "fd14bdba-b880-4ead-b592-f59ca706d123",
    "name": "Filter Type",
    "description": "Describes the filter type used for data processing of sensor data.",
    "type": "Qualitative fault specification",
    "unit": ""
  },
  {
    "id": "8aac8b6c-1774-4814-9916-b24171044123",
    "name": "Chunk Size",
    "description": "Specifies the chunk size used in data processing of sensor data.",
    "type": "Qualitative fault specification",
    "unit": ""
  },
  {
    "id": "d57e87cc-9b71-45b6-a359-be07152a1ed2",
    "name": "Scaling Range",
    "description": "Defines the scaling range and resolution applied during data processing of sensor data.",
    "type": "",
    "unit": ""
  },
  {
    "id": "a3f5c6e1-2d4b-4f8e-9c3a-1e2b3c4d5e6f",
    "name": "Scaling Resolution",
    "description": "Defines the scaling resolution applied during data processing of sensor data.",
    "type": "",
    "unit": ""
  }

]

const s2p_mappings = [
  {
    "sourceId": "37ab2ad3-9e41-4707-a2f5-2ecde5fb5aee",
    "targetId": "fd14bdba-b880-4ead-b592-f59ca706d123",
    "sourceType": "sensor",
    "targetType": "processingProtocol",
    "value": [
      "Butterworth 2nd gen",
      ""
    ]
  },
  {
    "sourceId": "58b81aac-73fb-4775-ad1d-d49c409ee9b2",
    "targetId": "fd14bdba-b880-4ead-b592-f59ca706d123",
    "sourceType": "sensor",
    "targetType": "processingProtocol",
    "value": [
      "",
      ""
    ]
  },
  {
    "sourceId": "2f948c90-f7e7-4f8e-af16-0c4e8f339a10",
    "targetId": "fd14bdba-b880-4ead-b592-f59ca706d123",
    "sourceType": "sensor",
    "targetType": "processingProtocol",
    "value": [
      "",
      ""
    ]
  },
  {
    "sourceId": "37ab2ad3-9e41-4707-a2f5-2ecde5fb5aee",
    "targetId": "8aac8b6c-1774-4814-9916-b24171044123",
    "sourceType": "sensor",
    "targetType": "processingProtocol",
    "value": [
      "12",
      ""
    ]
  },
  {
    "sourceId": "58b81aac-73fb-4775-ad1d-d49c409ee9b2",
    "targetId": "8aac8b6c-1774-4814-9916-b24171044123",
    "sourceType": "sensor",
    "targetType": "processingProtocol",
    "value": [
      "12",
      ""
    ]
  },
  {
    "sourceId": "37ab2ad3-9e41-4707-a2f5-2ecde5fb5aee",
    "targetId": "d57e87cc-9b71-45b6-a359-be07152a1ed2",
    "sourceType": "sensor",
    "targetType": "processingProtocol",
    "value": [
      "[-1,1]",
      ""
    ]
  },
  {
    "sourceId": "58b81aac-73fb-4775-ad1d-d49c409ee9b2",
    "targetId": "d57e87cc-9b71-45b6-a359-be07152a1ed2",
    "sourceType": "sensor",
    "targetType": "processingProtocol",
    "value": [
      "[-1,1]",
      ""
    ]
  },
  {
    "targetId": "a3f5c6e1-2d4b-4f8e-9c3a-1e2b3c4d5e6f",
    "sourceId": "37ab2ad3-9e41-4707-a2f5-2ecde5fb5aee",
    "value": [
      "24",
      "bit"
    ]
  },
  {
    "targetId": "a3f5c6e1-2d4b-4f8e-9c3a-1e2b3c4d5e6f",
    "sourceId": "58b81aac-73fb-4775-ad1d-d49c409ee9b2",
    "value": [
      "24",
      "bit"
    ]
  },
  {
    "targetId": "a3f5c6e1-2d4b-4f8e-9c3a-1e2b3c4d5e6f",
    "sourceId": "2f948c90-f7e7-4f8e-af16-0c4e8f339a10",
    "value": [
      "24",
      "bit"
    ]
  },
  {
    "targetId": "d57e87cc-9b71-45b6-a359-be07152a1ed2",
    "sourceId": "2f948c90-f7e7-4f8e-af16-0c4e8f339a10",
    "value": [
      "[-1,1]",
      ""
    ]
  },
  {
    "targetId": "8aac8b6c-1774-4814-9916-b24171044123",
    "sourceId": "2f948c90-f7e7-4f8e-af16-0c4e8f339a10",
    "value": [
      "12",
      ""
    ]
  }
]


// register column type
const plugin = { select: new SelectTypePlugin() }

export const GridTest = () => {
  const { setScreenWidth } = useGlobalDataContext();

  // Grid configuration state
  const [gridMode, setGridMode] = useState('study-variables'); // 'study-variables', 'sensor-protocols', 'studies-only', 'variables-only', 'protocols-only'

  // Data state - make data editable
  const [studies, setStudies] = useState(initial_studies);
  const [variableData, setVariableData] = useState(variables);
  const [sensorData, setSensorData] = useState(initial_sensors);
  const [protocolData, setProtocolData] = useState(initial_protocols);
  const [studyVariableMappings, setStudyVariableMappings] = useState(mappings);
  const [sensorProtocolMappings, setSensorProtocolMappings] = useState(s2p_mappings);

  // Set page width to max-w-[100rem] when component mounts
  useEffect(() => {
    setScreenWidth("max-w-[100rem]");

    return () => {
      setScreenWidth("max-w-5xl");
    };
  }, [setScreenWidth]);

  // Helper function to generate unique IDs
  const generateId = () => {
    return crypto.randomUUID();
  };

  // Add new row functions
  const addNewStudy = () => {
    const newStudy = {
      id: generateId(),
      name: `New Study ${studies.length + 1}`,
      description: 'Enter description...',
      submissionDate: new Date().toISOString().split('T')[0],
      publicationDate: new Date().toISOString().split('T')[0]
    };
    setStudies([...studies, newStudy]);
  };

  const addNewVariable = () => {
    const newVariable = {
      id: generateId(),
      name: `New Variable ${variableData.length + 1}`,
      type: 'Enter type...',
      unit: '',
      description: 'Enter description...'
    };
    setVariableData([...variableData, newVariable]);
  };

  const addNewProtocol = () => {
    const newProtocol = {
      id: generateId(),
      name: `New Protocol ${protocolData.length + 1}`,
      type: 'Enter type...',
      unit: '',
      description: 'Enter description...'
    };
    setProtocolData([...protocolData, newProtocol]);
  };

  const addNewSensor = () => {
    const newSensor = {
      id: generateId(),
      alias: `New Sensor ${sensorData.length + 1}`,
      measurementType: 'Enter type...',
      measurementUnit: '',
      description: 'Enter description...'
    };
    setSensorData([...sensorData, newSensor]);
  };

  // Remove last row functions
  const removeLastStudy = () => {
    if (studies.length > 0) {
      setStudies(studies.slice(0, -1));
    }
  };

  const removeLastVariable = () => {
    if (variableData.length > 0) {
      setVariableData(variableData.slice(0, -1));
    }
  };

  const removeLastProtocol = () => {
    if (protocolData.length > 0) {
      setProtocolData(protocolData.slice(0, -1));
    }
  };

  const removeLastSensor = () => {
    if (sensorData.length > 0) {
      setSensorData(sensorData.slice(0, -1));
    }
  };

  // Data change handlers
  const handleDataChange = (newMappings) => {
    console.log('Data changed:', newMappings);

    // Update the appropriate mapping state based on current grid mode
    if (gridMode === 'study-variables') {
      setStudyVariableMappings(newMappings);
    } else if (gridMode === 'sensor-protocols') {
      setSensorProtocolMappings(newMappings);
    }
  };

  const handleRowDataChange = (newRowData) => {
    console.log('Row data changed:', newRowData);

    // Update the appropriate data state based on current grid mode
    switch (gridMode) {
      case 'studies-only':
      case 'study-variables':
        setStudies(newRowData);
        break;
      case 'variables-only':
        setVariableData(newRowData);
        break;
      case 'protocols-only':
        setProtocolData(newRowData);
        break;
      case 'sensor-protocols':
        setProtocolData(newRowData); // Fixed: protocols are row data in this mode
        break;
    }
  };

    // Create a dropdown for the 'type' column
    const dropdown = {
        labelKey: 'label',
        valueKey: 'value',
        source: [
            ...VARIABLE_TYPE_OPTIONS.map(type => ({ label: type, value: type }))
        ],
    }


  // Grid configurations for different modes
  const getGridConfig = () => {
    switch (gridMode) {
      case 'study-variables':
        return {
          title: 'Variables to Studies Grid',
          rowData: variableData, // Variables are now rows
          columnData: studies, // Studies are now columns
          mappings: studyVariableMappings,
          fieldMappings: {
            rowId: 'id',
            rowName: 'name',
            columnId: 'id',
            columnName: 'name',
            columnUnit: '', // Studies don't have units
            mappingRowId: 'studyVariableId', // Swapped: variables are now rows
            mappingColumnId: 'studyId', // Swapped: studies are now columns
            mappingValue: 'value'
          },
          staticColumns: [
            {
              prop: 'name',
              name: 'Variable Name',
              size: 200,
              readonly: true,
              cellTemplate: Template(BoldCell),
            },
            {
              prop: 'type',
              name: 'Type',
              size: 150,
              readonly: true
            },
            {
              prop: 'unit',
              name: 'Unit',
              size: 100,
              readonly: true,
              cellProperties: () => {
                return {
                  style: {
                    "border-right": "3px solid "
                  }
                }
              }
            }
          ]
        };

      case 'sensor-protocols':
        return {
          title: 'Processing Protocols to Sensors Grid',
          rowData: protocolData,            // Protocols are now rows
          columnData: sensorData,           // Sensors are now columns
          mappings: sensorProtocolMappings,
          fieldMappings: {
            rowId: 'id',
            rowName: 'name',
            columnId: 'id',
            columnName: 'alias',            // Sensors use 'alias' as name
            columnUnit: 'measurementUnit',  // Sensors have measurementUnit
            mappingRowId: 'targetId',       // Swapped: protocols are now rows (were targets)
            mappingColumnId: 'sourceId',    // Swapped: sensors are now columns (were sources)
            mappingValue: 'value',
            hasChildColumns: true           // Enable child columns for specification and unit
          },
          staticColumns: [
            {
              prop: 'name',
              name: 'Protocol Name',
              size: 200,
              // readonly: true,
              cellTemplate: Template(BoldCell),
            },
            {
              prop: 'description',
              name: 'Description',
              size: 300,
              // readonly: true,
              cellProperties: () => {
                return {
                  style: {
                    "border-right": "3px solid "
                  }
                }
              }
            }
          ]
        };

      case 'studies-only':
        return {
          title: 'Studies Data',
          rowData: studies,
          columnData: [], // No dynamic columns
          mappings: [],
          staticColumns: [
            {
              prop: 'id',
              name: 'Identifier',
              size: 150,
              readonly: true,
              cellTemplate: Template(PatternCellTemplate, { prefix: 'Study S' }),
              cellProperties: () => {
                return {
                  style: {
                    "border-right": "3px solid "
                  }
                }
              }
            },
            {
              prop: 'name',
              name: 'Study Name',
              size: 200,
              readonly: false
            },
            {
              prop: 'description',
              name: 'Description',
              size: 300,
              readonly: false
            },
            {
              prop: 'submissionDate',
              name: 'Submission Date',
              size: 250,
              readonly: false,
              cellTemplate: Template(HTML5DateCellTemplate),
            },
            {
              prop: 'publicationDate',
              name: 'Publication Date',
              size: 250,
              readonly: false,
              cellTemplate: Template(HTML5DateCellTemplate),
            }
          ]
        };

      case 'variables-only':
        return {
          title: 'Variables Data',
          rowData: variableData,
          columnData: [],
          mappings: [],
          staticColumns: [
            {
              prop: 'name',
              name: 'Variable Name',
              size: 200,
              readonly: false,
              cellTemplate: Template(BoldCell),
              cellProperties: () => {
                return {
                  style: {
                    "border-right": "3px solid "
                  }
                }
              }
            },
            {
                prop: 'type',
                name: 'Variable Type',
                size: 200,
                columnType: 'select',
                ...dropdown
            },
            {
              prop: 'unit',
              name: 'Unit',
              size: 100,
              readonly: false
            },
            {
              prop: 'description',
              name: 'Description',
              size: 400,
              readonly: false
            }
          ]
        };

      case 'protocols-only':
        return {
          title: 'Processing Protocols Data',
          rowData: protocolData,
          columnData: [],
          mappings: [],
          staticColumns: [
            {
              prop: 'name',
              name: 'Protocol Name',
              size: 200,
              readonly: false,
              cellTemplate: Template(BoldCell),
              cellProperties: () => {
                return {
                  style: {
                    "border-right": "3px solid "
                  }
                }
              }
            },
            {
              prop: 'description',
              name: 'Description',
              size: 400,
              readonly: false
            },
            // {
            //   prop: 'type',
            //   name: 'Type',
            //   size: 200,
            //   readonly: false
            // },
            {
              prop: 'unit',
              name: 'Unit',
              size: 100,
              readonly: false
            },
           
          ]
        };

      default:
        return getGridConfig('study-variables');
    }
  };

  const currentConfig = getGridConfig();

  return (
    <PageWrapper>
      <div className='space-y-6'>
        {/* Grid Mode Selector */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Generic Data Grid Demo</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGridMode('study-variables')}
              className={`px-4 py-2 rounded border ${gridMode === 'study-variables'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              Variables ↔ Studies
            </button>
            <button
              onClick={() => setGridMode('sensor-protocols')}
              className={`px-4 py-2 rounded border ${gridMode === 'sensor-protocols'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              Protocols ↔ Sensors
            </button>
            <button
              onClick={() => setGridMode('studies-only')}
              className={`px-4 py-2 rounded border ${gridMode === 'studies-only'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              Studies Only
            </button>
            <button
              onClick={() => setGridMode('variables-only')}
              className={`px-4 py-2 rounded border ${gridMode === 'variables-only'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              Variables Only
            </button>
            <button
              onClick={() => setGridMode('protocols-only')}
              className={`px-4 py-2 rounded border ${gridMode === 'protocols-only'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              Protocols Only
            </button>
          </div>
        </div>

        {/* Add Row Controls */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Manage Rows</h3>
          <div className="flex flex-wrap gap-2">
            {/* Add Row Buttons */}
            {gridMode === 'studies-only' && (
              <>
                <button
                  onClick={addNewStudy}
                  className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100"
                >
                  + Add Study
                </button>
                <button
                  onClick={removeLastStudy}
                  disabled={studies.length === 0}
                  className={`px-3 py-2 text-sm border rounded ${studies.length === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    }`}
                >
                  - Remove Last Study
                </button>
              </>
            )}
            {gridMode === 'variables-only' && (
              <>
                <button
                  onClick={addNewVariable}
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded hover:bg-blue-100"
                >
                  + Add Variable
                </button>
                <button
                  onClick={removeLastVariable}
                  disabled={variableData.length === 0}
                  className={`px-3 py-2 text-sm border rounded ${variableData.length === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    }`}
                >
                  - Remove Last Variable
                </button>
              </>
            )}
            {gridMode === 'protocols-only' && (
              <>
                <button
                  onClick={addNewProtocol}
                  className="px-3 py-2 text-sm bg-purple-50 text-purple-700 border border-purple-300 rounded hover:bg-purple-100"
                >
                  + Add Protocol
                </button>
                <button
                  onClick={removeLastProtocol}
                  disabled={protocolData.length === 0}
                  className={`px-3 py-2 text-sm border rounded ${protocolData.length === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    }`}
                >
                  - Remove Last Protocol
                </button>
              </>
            )}
          </div>
        </div>

        {/* Generic Data Grid */}
        <DataGrid
          key={gridMode} // Force re-render when mode changes
          {...currentConfig}
          showControls={true}
          plugins={plugin}
          showDebug={true} // Set to true to see raw data
          onDataChange={handleDataChange}
          onRowDataChange={handleRowDataChange}
        />
      </div>
    </PageWrapper>
  );
};
