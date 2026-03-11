import React from 'react';
import FormField from '../../Form/FormField';
import Heading3 from '../../Typography/Heading3';

const BasicInfoSection = ({ formData, onFieldChange }) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      <div>
        <div className="p-2 flex justify-between items-center border-b border-b-gray-300">
          <Heading3>
            Basic Information
          </Heading3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FormField
          name="name"
          type="text"
          value={formData.name}
          label="Name"
          placeholder="Enter test setup name"
          onChange={onFieldChange}
          required
        />

        <FormField
          name="location"
          type="text"
          value={formData.location}
          label="Location"
          placeholder="Enter test setup location"
          onChange={onFieldChange}
          required
        />
      </div>

      <FormField
        name="experimentPreparationProtocolName"
        type="text"
        value={formData.experimentPreparationProtocolName}
        label="Experiment Preparation Protocol Name"
        placeholder="Enter experiment preparation protocol name"
        onChange={onFieldChange}
        explanation="Please specify a name for the preparation of the experiments."
        example="experiment preparation, simulation preparation or other"
        required
      />

      <FormField
        name="testSpecimenName"
        type="text"
        value={formData.testSpecimenName}
        label="Set-up or test specimen-name"
        placeholder="Enter Set-up or test specimen-name"
        onChange={onFieldChange}
        explanation="If multiple components are tested, please specify the name of the test set-up. If a particular component/part is tested, please name the part."
        example="Hydraulic pump test set-up (if >1 component in the set-up are being tested in the investigation) or “Bearing” / “Test specimen” (if only a specific component is being tested in the investigation)"
        required
      />

      <FormField
        name="description"
        type="textarea"
        value={formData.description}
        label="Description"
        placeholder="Enter a brief description of the test setup"
        onChange={onFieldChange}
        rows={4}
        className="min-h-20"
      />
    </div>
  );
};

export default BasicInfoSection;
