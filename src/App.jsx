
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

// import React, { useState, useEffect } from 'react';
// import Form from '@rjsf/core';
// import validator from '@rjsf/validator-ajv8';


// // parser.schema; // => null

// // let schema = await parser.dereference("investigation_schema.json", {
// //   resolve: {
// //     file : false,
// //     http: true
// //   }
// // });
// // console.log(schema)
// // typeof parser.schema; // => "object"

// // schema === parser.schema; // => true


// // You might put SchemaConverter in its own file (e.g., SchemaConverter.js)
// // For this example, it's kept in App.js for brevity.

// function SchemaConverter({ schema, allSchemas }) {
//   const [jsonData, setJsonData] = useState(null);

//   useEffect(() => {
//     if (schema && allSchemas) {
//       setJsonData(convertSchemaToJson(schema, allSchemas));
//     }
//   }, [schema, allSchemas]);

//   const resolveRef = (refPath, schemas) => {
//     // Example refPath: "study_schema.json#" or "#ref": "ontology_reference_schema.json#"
//     // We need to handle both "$ref" and "#ref" based on your provided schemas
//     const cleanedRefPath = refPath.startsWith('#') ? refPath.substring(1) : refPath; // Remove leading '#' if present
//     const parts = cleanedRefPath.split('#');
//     const fileName = parts[0]; // "study_schema.json" or "ontology_reference_schema.json"

//     // The key in the 'schemas' object should be the filename without the path
//     return schemas[fileName];
//   };

//   const convertSchemaToJson = (currentSchema, schemas) => {
//     let data = {};

//     console.log("here")

//     if (currentSchema.type === 'object' && currentSchema.properties) {
//       for (const key in currentSchema.properties) {
//         const property = currentSchema.properties[key];

//         // Check for "$ref" (standard JSON Schema) or "#ref" (seen in your person_schema.json)
//         if (property.$ref || property['#ref']) {
//           const refToResolve = property.$ref || property['#ref'];
//           const referencedSchema = resolveRef(refToResolve, schemas);

//           if (referencedSchema) {
//             // If it's an array with referenced items
//             if (currentSchema.properties[key].type === 'array') {
//                 data[key] = [convertSchemaToJson(referencedSchema, schemas)];
//             } else {
//                 // If it's a direct $ref to an object
//                 data[key] = convertSchemaToJson(referencedSchema, schemas);
//             }
//           } else {
//             console.warn(`Could not resolve $ref: ${refToResolve}. Check if schema is provided or name is correct.`);
//             data[key] = {}; // Fallback to empty object if ref not found
//           }
//         } else if (property.type === 'string') {
//           data[key] = ""; // Default empty string
//         } else if (property.type === 'number' || property.type === 'integer') {
//           data[key] = 0; // Default zero
//         } else if (property.type === 'boolean') {
//           data[key] = false; // Default false
//         } else if (property.type === 'array') {
//           if (property.items) {
//             // Check if array items have a $ref
//             if (property.items.$ref || property.items['#ref']) {
//                 const refToResolve = property.items.$ref || property.items['#ref'];
//                 const itemReferencedSchema = resolveRef(refToResolve, schemas);
//                 if (itemReferencedSchema) {
//                     data[key] = [convertSchemaToJson(itemReferencedSchema, schemas)];
//                 } else {
//                     console.warn(`Could not resolve $ref for array items: ${refToResolve}. Check if schema is provided or name is correct.`);
//                     data[key] = [];
//                 }
//             } else if (property.items.type === 'object') {
//                 // If array items are inline objects
//                 data[key] = [convertSchemaToJson(property.items, schemas)];
//             } else if (property.items.type) {
//                 // If array items are primitive types (e.g., string, number)
//                 if (property.items.type === 'string') data[key] = [""];
//                 else if (property.items.type === 'number' || property.items.type === 'integer') data[key] = [0];
//                 else if (property.items.type === 'boolean') data[key] = [false];
//                 else data[key] = []; // Fallback
//             } else {
//                 data[key] = []; // Default empty array if no specific item type
//             }
//           } else {
//               data[key] = []; // Default empty array if no items property
//           }
//         } else if (property.type === 'object') {
//           data[key] = convertSchemaToJson(property, schemas); // Recursively convert nested objects
//         }
//       }
//     }
//     // Handle enum types directly if present on the current schema level
//     if (currentSchema.enum && currentSchema.enum.length > 0) {
//         // For enum, pick the first value as a default
//         return currentSchema.enum[0];
//     }
//     console.log(data)
//     return data;
//   };

