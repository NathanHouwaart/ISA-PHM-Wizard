import React from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';

// --- Initial Default Values (Crucial for useForm) ---
// This initial state should mirror your JSON structure,
// providing empty strings, empty arrays, or default objects.
const defaultValues = {
  identifier: '',
  title: '',
  description: '',
  submissionDate: '',
  publicReleaseDate: '',
  commentCreatedWithConfiguration: '',
  commentLastOpenedWithConfiguration: '',
  resourceReference: [
    {
      description: '',
      iri: '',
      version: '',
      name: '',
      resourceType: {
        name: '',
        annotation: {
          termSource: '',
          termAccession: ''
        }
      }
    }
  ],
  isaDocumentLicenses: [
    {
      name: '',
      identifierInfo: [{ identifier: '', identifierScheme: '' }],
      owners: [
        {
          lastName: '',
          firstName: '',
          email: [''], // Array of strings
          phone: '',
          affiliations: [{
            name: '',
            address: [''],
            roles: [{ role: '' }]
          }]
        }
      ]
    }
  ],
  publications: [], // Start with empty array for simplicity
  people: [],
  studies: []
};

// --- Reusable Components for Nested Structures ---

// Component for a single IdentifierInfo object
const IdentifierInfoForm = ({ namePath, control, register, errors }) => {
  return (
    <div className="indent-level-1">
      <label>Identifier:
        <input {...register(`${namePath}.identifier`)} />
        {/* Error display omitted for brevity but would follow the same pattern */}
      </label>
      <label>Scheme:
        <input {...register(`${namePath}.identifierScheme`)} />
      </label>
    </div>
  );
};

// Component for an array of IdentifierInfo
const IdentifierInfoArrayForm = ({ parentName, control, register, errors }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: parentName
  });

  return (
    <div className="indent-level-0">
      <h4>Identifier Info</h4>
      {fields.map((field, index) => (
        <div key={field.id} className="array-item">
          <IdentifierInfoForm
            namePath={`${parentName}.${index}`}
            control={control}
            register={register}
            errors={errors}
          />
          <button type="button" onClick={() => remove(index)}>Remove Identifier</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ identifier: '', identifierScheme: '' })}>Add Identifier</button>
    </div>
  );
};

// Component for a single Person object (reusable for owners, people, study.people)
const PersonForm = ({ namePath, control, register, errors }) => {
  // Nested useFieldArray for dynamic email and affiliation arrays
  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control,
    name: `${namePath}.email`
  });

  const { fields: affiliationFields, append: appendAffiliation, remove: removeAffiliation } = useFieldArray({
    control,
    name: `${namePath}.affiliations`
  });

  return (
    <div className="indent-level-1">
      <label>Last Name: <input {...register(`${namePath}.lastName`)} /></label><br/>
      <label>First Name: <input {...register(`${namePath}.firstName`)} /></label><br/>
      {/* Identifier Info Array for Person */}
      <IdentifierInfoArrayForm
        parentName={`${namePath}.identifierInfo`}
        control={control}
        register={register}
        errors={errors}
      />

      {/* Dynamic Email Array */}
      <h4>Emails</h4>
      {emailFields.map((email, emailIndex) => (
        <div key={email.id} className="array-item indent-level-2">
          <input {...register(`${namePath}.email.${emailIndex}`)} />
          <button type="button" onClick={() => removeEmail(emailIndex)}>Remove Email</button>
        </div>
      ))}
      <button type="button" onClick={() => appendEmail('')}>Add Email</button><br/>

      {/* Dynamic Affiliations Array */}
      <h4>Affiliations</h4>
      {affiliationFields.map((affiliation, affIndex) => (
        <div key={affiliation.id} className="array-item indent-level-2">
          <label>Affiliation Name: <input {...register(`${namePath}.affiliations.${affIndex}.name`)} /></label><br/>
          {/* Nested IdentifierInfo for affiliation */}
          <IdentifierInfoArrayForm
            parentName={`${namePath}.affiliations.${affIndex}.identifierInfo`}
            control={control}
            register={register}
            errors={errors}
          />
          {/* Roles (simplified for demo) */}
          <label>Affiliation Role: <input {...register(`${namePath}.affiliations.${affIndex}.roles.0.role`)} /></label><br/>
          <button type="button" onClick={() => removeAffiliation(affIndex)}>Remove Affiliation</button>
        </div>
      ))}
      <button type="button" onClick={() => appendAffiliation({ name: '', identifierInfo: [{identifier:'', identifierScheme:''}], address: [''], roles: [{ role: '' }] })}>Add Affiliation</button>
      {/* Other person fields like phone, fax, address, roles */}
    </div>
  );
};


// Component for a single ResourceReference object
const ResourceReferenceForm = ({ namePath, control, register, errors }) => {
  return (
    <div className="indent-level-1">
      <label>Description: <input {...register(`${namePath}.description`)} /></label><br/>
      <label>IRI: <input {...register(`${namePath}.iri`)} /></label><br/>
      <label>Version: <input {...register(`${namePath}.version`)} /></label><br/>
      <label>Name: <input {...register(`${namePath}.name`)} /></label><br/>
      <div className="indent-level-2">
        <h4>Resource Type</h4>
        <label>Type Name: <input {...register(`${namePath}.resourceType.name`)} /></label><br/>
        <label>Term Source: <input {...register(`${namePath}.resourceType.annotation.termSource`)} /></label><br/>
        <label>Term Accession: <input {...register(`${namePath}.resourceType.annotation.termAccession`)} /></label><br/>
      </div>
    </div>
  );
};

