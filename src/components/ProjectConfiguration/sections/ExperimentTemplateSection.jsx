import React from 'react';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';
import { EXPERIMENT_TYPE_OPTIONS } from '../../../constants/experimentTypes';
import { Activity, Repeat, Stethoscope, TrendingUp } from 'lucide-react';

const ICON_MAP = {
  'diagnostic-single': Stethoscope,
  'rtf-single': Activity,
  'diagnostic-multi': Repeat,
  'rtf-multi': TrendingUp,
};

const ExperimentTemplateSection = ({ selectedId, onSelect }) => {
  return (
    <div className="space-y-4">
      <Paragraph className="text-sm text-gray-600">
        Templates determine how many runs/files are expected per study.
      </Paragraph>
      <div className="grid gap-4 md:grid-cols-2">
        {EXPERIMENT_TYPE_OPTIONS.map((option) => {
          const Icon = ICON_MAP[option.id] || Repeat;
          const isSelected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect?.(option.id)}
              className={`text-left border rounded-2xl p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <Heading3 className="text-base text-gray-900">{option.title}</Heading3>
                </div>
                {isSelected && (
                  <span className="text-xs uppercase text-blue-700">Selected</span>
                )}
              </div>
              <Paragraph className="text-sm text-gray-600 mt-2">{option.subtitle}</Paragraph>
              <Paragraph className="text-xs text-gray-500 mt-2">{option.description}</Paragraph>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExperimentTemplateSection;
