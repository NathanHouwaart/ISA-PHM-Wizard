
// import React from "react";
// import ReactDOM from "react-dom/client";
// import ProfilePicture from "./ProfilePicture";

// import Navbar from "./components/Navbar";
// import { Routes } from "react-router-dom";
// import { Route } from "react-router-dom";
// import { QuestionnaireFormProvider } from "./contexts/QuestionnaireFormContext";


// import { About, Contact, Home, Services} from "./pages";

// function App() {
//   return (
//     <div className="App">
//       <Navbar />
//       <QuestionnaireFormProvider>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/about" element={<About />} />
//         <Route path="/services" element={<Services />} />
//         <Route path="/contact" element={<Contact />} />
//       </Routes>
//       </QuestionnaireFormProvider>
//     </div>
//   );
// }

// // <ProfilePicture image={"../../assets/avatar-img.jpg"} altText={"Profile picture"} width={100} height={100}/>

// export default App;

import React, { useState, useEffect } from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import $RefParser, { resolve } from '@apidevtools/json-schema-ref-parser';

// let parser = new $RefParser();

// parser.schema; // => null

// let schema = await parser.dereference("investigation_schema.json", {
//   resolve: {
//     file : false,
//     http: true
//   }
// });
// console.log(schema)
// typeof parser.schema; // => "object"

// schema === parser.schema; // => true


// You might put SchemaConverter in its own file (e.g., SchemaConverter.js)
// For this example, it's kept in App.js for brevity.

function SchemaConverter({ schema, allSchemas }) {
  const [jsonData, setJsonData] = useState(null);

  useEffect(() => {
    if (schema && allSchemas) {
      setJsonData(convertSchemaToJson(schema, allSchemas));
    }
  }, [schema, allSchemas]);

  const resolveRef = (refPath, schemas) => {
    // Example refPath: "study_schema.json#" or "#ref": "ontology_reference_schema.json#"
    // We need to handle both "$ref" and "#ref" based on your provided schemas
    const cleanedRefPath = refPath.startsWith('#') ? refPath.substring(1) : refPath; // Remove leading '#' if present
    const parts = cleanedRefPath.split('#');
    const fileName = parts[0]; // "study_schema.json" or "ontology_reference_schema.json"

    // The key in the 'schemas' object should be the filename without the path
    return schemas[fileName];
  };

  const convertSchemaToJson = (currentSchema, schemas) => {
    let data = {};

    console.log("here")

    if (currentSchema.type === 'object' && currentSchema.properties) {
      for (const key in currentSchema.properties) {
        const property = currentSchema.properties[key];

        // Check for "$ref" (standard JSON Schema) or "#ref" (seen in your person_schema.json)
        if (property.$ref || property['#ref']) {
          const refToResolve = property.$ref || property['#ref'];
          const referencedSchema = resolveRef(refToResolve, schemas);

          if (referencedSchema) {
            // If it's an array with referenced items
            if (currentSchema.properties[key].type === 'array') {
                data[key] = [convertSchemaToJson(referencedSchema, schemas)];
            } else {
                // If it's a direct $ref to an object
                data[key] = convertSchemaToJson(referencedSchema, schemas);
            }
          } else {
            console.warn(`Could not resolve $ref: ${refToResolve}. Check if schema is provided or name is correct.`);
            data[key] = {}; // Fallback to empty object if ref not found
          }
        } else if (property.type === 'string') {
          data[key] = ""; // Default empty string
        } else if (property.type === 'number' || property.type === 'integer') {
          data[key] = 0; // Default zero
        } else if (property.type === 'boolean') {
          data[key] = false; // Default false
        } else if (property.type === 'array') {
          if (property.items) {
            // Check if array items have a $ref
            if (property.items.$ref || property.items['#ref']) {
                const refToResolve = property.items.$ref || property.items['#ref'];
                const itemReferencedSchema = resolveRef(refToResolve, schemas);
                if (itemReferencedSchema) {
                    data[key] = [convertSchemaToJson(itemReferencedSchema, schemas)];
                } else {
                    console.warn(`Could not resolve $ref for array items: ${refToResolve}. Check if schema is provided or name is correct.`);
                    data[key] = [];
                }
            } else if (property.items.type === 'object') {
                // If array items are inline objects
                data[key] = [convertSchemaToJson(property.items, schemas)];
            } else if (property.items.type) {
                // If array items are primitive types (e.g., string, number)
                if (property.items.type === 'string') data[key] = [""];
                else if (property.items.type === 'number' || property.items.type === 'integer') data[key] = [0];
                else if (property.items.type === 'boolean') data[key] = [false];
                else data[key] = []; // Fallback
            } else {
                data[key] = []; // Default empty array if no specific item type
            }
          } else {
              data[key] = []; // Default empty array if no items property
          }
        } else if (property.type === 'object') {
          data[key] = convertSchemaToJson(property, schemas); // Recursively convert nested objects
        }
      }
    }
    // Handle enum types directly if present on the current schema level
    if (currentSchema.enum && currentSchema.enum.length > 0) {
        // For enum, pick the first value as a default
        return currentSchema.enum[0];
    }
    console.log(data)
    return data;
  };

  return (
    <div>
      <h3>Generated JSON Data:</h3>
      <pre>{JSON.stringify(jsonData, null, 2)}</pre>
    </div>
  );
}

function App() {
  const [investigationSchema, setInvestigationSchema] = useState(null);
  const [allSchemas, setAllSchemas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const schemaFiles = [
          "schemas/analysis_schema.json",
          "schemas/assay_run_schema.json",
          "schemas/biomaterial_object_schema.json",
          "schemas/digital_object_schema.json",
          "schemas/grant_schema.json",
          "schemas/identifier_info_schema.json",
          "schemas/investigation_schema.json",
          "schemas/license_schema.json",
          "schemas/material_object_schema.json",
          "schemas/node_schema.json",
          "schemas/organization_schema.json",
          "schemas/person_schema.json",
          "schemas/process_schema.json",
          "schemas/protocol_schema.json",
          "schemas/publication_schema.json",
          "schemas/qualitative_values_schema.json",
          "schemas/quantitative_values_schema.json",
          "schemas/resource_annotation_schema.json",
          "schemas/resource_reference_schema.json",
          "schemas/study_schema.json",
          "schemas/values_schema.json"
        ];

        const fetchedSchemas = {};
        for (const fileName of schemaFiles) {
          const response = await fetch(`${fileName}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
          }
          fetchedSchemas[fileName.split("/")[1]] = await response.json();
        }

        // Set the main investigation schema
        setInvestigationSchema(fetchedSchemas['investigation_schema.json']);

        // Create a simplified map for easier lookup in resolveRef
        const simplifiedSchemaMap = {};
        for (const fileName in fetchedSchemas) {
          simplifiedSchemaMap[fileName] = fetchedSchemas[fileName];
        }
        setAllSchemas(simplifiedSchemaMap);
        setLoading(false);

      } catch (err) {
        console.error("Error fetching schemas:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchSchemas();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return <div>Loading schemas...</div>;
  }

  if (error) {
    return <div>Error: {error.message}. Please ensure all schema files are in `public/schemas` and accessible.</div>;
  }
  
// function App(){
  return (
    <div className="App">
      {/* <Form schema={schema} validator={validator} /> */}
      <h1>JSON Schema to JSON Data Converter with Dynamic $ref Resolution</h1>
      {investigationSchema && (
        <SchemaConverter schema={investigationSchema} allSchemas={allSchemas} />
      )}
    </div>
  );
}

export default App;