//   return (
//     <div>
//       <h3>Generated JSON Data:</h3>
//       <pre>{JSON.stringify(jsonData, null, 2)}</pre>
//     </div>
//   );
// }

// import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
// import ComplexDataForm from './ComplexDataForm';
// import SchemaLoader from './SchemaLoader';

// // Initial data for the form
// const defaultValues = {
//   name: '',
//   email: '',
//   experiences: [
//     {
//       title: 'Senior Developer',
//       company: 'Acme Corp',
//       responsibilities: [
//         { description: 'Lead a team' },
//         { description: 'Architected solutions' }
//       ]
//     }
//   ]
// };

// function UserProfileForm() {
//   const {
//     control, // Essential for useFieldArray and Controller
//     register, // For basic inputs
//     handleSubmit,
//     formState: { errors }
//   } = useForm({
//     defaultValues
//   });

//   // useFieldArray for the 'experiences' array
//   const {
//     fields: experienceFields,
//     append: appendExperience,
//     remove: removeExperience
//   } = useFieldArray({
//     control,
//     name: 'experiences' // This is the name of your array field in the form data
//   });

//   // Handler for form submission
//   const onSubmit = (data) => {
//     console.log('Form Data:', data);
//     // You would typically send this data to your backend
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)}>
//       <h1>User Profile</h1>

//       {/* Basic fields */}
//       <label>
//         Name:
//         <input {...register('name', { required: 'Name is required' })} />
//         {errors.name && <p className="error">{errors.name.message}</p>}
//       </label>
//       <br />

//       <label>
//         Email:
//         <input
//           type="email"
//           {...register('email', { required: 'Email is required' })}
//         />
//         {errors.email && <p className="error">{errors.email.message}</p>}
//       </label>
//       <br />

//       <h2>Experiences</h2>
//       {experienceFields.map((experience, experienceIndex) => (
//         <div key={experience.id} className="experience-block">
//           {/* Fields for each experience object */}
//           <label>
//             Experience Title:
//             <input
//               {...register(`experiences.${experienceIndex}.title`, {
//                 required: 'Title is required'
//               })}
//             />
//             {errors.experiences?.[experienceIndex]?.title && (
//               <p className="error">
//                 {errors.experiences[experienceIndex].title.message}
//               </p>
//             )}
//           </label>
//           <br />

//           <label>
//             Company:
//             <input
//               {...register(`experiences.${experienceIndex}.company`, {
//                 required: 'Company is required'
//               })}
//             />
//             {errors.experiences?.[experienceIndex]?.company && (
//               <p className="error">
//                 {errors.experiences[experienceIndex].company.message}
//               </p>
//             )}
//           </label>
//           <br />

//           <h3>Responsibilities</h3>
//           {/* Nested useFieldArray for 'responsibilities' within each experience */}
//           <ExperienceResponsibilities
//             experienceIndex={experienceIndex}
//             control={control}
//             register={register}
//             errors={errors}
//           />

//           <button
//             type="button"
//             onClick={() => removeExperience(experienceIndex)}
//             style={{ marginTop: '10px' }}
//           >
//             Remove Experience
//           </button>
//           <hr />
//         </div>
//       ))}

//       <button
//         type="button"
//         onClick={() =>
//           appendExperience({ title: '', company: '', responsibilities: [] })
//         }
//       >
//         Add Experience
//       </button>

//       <br />
//       <br />
//       <button type="submit">Submit Form</button>

//       {/* Display current form data for debugging */}
//       <pre>{JSON.stringify(useWatch({ control }), null, 2)}</pre>
//     </form>
//   );
// }

// // Separate component for nested responsibilities array
// function ExperienceResponsibilities({ experienceIndex, control, register, errors }) {
//   const {
//     fields: responsibilityFields,
//     append: appendResponsibility,
//     remove: removeResponsibility
//   } = useFieldArray({
//     control,
//     name: `experiences.${experienceIndex}.responsibilities` // Dynamic name for nested array
//   });

