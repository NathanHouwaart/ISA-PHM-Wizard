import React from 'react';
import { Switch } from '../ui/Switch';
import { cn } from '../../utils/utils';

const ToggleField = ({
  label,
  description,
  checked,
  onCheckedChange,
  ariaLabel,
  className = ''
}) => (
  <div className={cn('space-y-2', className)}>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="flex h-[42px] items-center justify-between rounded-lg border border-gray-300 px-3">
      <span className="text-sm text-gray-600">{checked ? 'Yes' : 'No'}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel || label}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:hover:bg-blue-700"
      />
    </div>
    {description && <p className="text-xs text-gray-500">{description}</p>}
  </div>
);

export default ToggleField;
