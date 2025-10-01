import React, { useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { HTML5DateCellTemplate, PatternCellTemplate } from '../components/DataGrid/CellTemplates';
import { Template } from '@revolist/react-datagrid';

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
];

// Static columns - never recreated
const COLUMNS = [
  {
    prop: 'id',
    name: 'Identifier',
    size: 150,
    readonly: true,
    cellTemplate: Template(PatternCellTemplate, { prefix: 'Study S' }),
    cellProperties: () => ({
      style: { "border-right": "3px solid " }
    })
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
];

export const SimpleRevoGridTest = () => {
  const [studies, setStudies] = useState(initial_studies);

  const handleAfterEdit = (event) => {
    const { detail } = event;
    console.log('🔴 Cell edited:', detail);
    
    // Update the studies data
    const newStudies = [...studies];
    const rowIndex = detail.row;
    const columnProp = detail.column.prop;
    const newValue = detail.val;
    
    if (newStudies[rowIndex]) {
      newStudies[rowIndex][columnProp] = newValue;
      setStudies(newStudies);
    }
  };

  console.log('🔴 SimpleRevoGridTest render, studies:', studies.length);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple RevoGrid Test</h1>
      <p>This bypasses DataGrid entirely and uses RevoGrid directly.</p>
      
      <RevoGrid
        source={studies}
        columns={COLUMNS}
        height="500px"
        rowSize={50}
        theme="default"
        onAfteredit={handleAfterEdit}
        readonly={false}
        resize={true}
        canResize={true}
      />
    </div>
  );
};

export default SimpleRevoGridTest;
