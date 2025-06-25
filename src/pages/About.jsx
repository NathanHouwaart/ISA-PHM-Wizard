// // components/MyTable.jsx
// import React, { useState, useRef, useEffect  } from 'react';
// import { RevoGrid, Template } from '@revolist/react-datagrid';
// import "./About.css";
// import PageWrapper from '../layout/PageWrapper';
// import { Redo, Undo } from 'lucide-react';


// /**
//  * Custom cell component
//  */
// const Cell = ({ value }) => {
//   return (
//     <div className="flex items-center justify-center">
//         <strong className=''>{value}</strong>
//     </div>
//   );
// };


// const columns = [
//   {
//     prop: 'label',
//     // name: 'User',
//     size: 120,
//     readonly: true,
//     cellTemplate: Template(Cell)
//   },
//   {
//     prop: 'name',
//     name: 'Name',
//   },
//   {
//     prop: 'age',
//     name: 'Age',
//   },
// ];

// const source = [
//   { label: '🧑 Alice', name: 'Alice', age: 30 },
//   { label: '🧑 Bob', name: 'Bob', age: 25 },
// ];

// export const About = () => {
//   //  const initialData = [
//   //   { name: 'Alice', age: 30, city: 'New York' },
//   //   { name: 'Bob', age: 25, city: 'London' },
//   //   { name: '', age: '', city: '' },
//   // ];

//   // const columns = [
//   //   { prop: 'name', name: 'Name', size: 150, columnClass: 'text-right text-blue-600' },
//   //   { prop: 'age', name: 'Age', size: 100  },
//   //   { prop: 'city', name: 'City', size: 150 },
//   // ];

//   const [rows, setRows] = useState(source);
//   const history = useRef([]);
//   const future = useRef([]);

//   const pushToHistory = (prevData) => {
//     console.log(prevData)
//     history.current.push(JSON.stringify(prevData));
//     if (history.current.length > 100) history.current.shift(); // limit stack size
//     future.current = []; // clear redo stack
//   };

//   const handleRangeEdit = (e) => {
//     console.log("Range", e.detail)
//   }

//   const handleEdit = (e) => {
//     e.preventDefault();

//     console.log("Edit", e.detail)

//     const { detail } = e;
//     const newValue = detail.val;
//     const rowIndex = detail.rowIndex;
//     const prop = detail.prop;

//     const prevData = [...rows];
//     const newData = [...rows];
//     newData[rowIndex] = { ...newData[rowIndex], [prop]: newValue };

//     // Only store if changed
//     if (e.detail.val !== e.detail.value) {
//       pushToHistory(prevData);
//       setRows(newData);
//     }
//   };

//   const undo = () => {
//     console.log("undo");

//     if (history.current.length === 0) return;
//     console.log("undo2");
//     const prevState = JSON.parse(history.current.pop());
//     future.current.push(JSON.stringify(rows));
//     setRows(prevState);
//   };

//   const redo = () => {
//     console.log("redo");
//     if (future.current.length === 0) return;
//     console.log("undo2");
//     const nextState = JSON.parse(future.current.pop());
//     history.current.push(JSON.stringify(rows));
//     setRows(nextState);
//   };

//   // 🔑 Add keyboard listeners
//   useEffect(() => {
//     const keyHandler = (e) => {
//       // Make sure no cell editor is actively focused
//       const activeTag = document.activeElement?.tagName?.toLowerCase();
//       const isEditing = activeTag === 'input' || activeTag === 'textarea';

//       if (e.ctrlKey && (e.key === 'z' || e.key === 'y')) {
//         e.preventDefault();  // Prevent default browser and input behavior
//         e.stopPropagation(); // Stop event from reaching the grid cell
//         if (e.key === 'z') {
//           undo();
//         } else if (e.key === 'y') {
//           redo();
//         }
//       }
//     };

//     window.addEventListener('keydown', keyHandler, true); // capture phase
//     return () => window.removeEventListener('keydown', keyHandler, true);
//   }, []);

//   return (
//       <PageWrapper>
//       <div className="relative rounded-lg overflow-hidden border border-purple-500 shadow-inner">
//         <RevoGrid
//           // theme='custom'
//           source={rows}
//           columns={columns}
//           editable={true}
//           range={true}
//           resize={true}
//           rowHeaders={true}
//           // autofill={true}
//           onBeforeedit={handleEdit}
//           onBeforeautofill={handleRangeEdit}
//           onBefore
//         />
//       </div>
//       <div>
//         <button onClick={undo} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"><Undo /></button>
//         <button onClick={redo} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"><Redo /></button>
//       </div>
//     </PageWrapper>
//   );
// };


