import React from 'react';
import FormField from '../../Form/FormField';

const ProjectNameSection = ({ value, onChange }) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Provide a descriptive name so you can quickly identify this project in the list.
      </p>
      <FormField
        name="project-name"
        label="Project name"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="e.g. Tool wear benchmark"
        required
      />
    </div>
  );
};

export default ProjectNameSection;