//   return (
//     <div>
//       {responsibilityFields.map((responsibility, responsibilityIndex) => (
//         <div key={responsibility.id} style={{ marginLeft: '20px' }}>
//           <label>
//             Responsibility:
//             <input
//               {...register(
//                 `experiences.${experienceIndex}.responsibilities.${responsibilityIndex}.description`,
//                 { required: 'Description is required' }
//               )}
//             />
//             {errors.experiences?.[experienceIndex]?.responsibilities?.[responsibilityIndex]?.description && (
//               <p className="error">
//                 {errors.experiences[experienceIndex].responsibilities[responsibilityIndex].description.message}
//               </p>
//             )}
//           </label>
//           <button
//             type="button"
//             onClick={() => removeResponsibility(responsibilityIndex)}
//           >
//             Remove
//           </button>
//         </div>
//       ))}
//       <button type="button" onClick={() => appendResponsibility({ description: '' })}>
//         Add Responsibility
//       </button>
//     </div>
//   );
// }



// function App() {
//   const [investigationSchema, setInvestigationSchema] = useState(null);
//   const [allSchemas, setAllSchemas] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchSchemas = async () => {
//       try {
//         const schemaFiles = [
//           "schemas/analysis_schema.json",
//           "schemas/assay_run_schema.json",
//           "schemas/biomaterial_object_schema.json",
//           "schemas/digital_object_schema.json",
//           "schemas/grant_schema.json",
//           "schemas/identifier_info_schema.json",
//           "schemas/investigation_schema.json",
//           "schemas/license_schema.json",
//           "schemas/material_object_schema.json",
//           "schemas/node_schema.json",
//           "schemas/organization_schema.json",
//           "schemas/person_schema.json",
//           "schemas/process_schema.json",
//           "schemas/protocol_schema.json",
//           "schemas/publication_schema.json",
//           "schemas/qualitative_values_schema.json",
//           "schemas/quantitative_values_schema.json",
//           "schemas/resource_annotation_schema.json",
//           "schemas/resource_reference_schema.json",
//           "schemas/study_schema.json",
//           "schemas/values_schema.json"
//         ];

//         const fetchedSchemas = {};
//         for (const fileName of schemaFiles) {
//           const response = await fetch(`${fileName}`);
//           if (!response.ok) {
//             throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
//           }
//           fetchedSchemas[fileName.split("/")[1]] = await response.json();
//         }

//         // Set the main investigation schema
//         setInvestigationSchema(fetchedSchemas['investigation_schema.json']);

//         // Create a simplified map for easier lookup in resolveRef
//         const simplifiedSchemaMap = {};
//         for (const fileName in fetchedSchemas) {
//           simplifiedSchemaMap[fileName] = fetchedSchemas[fileName];
//         }
//         setAllSchemas(simplifiedSchemaMap);
//         setLoading(false);

//       } catch (err) {
//         console.error("Error fetching schemas:", err);
//         setError(err);
//         setLoading(false);
//       }
//     };

//     fetchSchemas();
//   }, []); // Empty dependency array means this runs once on mount

//   if (loading) {
//     return <div>Loading schemas...</div>;
//   }

//   if (error) {
//     return <div>Error: {error.message}. Please ensure all schema files are in `public/schemas` and accessible.</div>;
//   }
  
// // function App(){
//   return (
//     <div className="App">
//       {/* <Form schema={schema} validator={validator} /> */}
//       <h1>JSON Schema to JSON Data Converter with Dynamic $ref Resolution</h1>
//       {/* <UserProfileForm /> */}
//       <SchemaLoader />
//       {/* <ComplexDataForm /> */}
//       {/* {investigationSchema && (
//         <SchemaConverter schema={investigationSchema} allSchemas={allSchemas} />
//       )} */}
//     </div>
//   );
// }

// export default App;


// src/App.js (or a specific component)
import React, { useState, useEffect } from 'react';
import useFetchJson from './hooks/useFetchJson';
import RefParser from '@apidevtools/json-schema-ref-parser'; // We'll install this soon
import JsonViewer from './JsonViewer';

