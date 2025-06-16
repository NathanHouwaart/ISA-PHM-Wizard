// components/SchemaDrivenForm.jsx
import React, { useState, useEffect } from 'react';
import { loadSchemaAndResolveRefs, getResolvedSchema } from '../utils/schemaLoader';
import { createInitialData } from '../utils/dataGenerator';

function SchemaDrivenForm({ schemaPath }) {
    const [schema, setSchema] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadSchemas = async () => {
            try {
                setLoading(true);
                setError(null);
                const loadedSchema = await loadSchemaAndResolveRefs(schemaPath);
                setSchema(loadedSchema);
                setFormData(createInitialData(loadedSchema));
            } catch (err) {
                console.error("Failed to load or process schema:", err);
                setError(err.message || "An unknown error occurred loading schema.");
            } finally {
                setLoading(false);
            }
        };

        loadSchemas();
    }, [schemaPath]);

    if (loading) {
        return <div>Loading schema...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>Error: {error}</div>;
    }

    if (!schema || !formData) {
        return <div>No schema or form data available.</div>;
    }

    // --- Dynamic UI Rendering based on Schema ---
    const renderProperty = (propertyName, propertySchema, currentData, path = []) => {
        const fullPath = [...path, propertyName];
        const dataValue = currentData ? currentData[propertyName] : undefined;

        // Resolve $ref if present
        let effectiveSchema = propertySchema;
        if (propertySchema.$ref) {
            const resolvedUri = new URL(propertySchema.$ref, window.location.href).pathname;
            const refSchema = getResolvedSchema(resolvedUri);
            if (refSchema) {
                effectiveSchema = refSchema;
            } else {
                console.warn(`Could not resolve $ref for property ${propertyName}: ${propertySchema.$ref}`);
                return <div key={propertyName}>Error: Could not resolve schema for {propertyName}</div>;
            }
        }

        switch (effectiveSchema.type) {
            case 'string':
                return (
                    <div key={propertyName}>
                        <label htmlFor={fullPath.join('.')}>{effectiveSchema.title || propertyName}:</label>
                        <input
                            type={effectiveSchema.format === 'date-time' ? 'datetime-local' : 'text'}
                            id={fullPath.join('.')}
                            value={dataValue || ''}
                            onChange={(e) => {
                                // Simple update logic - needs to handle nested objects/arrays carefully
                                const newFormData = { ...formData };
                                let target = newFormData;
                                for (let i = 0; i < fullPath.length - 1; i++) {
                                    target = target[fullPath[i]];
                                }
                                target[propertyName] = e.target.value;
                                setFormData(newFormData);
                            }}
                        />
                        {effectiveSchema.description && <small>{effectiveSchema.description}</small>}
                    </div>
                );
            case 'number':
            case 'integer':
                return (
                    <div key={propertyName}>
                        <label htmlFor={fullPath.join('.')}>{effectiveSchema.title || propertyName}:</label>
                        <input
                            type="number"
                            id={fullPath.join('.')}
                            value={dataValue !== undefined ? dataValue : ''}
                            onChange={(e) => {
                                const newFormData = { ...formData };
                                let target = newFormData;
                                for (let i = 0; i < fullPath.length - 1; i++) {
                                    target = target[fullPath[i]];
                                }
                                target[propertyName] = Number(e.target.value);
                                setFormData(newFormData);
                            }}
                        />
                        {effectiveSchema.description && <small>{effectiveSchema.description}</small>}
                    </div>
                );
            case 'boolean':
                return (
                    <div key={propertyName}>
                        <label>
                            <input
                                type="checkbox"
                                checked={!!dataValue}
                                onChange={(e) => {
                                    const newFormData = { ...formData };
                                    let target = newFormData;
                                    for (let i = 0; i < fullPath.length - 1; i++) {
                                        target = target[fullPath[i]];
                                    }
                                    target[propertyName] = e.target.checked;
                                    setFormData(newFormData);
                                }}
                            />
                            {effectiveSchema.title || propertyName}
                        </label>
                        {effectiveSchema.description && <small>{effectiveSchema.description}</small>}
                    </div>
                );
            case 'object':
                return (
                    <fieldset key={propertyName} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
                        <legend>{effectiveSchema.title || propertyName}</legend>
                        {effectiveSchema.description && <p><small>{effectiveSchema.description}</small></p>}
                        {effectiveSchema.properties &&
                            Object.entries(effectiveSchema.properties).map(([key, propSchema]) =>
                                renderProperty(key, propSchema, dataValue, fullPath)
                            )}
                    </fieldset>
                );
            case 'array':
                // For arrays, you'll need to render items and provide add/remove functionality
                return (
                    <div key={propertyName}>
                        <h4>{effectiveSchema.title || propertyName} (Array)</h4>
                        {effectiveSchema.description && <p><small>{effectiveSchema.description}</small></p>}
                        {Array.isArray(dataValue) && dataValue.map((item, index) => (
                            <div key={`${propertyName}-${index}`} style={{ border: '1px dashed #eee', padding: '5px', margin: '5px 0' }}>
                                <h5>Item {index + 1}</h5>
                                {effectiveSchema.items && effectiveSchema.items.$ref
                                    ? renderProperty(index, effectiveSchema.items, dataValue, fullPath) // Render item based on its schema
                                    : (effectiveSchema.items && effectiveSchema.items.properties
                                        ? Object.entries(effectiveSchema.items.properties).map(([itemKey, itemSchema]) =>
                                            renderProperty(itemKey, itemSchema, item, [...fullPath, index])
                                        )
                                        : <p>No specific schema for array items or simple array (e.g., array of strings).</p>
                                    )
                                }
                                <button type="button" onClick={() => {
                                    const newFormData = { ...formData };
                                    let targetArray = newFormData;
                                    for (let i = 0; i < fullPath.length; i++) {
                                        targetArray = targetArray[fullPath[i]];
                                    }
                                    targetArray.splice(index, 1);
                                    setFormData(newFormData);
                                }}>Remove Item</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => {
                            const newFormData = { ...formData };
                            let targetArray = newFormData;
                            for (let i = 0; i < fullPath.length; i++) {
                                targetArray = targetArray[fullPath[i]];
                            }
                            // Create a new item based on the 'items' schema
                            const newItem = effectiveSchema.items ? createInitialData(effectiveSchema.items, effectiveSchema) : {};
                            targetArray.push(newItem);
                            setFormData(newFormData);
                        }}>Add {effectiveSchema.items?.title || "Item"}</button>
                    </div>
                );
            default:
                return <div key={propertyName}>Unsupported type for {propertyName}: {effectiveSchema.type}</div>;
        }
    };

    return (
        <div>
            <h2>{schema.title || "Dynamic Form"}</h2>
            <p>{schema.description}</p>

            <form>
                {schema.properties &&
                    Object.entries(schema.properties).map(([propertyName, propertySchema]) =>
                        renderProperty(propertyName, propertySchema, formData)
                    )}
            </form>

            <h3>Current Data (for debugging):</h3>
            <pre>{JSON.stringify(formData, null, 2)}</pre>
        </div>
    );
}

export default SchemaDrivenForm;