import React, { useEffect, useRef, useState } from 'react';
import { RevoGrid, Template } from '@revolist/react-datagrid';
import { Bold, Minus, Plus } from "lucide-react";
import PageWrapper from "../layout/PageWrapper";
import "./About.css";

const BoldCell = ({ value }) => {
  return (
    <div className="flex items-center justify-center">
        <strong className=''>{value}</strong>
    </div>
  );
};


const columns = [
  { prop: 'identifier', name: 'Identifier', size: 90, readonly: true, cellTemplate: Template(BoldCell) },
  { prop: 'title', name: 'Title', size: 200},
  { prop: 'description', name: 'Description', size: 374 },
  { prop: 'submissionDate', name: 'Submission Date', size: 120 },
  { prop: 'publicationDate', name: 'Publication Date', size: 120 }
];

export const About = () => {
  const [rows, setRows] = useState([
    { identifier: 'S01' },
    { identifier: 'S02' }
  ]);

  const history = useRef([]);
  const future = useRef([]);

  const pushToHistory = (prevData) => {
    console.log(prevData)
    history.current.push(JSON.stringify(prevData));
    if (history.current.length > 100) history.current.shift(); // limit stack size
    future.current = []; // clear redo stack
  };

  const handleRangeEdit = (e) => {
    console.log("Range", e.detail)
    
    const prevData = [...rows];
    pushToHistory(prevData)
  }

  const handleEdit = (e) => {
    // e.preventDefault();

    console.log("Edit", e.detail)

    const { detail } = e;
    // const newValue = detail.val;
    // const rowIndex = detail.rowIndex;
    // const prop = detail.prop;

    const prevData = [...rows];
    const newData = [...rows];
    // newData[rowIndex] = { ...newData[rowIndex], [prop]: newValue };

    // Only store if changed
    if (e.detail.val !== e.detail.value) {
      pushToHistory(prevData);
      // setRows(newData);
    }
  };

  const undo = () => {
    console.log("undo");

    if (history.current.length === 0) return;
    const prevState = JSON.parse(history.current.pop());
    console.log("undo2 pusing ", JSON.stringify(rows));
    future.current.push(JSON.stringify(rows));
    setRows(prevState);
  };

  useEffect((e) => {console.log("rows changed", rows)}, [rows])

  const redo = () => {
    console.log("redo");
    // console.log(future.current)
    if (future.current.length === 0) return;
    console.log("redo 2");
    const nextState = JSON.parse(future.current.pop());
    history.current.push(JSON.stringify(rows));
    console.log("nextstate", nextState)
    setRows(nextState);
  };

  // 🔑 Add keyboard listeners
  useEffect(() => {
    const keyHandler = (e) => {
      // Make sure no cell editor is actively focused
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditing = activeTag === 'input' || activeTag === 'textarea';

      if (e.ctrlKey && (e.key === 'z' || e.key === 'y')) {
        e.preventDefault();  // Prevent default browser and input behavior
        e.stopPropagation(); // Stop event from reaching the grid cell
        if (e.key === 'z') {
          undo();
        } else if (e.key === 'y') {
          redo();
        }
      }
    };

    window.addEventListener('keydown', keyHandler, true); // capture phase
    return () => window.removeEventListener('keydown', keyHandler, true);
  }, []);

  const addRow = () => {
    const rowIndex = rows.length + 1;

    const newRow = columns.reduce((acc, col) => {
      if (col.prop === 'identifier') {
        acc[col.prop] = `S${rowIndex.toString().padStart(2, '0')}`;
      } else {
        acc[col.prop] = '';
      }
      return acc;
    }, {});

    setRows((prev) => [...prev, newRow]);
    console.log(rows)
  };

  const removeRow = () => {
    setRows((prev) => prev.slice(0, -1));
  };


  return (
    <PageWrapper >
      <h2 className="text-2xl font-bold mb-4">Dynamic RevoGrid with Tailwind CSS</h2>
      <div className="mb-2 space-x-2">
        <button
          onClick={addRow}
          className="px-3 py-[2px] bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          <span>Add study <Plus className="h-4 w-4"/> </span>
        </button>
        <button
          onClick={removeRow}
          className="px-3 py-[2px] bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          <span>Remove study <Minus className="h-4 w-4"/> </span>
        </button>

      </div>
      <div className="relative rounded-lg overflow-hidden border-purple-500 shadow-md border-2 h-[400px]">
        <RevoGrid
          rowSize={50}
          columns={columns}
          source={rows}
          editable
          resize={true}
          range={{ y: rows.length, x: columns.length }}
          style={{ width: '100%', height: '100%' }}
          onBeforeedit={handleEdit}
          onBeforeautofill={handleRangeEdit}
        />
      </div>
    </PageWrapper>
  );
}