function App() {
  const [allSchemas, setAllSchemas] = useState({});
  const [dereferencedSchema, setDereferencedSchema] = useState(null);
  const [loadingSchemas, setLoadingSchemas] = useState(true);
  const [dereferencingError, setDereferencingError] = useState(null);

  const schemaFilePaths = [
    "schemas/assay_schema.json",
    "schemas/comment_schema.json",
    "schemas/data_schema.json",
    "schemas/factor_schema.json",
    "schemas/factor_value_schema.json",
    "schemas/investigation_schema.json",
    "schemas/material_attribute_schema.json",
    "schemas/material_attribute_value_schema.json",
    "schemas/material_schema.json",
    "schemas/ontology_annotation_schema.json",
    "schemas/ontology_source_reference_schema.json",
    "schemas/person_schema.json",
    "schemas/process_parameter_value_schema.json",
    "schemas/process_schema.json",
    "schemas/protocol_component_schema.json",
    "schemas/protocol_parameter_schema.json",
    "schemas/protocol_schema.json",
    "schemas/publication_schema.json",
    "schemas/sample_schema.json",
    "schemas/source_schema.json",
    "schemas/study_schema.json"
  ];

  // Fetch all schemas concurrently
  useEffect(() => {
    const fetchAllSchemas = async () => {
      try {
        const fetchedSchemas = await Promise.all(
          schemaFilePaths.map(async (path) => {
            const response = await fetch(path);
            if (!response.ok) {
              throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
            }
            return response.json();
          })
        );

        // Store schemas with their original paths as keys for dereferencing
        const schemasMap = {};
        schemaFilePaths.forEach((path, index) => {
          // You might need to adjust this key based on how your schemas reference each other.
          // Often, schemas use an '$id' property for their canonical URI.
          // For local files, a simple filename (or even full path) might suffice as a key.
          schemasMap[path.split("/")[1]] = fetchedSchemas[index];
        });

        setAllSchemas(schemasMap);
        setLoadingSchemas(false);
      } catch (error) {
        console.error("Error fetching schemas:", error);
        setDereferencingError("Error fetching schemas.");
        setLoadingSchemas(false);
      }
    };
    fetchAllSchemas();
  }, []);

  // Once all schemas are fetched, dereference them
  useEffect(() => {
    if (!loadingSchemas && Object.keys(allSchemas).length > 0) {
      const dereferenceSchemas = async () => {
        try {
          // RefParser can take a schema object or a path to the top schema.
          // When you pass a schema object, it will look for refs within that object.
          // If your top schema has relative refs to other schemas, you might need to
          // configure the parser to resolve them.
          // For `json-schema-ref-parser`, you can pass the collection of schemas
          // as the `external` option, or make sure your '$id's are correctly set up.
          
          // Let's assume 'topSchema.json' is the main entry point and has refs like 'commonTypes.json'
          // You'll need to construct the full path for references if they're not absolute URLs.
          // RefParser handles local files and relative paths well, assuming they are accessible.

          // For local files, it's often easiest if the '$id' in your schemas match the paths
          // you use to fetch them (e.g., "$id": "/schemas/commonTypes.json").
          
          // Here, we'll try to dereference the 'topSchema.json' by providing it directly.
          // RefParser will then attempt to resolve its internal $refs.
          // For it to resolve external files like 'commonTypes.json', those files also
          // need to be accessible via fetch.
          
          const parser = new RefParser();
          const dereferenced = await parser.dereference(allSchemas['investigation_schema.json'], {
            // Optional: configure resolver to look into the already fetched schemas
            // This is a more advanced usage and might require mapping schemas to their "$id"s
            // if your references use "$id"s instead of direct file paths.
            // Example for using 'resolve' option (conceptual, might need adjustments based on your $id structure):
            resolve: {
              file: {
                canRead: true, // Allow it to read files
                read(file) {
                  // If the file path matches one of our fetched schemas, return its content

                  const url = new URL(file.url);
                  const filename = url.pathname.split('/').pop();
                  
                  console.log(allSchemas)
                  console.log(filename)

                  if (allSchemas[filename]) {
                    return JSON.stringify(allSchemas[filename]);
                  }
                  // Fallback to default fetch for other URLs/files if needed
                  return fetch(file.url).then(response => response.text());
                }
              }
            }
          });
          setDereferencedSchema(dereferenced);
        } catch (error) {
          console.error("Error dereferencing schemas:", error);
          setDereferencingError("Error dereferencing schemas.");
        }
      };
      dereferenceSchemas();
    }
  }, [loadingSchemas, allSchemas]); // Re-run when schemas are loaded

  if (loadingSchemas) {
    return <div>Loading schemas...</div>;
  }

  if (dereferencingError) {
    return <div>Error: {dereferencingError}</div>;
  }

  return (
    <div>
      <h1>Dereferenced JSON Schema</h1>
      {dereferencedSchema ? (
        <JsonViewer data={dereferencedSchema} />
      ) : (
        <div>No dereferenced schema available.</div>
      )}
    </div>
  );
}

export default App;