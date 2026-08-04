import React, { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Plus, Settings2, Trash2 } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';
import FormField from '../../Form/FormField';
import ToggleField from '../../Form/ToggleField';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';
import TableTooltip from '../../Widgets/TableTooltip';
import TooltipButton from '../../Widgets/TooltipButton';
import CommentEditor from './CommentEditor';
import { isReplaceableCharacteristic, setCharacteristicReplaceable } from '../../../utils/testSetupCharacteristics';

const getCharacteristicKey = (characteristic, index) => characteristic.id || `characteristic-${index}`;

const getCharacteristicSummary = (characteristic) => {
  if (isReplaceableCharacteristic(characteristic.isReplaceable)) {
    return characteristic.description || 'Replaceable component';
  }

  return [characteristic.value, characteristic.unit].filter(Boolean).join(' ') || 'No value specified';
};

const CharacteristicsEditor = ({ characteristics, onCharacteristicsChange }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(false);

  const selectedIndex = useMemo(
    () => characteristics.findIndex((characteristic, index) => (
      getCharacteristicKey(characteristic, index) === selectedId
    )),
    [characteristics, selectedId]
  );
  const selectedCharacteristic = selectedIndex >= 0 ? characteristics[selectedIndex] : null;

  useEffect(() => {
    const hasSelectedCharacteristic = characteristics.some((characteristic, index) => (
      getCharacteristicKey(characteristic, index) === selectedId
    ));

    if (hasSelectedCharacteristic) return;
    setSelectedId(characteristics.length ? getCharacteristicKey(characteristics[0], 0) : null);
  }, [characteristics, selectedId]);

  const addCharacteristic = () => {
    const characteristic = {
      id: uuid4(),
      category: '',
      value: '',
      unit: '',
      description: '',
      isReplaceable: false,
      comments: []
    };
    onCharacteristicsChange([...characteristics, characteristic]);
    setSelectedId(characteristic.id);
  };

  const updateCharacteristic = (field, value) => {
    if (selectedIndex < 0) return;

    onCharacteristicsChange(characteristics.map((characteristic, index) => (
      index === selectedIndex ? { ...characteristic, [field]: value } : characteristic
    )));
  };

  const updateReplaceable = (isReplaceable) => {
    if (selectedIndex < 0) return;

    onCharacteristicsChange(characteristics.map((characteristic, index) => (
      index === selectedIndex
        ? setCharacteristicReplaceable(characteristic, isReplaceable)
        : characteristic
    )));
  };

  const removeSelectedCharacteristic = () => {
    if (selectedIndex < 0) return;

    const nextCharacteristics = characteristics.filter((_, index) => index !== selectedIndex);
    const nextSelected = nextCharacteristics[selectedIndex] || nextCharacteristics[selectedIndex - 1];
    onCharacteristicsChange(nextCharacteristics);
    setSelectedId(nextSelected ? getCharacteristicKey(nextSelected, Math.min(selectedIndex, nextCharacteristics.length - 1)) : null);
  };

  const isReplaceable = isReplaceableCharacteristic(selectedCharacteristic?.isReplaceable);

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 pb-2">
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div>
            <Heading3 className="text-base">Characteristics</Heading3>
            <Paragraph className="mt-1 text-sm text-gray-600">
              Specify the test set-up characteristics and identify replaceable components.
            </Paragraph>
          </div>
          <TooltipButton
            onClick={() => setActiveTooltip((visible) => !visible)}
            tooltipText="Show characteristic field guidance"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <HelpCircle className="h-4 w-4" />
          </TooltipButton>
        </div>

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

        <div className="flex min-h-[28rem] flex-col md:flex-row">
          <aside className="w-full shrink-0 border-b border-gray-200 bg-white md:w-72 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <Heading3 className="text-base">Characteristics ({characteristics.length})</Heading3>
              <TooltipButton
                onClick={addCharacteristic}
                tooltipText="Add characteristic"
                className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                <Plus className="h-4 w-4" />
              </TooltipButton>
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto p-2 md:max-h-[32rem]">
              {characteristics.map((characteristic, index) => {
                const characteristicId = getCharacteristicKey(characteristic, index);
                const replaceable = isReplaceableCharacteristic(characteristic.isReplaceable);

                return (
                  <button
                    key={characteristicId}
                    type="button"
                    onClick={() => setSelectedId(characteristicId)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      characteristicId === selectedId
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="block truncate font-medium">
                      {characteristic.category || `Characteristic ${index + 1}`}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {getCharacteristicSummary(characteristic)}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      {replaceable && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                          Replaceable
                        </span>
                      )}
                      <span>{characteristic.comments?.length || 0} comments</span>
                    </span>
                  </button>
                );
              })}

              {characteristics.length === 0 && (
                <Paragraph className="px-2 py-5 text-sm text-gray-500">
                  No characteristics yet.
                </Paragraph>
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1 p-5">
            {!selectedCharacteristic ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <Settings2 className="mb-4 h-14 w-14 text-gray-300" />
                <Heading3>No characteristic selected</Heading3>
                <Paragraph className="mt-1 text-sm text-gray-600">
                  Add a characteristic to define the selected test setup.
                </Paragraph>
                <TooltipButton
                  onClick={addCharacteristic}
                  tooltipText="Add characteristic"
                  className="mt-4 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Characteristic</span>
                </TooltipButton>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Heading3 className="text-xl">Edit Characteristic</Heading3>
                    {isReplaceable && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Replaceable component
                      </span>
                    )}
                  </div>
                  <TooltipButton
                    onClick={removeSelectedCharacteristic}
                    tooltipText="Remove characteristic"
                    className="p-2 bg-rose-600 text-white hover:bg-rose-700 rounded-md"
                  >
                    <Trash2 className="h-4 w-4" />
                  </TooltipButton>
                </div>

                <section className="rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                    <Heading3 className="text-base">Characteristic Details</Heading3>
                    <Paragraph className="mt-1 text-sm text-gray-600">
                      Name the characteristic and indicate whether it is replaceable.
                    </Paragraph>
                  </div>
                  <div className="grid gap-4 p-4 md:grid-cols-3">
                    <FormField
                      name={`characteristic-${selectedIndex}-category`}
                      value={selectedCharacteristic.category || ''}
                      onChange={(event) => updateCharacteristic('category', event.target.value)}
                      label="Category"
                      type="text"
                      placeholder="Enter category"
                      className="md:col-span-2"
                    />
                    <ToggleField
                      label="Replaceable"
                      description="Define values and types in the questionnaire."
                      checked={isReplaceable}
                      onCheckedChange={updateReplaceable}
                      ariaLabel={`Mark characteristic ${selectedIndex + 1} as replaceable`}
                    />
                  </div>
                </section>

                <section className="rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                    <Heading3 className="text-base">
                      {isReplaceable ? 'Replaceable Component' : 'Characteristic Value'}
                    </Heading3>
                    <Paragraph className="mt-1 text-sm text-gray-600">
                      {isReplaceable
                        ? 'Describe the component that can be replaced.'
                        : 'Enter the measured or specified value and its unit.'}
                    </Paragraph>
                  </div>
                  <div className="p-4">
                    {isReplaceable ? (
                      <FormField
                        name={`characteristic-${selectedIndex}-description`}
                        value={selectedCharacteristic.description || ''}
                        onChange={(event) => updateCharacteristic('description', event.target.value)}
                        label="Replaceable Component Description"
                        type="textarea"
                        placeholder="Describe the component that can be replaced"
                        rows={3}
                        required
                      />
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          name={`characteristic-${selectedIndex}-value`}
                          value={selectedCharacteristic.value || ''}
                          onChange={(event) => updateCharacteristic('value', event.target.value)}
                          label="Value"
                          type="text"
                          placeholder="Enter value"
                        />
                        <FormField
                          name={`characteristic-${selectedIndex}-unit`}
                          value={selectedCharacteristic.unit || ''}
                          onChange={(event) => updateCharacteristic('unit', event.target.value)}
                          label="Unit"
                          type="text"
                          placeholder="Enter unit (optional)"
                        />
                      </div>
                    )}
                  </div>
                </section>

                <CommentEditor
                  comments={selectedCharacteristic.comments || []}
                  onCommentsChange={(comments) => updateCharacteristic('comments', comments)}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CharacteristicsEditor;