// import { ReactGrid, NonEditableCell, NumberCell, TextCell} from "@silevis/reactgrid";
// import React, {useState} from "react";
// import PageWrapper from "../layout/PageWrapper";

// const styledRanges = [
//   {
//     range: { start: { rowIndex: 0, columnIndex: 1 }, end: { rowIndex: 1, columnIndex: 4 } },
//     styles: { background: "#55bc71", color: "white" },
//   },
//   {
//     range: { start: { rowIndex: 1, columnIndex: 0 }, end: { rowIndex: 4, columnIndex: 1 } },
//     styles: { background: "#55bc71", color: "white" },
//   },
//   {
//     range: { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 1, columnIndex: 1 } },
//     styles: { background: "#318146", color: "white" },
//   },
//   {
//     range: { start: { rowIndex: 3, columnIndex: 1 }, end: { rowIndex: 4, columnIndex: 4 } },
//     styles: { background: "#f8f8f8" },
//   },
//   {
//     range: { start: { rowIndex: 1, columnIndex: 3 }, end: { rowIndex: 3, columnIndex: 4 } },
//     styles: { background: "#f8f8f8" },
//   },
// ];

// export const About = () => {
//     const [yearsData, setYearsData] = useState([
//     { label: "2023", values: [1, 3] },
//     { label: "2024", values: [1, 4] },
//   ]);

//   // [{ label: "2023", values: [1, 3, 4] }, { label: "2024", values: [2, 4, 6] }]
//   const yearsDataWithTotals = yearsData.map((year) => ({
//     ...year,
//     values: [...year.values, year.values.reduce((sum, value) => sum + value, 0)],
//   }));

//   console.log(yearsDataWithTotals)

//   // { label: "Sum", values: [3, 7, 10] }
//   const summaryRow = {
//     label: "Sum",
//     values: yearsDataWithTotals.reduce(
//       (sum, year) => sum.map((currentSum, index) => currentSum + year.values[index]),
//       [0, 0, 0]
//     ),
//   };


//   const cells = [
//     // Header cells
//     { rowIndex: 0, colIndex: 0, Template: NonEditableCell, props: { value: "" } },
//     { rowIndex: 0, colIndex: 1, Template: NonEditableCell, props: { value: "H1" } },
//     { rowIndex: 0, colIndex: 2, Template: NonEditableCell, props: { value: "H2" } },
//     { rowIndex: 0, colIndex: 3, Template: NonEditableCell, props: { value: "Total" } },
//     // Year data cells
//     ...yearsDataWithTotals
//       .map((year, rowIndex) => [
//         { rowIndex: rowIndex + 1, colIndex: 0, Template: NonEditableCell, props: { value: year.label } },
//         ...year.values.map((value, colIndex) => {
//           // Last column is not editable
//           const isEditable = colIndex + 1 !== year.values.length; 
//           return {
//             rowIndex: rowIndex + 1,
//             colIndex: colIndex + 1,
//             Template: !isEditable ? NonEditableCell : NumberCell,
//             props: {
//               value,
//               ...(isEditable && {
//                 onValueChanged: (newValue) => {
//                   setYearsData((prev) => {
//                     const updatedYears = [...prev];
//                     updatedYears[rowIndex].values[colIndex] = newValue;
//                     return updatedYears;
//                   });
//                 },
//               }),
//             },
//           };
//         }),
//       ])
//       .flat(),
//     // Summary row
//     {
//       rowIndex: yearsDataWithTotals.length + 1,
//       colIndex: 0,
//       Template: NonEditableCell,
//       props: { value: summaryRow.label },
//     },
//     ...summaryRow.values.map((value, colIndex) => ({
//       rowIndex: yearsDataWithTotals.length + 1,
//       colIndex: colIndex + 1,
//       Template: NonEditableCell,
//       props: { value },
//     })),
//   ];

//   return (
//     <PageWrapper>
//       <div className="flex justify-center align-middle">
//       <ReactGrid cells={cells} styledRanges={styledRanges} style={{ width: '100%', height: '100%' }}/>
//       </div>
//     </PageWrapper>
//   )
// };
