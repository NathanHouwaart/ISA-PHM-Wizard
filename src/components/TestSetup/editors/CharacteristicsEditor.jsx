import React, { useState } from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import Heading3 from '../../Typography/Heading3';
import { v4 as uuid4 } from 'uuid';
import IconTooltipButton from '../../Widgets/IconTooltipButton';
import TableTooltip from '../../Widgets/TableTooltip';
import Paragraph from '../../Typography/Paragraph';
import CharacteristicCard from './CharacteristicCard';

const CharacteristicsEditor = ({ characteristics, onCharacteristicsChange }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(false);

  const addCharacteristic = () => {
    const newCharacteristic = {
      id: uuid4(),
      category: '',
      value: '',
      unit: '',
      comments: []
    };
    const newCharacteristics = [...characteristics, newCharacteristic];
    onCharacteristicsChange(newCharacteristics);
    setExpandedItems((prev) => new Set([...prev, newCharacteristics.length - 1]));
  };

  const updateCharacteristic = (index, field, value) => {
    const updatedCharacteristics = characteristics.map((char, i) =>
      i === index ? { ...char, [field]: value } : char
    );
    onCharacteristicsChange(updatedCharacteristics);
  };

  const removeCharacteristic = (index) => {
    const filteredCharacteristics = characteristics.filter((_, i) => i !== index);
    onCharacteristicsChange(filteredCharacteristics);

    setExpandedItems((prev) => {
      const newSet = new Set();
      Array.from(prev).forEach((i) => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const toggleExpanded = (index) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const updateComments = (charIndex, comments) => {
    updateCharacteristic(charIndex, 'comments', comments);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="p-2 mb-4 flex justify-between items-center border-b border-b-gray-300">
        <Heading3>
          Characteristics
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({characteristics.length} items)
          </span>
        </Heading3>

        <div className="flex items-center space-x-2">
          <IconTooltipButton
            icon={Plus}
            onClick={addCharacteristic}
            tooltipText="Add characteristic"
          />

          <IconTooltipButton
            icon={HelpCircle}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTooltip(!activeTooltip);
            }}
            tooltipText="Help"
          />
        </div>
      </div>

      <Paragraph className="px-2 pb-4 border-b border-gray-300 mb-3 text-sm text-gray-600">
        Specify details about the test set-up. Please also specify sensors and sensor details if they are only used to monitor operational conditions, if not used for fault detection (i.e. measure independent variables rather than dependent variables).
      </Paragraph>

      <div>
        <TableTooltip
          isVisible={activeTooltip}
          explanations={[
            <><b>Category:</b> Category of the characteristic you are describing</>,
            <><b>Value:</b> Value of the characteristic you are describing</>,
            <><b>Unit:</b> Unit of the characteristic you are describing (may be optional)</>
          ]}
          examples={[
            { category: 'Motor', value: 'WEG W21', unit: 'N/A' },
            { category: 'Motor Power', value: '2.2', unit: 'kW' },
            { category: 'Hydraulic Pump', value: 'Hydropack', unit: 'N/A' }
          ]}
        />
      </div>

      <div className="space-y-1">
        {characteristics.map((characteristic, index) => (
          <CharacteristicCard
            key={characteristic.id ?? `characteristic-${index}`}
            characteristic={characteristic}
            index={index}
            isExpanded={expandedItems.has(index)}
            onToggle={() => toggleExpanded(index)}
            onRemove={() => removeCharacteristic(index)}
            onUpdateField={(field, value) => updateCharacteristic(index, field, value)}
            onCommentsChange={(comments) => updateComments(index, comments)}
          />
        ))}

        {characteristics.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No characteristics added yet.</p>
            <p className="text-sm">Click "Add Characteristic" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacteristicsEditor;