// Component for a single IsaDocumentLicense object
const IsaDocumentLicenseForm = ({ namePath, control, register, errors }) => {
  const { fields: ownerFields, append: appendOwner, remove: removeOwner } = useFieldArray({
    control,
    name: `${namePath}.owners`
  });

  return (
    <div className="indent-level-0">
      <label>License Name: <input {...register(`${namePath}.name`)} /></label><br/>
      <IdentifierInfoArrayForm
        parentName={`${namePath}.identifierInfo`}
        control={control}
        register={register}
        errors={errors}
      />
      <h4>Owners</h4>
      {ownerFields.map((owner, ownerIndex) => (
        <div key={owner.id} className="array-item indent-level-1">
          <PersonForm
            namePath={`${namePath}.owners.${ownerIndex}`}
            control={control}
            register={register}
            errors={errors}
          />
          <button type="button" onClick={() => removeOwner(ownerIndex)}>Remove Owner</button>
        </div>
      ))}
      <button type="button" onClick={() => appendOwner({
        lastName: '', firstName: '', email: [''], affiliations: [{ name: '', address: [''], roles: [{role:''}]}]
      })}>Add Owner</button>
    </div>
  );
};


// --- Main Form Component ---
function ComplexDataForm() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: defaultValues
  });

  // useFieldArray for top-level arrays
  const {
    fields: resourceReferenceFields,
    append: appendResourceReference,
    remove: removeResourceReference
  } = useFieldArray({ control, name: 'resourceReference' });

  const {
    fields: isaDocumentLicensesFields,
    append: appendIsaDocumentLicense,
    remove: removeIsaDocumentLicense
  } = useFieldArray({ control, name: 'isaDocumentLicenses' });

  // Example for 'publications' (simplified)
  const { fields: publicationFields, append: appendPublication, remove: removePublication } = useFieldArray({ control, name: 'publications' });


  const onSubmit = (data) => {
    console.log('Final Form Data:', JSON.stringify(data, null, 2));
    // Here you would typically send `data` to your API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>Complex Data Entry</h1>

      {/* --- Top-Level Fields --- */}
      <section>
        <h2>General Information</h2>
        <label>Identifier: <input {...register('identifier')} /></label><br/>
        <label>Title: <input {...register('title')} /></label><br/>
        <label>Description: <textarea {...register('description')} rows="3"></textarea></label><br/>
        <label>Submission Date: <input type="date" {...register('submissionDate')} /></label><br/>
        <label>Public Release Date: <input type="date" {...register('publicReleaseDate')} /></label><br/>
      </section>
      <hr/>

      {/* --- Resource References Array --- */}
      <section>
        <h2>Resource References</h2>
        {resourceReferenceFields.map((field, index) => (
          <div key={field.id} className="section-block">
            <h3>Resource Reference #{index + 1}</h3>
            <ResourceReferenceForm
              namePath={`resourceReference.${index}`}
              control={control}
              register={register}
              errors={errors}
            />
            <button type="button" onClick={() => removeResourceReference(index)}>Remove Resource Reference</button>
          </div>
        ))}
        <button type="button" onClick={() => appendResourceReference({
          description: '', iri: '', version: '', name: '',
          resourceType: { name: '', annotation: { termSource: '', termAccession: '' }}
        })}>Add Resource Reference</button>
      </section>
      <hr/>

      {/* --- ISA Document Licenses Array --- */}
      <section>
        <h2>ISA Document Licenses</h2>
        {isaDocumentLicensesFields.map((field, index) => (
          <div key={field.id} className="section-block">
            <h3>License #{index + 1}</h3>
            <IsaDocumentLicenseForm
              namePath={`isaDocumentLicenses.${index}`}
              control={control}
              register={register}
              errors={errors}
            />
            <button type="button" onClick={() => removeIsaDocumentLicense(index)}>Remove License</button>
          </div>
        ))}
        <button type="button" onClick={() => appendIsaDocumentLicense({
          name: '',
          identifierInfo: [{identifier: '', identifierScheme: ''}],
          owners: [{
            lastName: '', firstName: '', email: [''], affiliations: [{ name: '', address: [''], roles: [{role:''}]}]
          }]
        })}>Add ISA Document License</button>
      </section>
      <hr/>

      {/* --- Publications Array (Simplified Example) --- */}
      <section>
        <h2>Publications</h2>
        {publicationFields.map((field, index) => (
          <div key={field.id} className="section-block">
            <label>Publication Title: <input {...register(`publications.${index}.title`)} /></label><br/>
            <label>Author List: <input {...register(`publications.${index}.authorList`)} /></label><br/>
            {/* Add more publication fields and nested IdentifierInfo if needed */}
            <button type="button" onClick={() => removePublication(index)}>Remove Publication</button>
          </div>
        ))}
        <button type="button" onClick={() => appendPublication({
          identifierInfo: [{identifier: '', identifierScheme: ''}], authorList: '', title: '', status: '', statusAnnotation: {}
        })}>Add Publication</button>
      </section>
      <hr/>

      {/* --- Submit Button --- */}
      <button type="submit">Submit All Data</button>

      {/* --- Debugging Output (Shows live form state) --- */}
      <div style={{ marginTop: '20px', backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
        <h3>Current Form Data:</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(useWatch({ control }), null, 2)}
        </pre>
      </div>

      <style>{`
        .error { color: red; font-size: 0.8em; }
        label { display: block; margin-bottom: 5px; }
        input, textarea { width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; }
        button { margin-right: 10px; padding: 8px 15px; cursor: pointer; }
        .section-block { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 8px; background-color: #f9f9f9; }
        .array-item { border-left: 3px solid #007bff; padding-left: 10px; margin-bottom: 10px; background-color: #eaf6ff; }
        .indent-level-0 { margin-left: 0px; }
        .indent-level-1 { margin-left: 15px; }
        .indent-level-2 { margin-left: 30px; }
      `}</style>
    </form>
  );
}

export default ComplexDataForm;