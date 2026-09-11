import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';

const SensorTypePickerDialog = ({ open, types = [], onSelect, onClose }) => {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Choose sensor type">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <Heading3 className="text-lg">Add Sensor</Heading3>
          <TooltipButton onClick={onClose} tooltipText="Close" className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md">
            <X className="h-4 w-4" />
          </TooltipButton>
        </div>
        <Paragraph className="mt-1 text-sm text-gray-600">Choose the sensor type for this new sensor.</Paragraph>
        <div className="mt-4 space-y-2">
          {types.map((sensorType) => (
            <button key={sensorType.id} type="button" onClick={() => onSelect(sensorType)} className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50">
              <span className="block font-medium text-gray-900">{sensorType.name}</span>
              <span className="mt-1 block text-xs text-gray-500">{[sensorType.measurementType, sensorType.technologyPlatform, sensorType.technologyType].filter(Boolean).join(' · ') || 'No specification'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SensorTypePickerDialog;
