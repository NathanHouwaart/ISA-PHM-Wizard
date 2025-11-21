import React, { useState } from 'react';
import { EXPERIMENT_TYPE_OPTIONS, getExperimentTypeConfig } from '../../constants/experimentTypes';
import { Activity, Repeat, Stethoscope, TrendingUp } from 'lucide-react';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from './TooltipButton';
import Z_INDEX from '../../constants/zIndex';

const ICON_MAP = {
    'diagnostic-single': Stethoscope,
    'rtf-single': Activity,
    'diagnostic-multi': Repeat,
    'rtf-multi': TrendingUp,
};

const ExperimentTypePickerDialog = ({ open, onClose, onConfirm, currentTypeId }) => {
    const [selectedTypeId, setSelectedTypeId] = useState(currentTypeId);

    if (!open) return null;

    const handleConfirm = () => {
        onConfirm?.(selectedTypeId);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.DIALOG }}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl p-6">
                <div>
                    <Heading3>Select Experiment Template</Heading3>
                    <Paragraph className="text-gray-600 mt-1">
                        Choose the template that best matches the way you recorded your data.
                    </Paragraph>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-6">
                    {EXPERIMENT_TYPE_OPTIONS.map((option) => {
                        const isSelected = option.id === selectedTypeId;
                        const Icon = ICON_MAP[option.id] || Activity;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelectedTypeId(option.id)}
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

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <TooltipButton
                        tooltipText="Cancel without changing"
                        onClick={onClose}
                        className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                    >
                        Cancel
                    </TooltipButton>
                    <TooltipButton
                        tooltipText="Apply selected experiment template"
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Apply
                    </TooltipButton>
                </div>
            </div>
        </div>
    );
};

export default ExperimentTypePickerDialog;
