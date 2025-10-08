import React from 'react';
import FormFieldShell from './FormFieldShell';
import AuthorsField from './fields/AuthorsField';
import LicenseField from './fields/LicenseField';
import MultiSelectField from './fields/MultiSelectField';
import SelectField from './fields/SelectField';
import TagsField from './fields/TagsField';
import TextareaField from './fields/TextareaField';
import TextInputField from './fields/TextInputField';

/**
 * FormField Component
 *
 * Universal orchestrator that renders the shared label/tooltip shell alongside
 * a concrete field renderer selected by `type`.
 *
 * @example
 * <FormField name="title" value={title} onChange={handleChange} label="Title" />
 */
const FIELD_RENDERERS = {
    textarea: TextareaField,
    select: SelectField,
    tags: TagsField,
    'multi-select': MultiSelectField,
    license: LicenseField,
    authors: AuthorsField,
};

const FormField = ({
    className = '',
    example,
    explanation,
    label,
    required,
    type = 'text',
    ...rest
}) => {
    const Renderer = FIELD_RENDERERS[type] ?? TextInputField;

    return (
        <FormFieldShell
            fieldType={type}
            label={label}
            required={required}
            explanation={explanation}
            example={example}
        >
            <Renderer {...rest} className={className} example={example} required={required} type={type} />
        </FormFieldShell>
    );
};

export default FormField;
