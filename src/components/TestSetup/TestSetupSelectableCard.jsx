import React from 'react';
import { Check } from 'lucide-react';
import TestSetupCard from './TestSetupCard';

/**
 * A small wrapper that renders a TestSetupCard and makes it selectable.
 * Props:
 * - item: the test setup object
 * - index: index in list (passed to TestSetupCard)
 * - isSelected: boolean whether this item is selected
 * - onSelect: callback when the card is clicked
 */
const TestSetupSelectableCard = ({ item, index, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`relative bg-white rounded-xl shadow-md border-2 cursor-pointer hover:shadow-lg transition-all duration-200 
        ${isSelected
          ? 'outline-blue-500 outline-5  border-transparent'
          : 'border-gray-200 hover:border-gray-300'
        }`}
    >
      {isSelected && (
        <div className="absolute bottom-4 right-4">
          <div className="bg-blue-500 text-white rounded-full p-1">
            <Check size={20} />
          </div>
        </div>
      )}

      <TestSetupCard item={item} index={index} isEditable={false} />
    </div>
  );
};

export default TestSetupSelectableCard;
