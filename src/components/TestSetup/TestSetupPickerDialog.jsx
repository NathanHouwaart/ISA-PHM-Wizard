import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useFuseSearch from '../../hooks/useFuseSearch';
import FormField from '../Form/FormField';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import IconTooltipButton from '../Widgets/IconTooltipButton';
import TestSetupSelectableCard from './TestSetupSelectableCard';

/**
 * TestSetupPickerDialog
 *
 * Lightweight modal that mirrors the Test Setup Selection slide.
 * Provides search and selection of test setups without leaving the sessions modal.
 */
const TestSetupPickerDialog = ({
  open,
  onClose,
  onConfirm,
  testSetups = [],
  selectedSetupId = null,
}) => {
  const initialItems = useMemo(() => (Array.isArray(testSetups) ? testSetups : []), [testSetups]);
  const { query, setQuery, results } = useFuseSearch(initialItems, ['name', 'location'], {
    threshold: 0.1,
    limit: 50,
    debounce: 120,
  });
  const [activeSetupId, setActiveSetupId] = useState(selectedSetupId ?? null);

  useEffect(() => {
    if (!open) return undefined;

    setActiveSetupId(selectedSetupId ?? null);
    setQuery('');

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedSetupId, setQuery, onClose]);

  if (!open) return null;

  const visibleItems = results.length > 0 ? results : initialItems;

  const handleConfirm = () => {
    if (!activeSetupId) return;
    onConfirm?.(activeSetupId);
  };

  const modal = (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300`} />
      <div className="relative z-[91] w-full max-w-6xl flex flex-col" style={{ maxHeight: 'calc(100vh - 32px)' }}>
        <div
          className={`bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 transform transition-all duration-300 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} flex flex-col overflow-hidden`}
          style={{ height: '80vh', maxHeight: '80vh' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <Heading3 className="text-lg font-semibold">Test setup selection</Heading3>
              <Paragraph className="text-gray-600 mt-2 max-w-xl">
                Search and select the test setup associated with this project. The content mirrors the Test Setup Selection step in the ISA questionnaire.
              </Paragraph>
            </div>
            <IconTooltipButton
              icon={X}
              tooltipText="Close test setup picker"
              onClick={() => onClose?.()}
              data-testid="testsetup-picker-close-btn"
            />
          </div>

          <div className="mt-6 flex-1 flex flex-col space-y-4 overflow-hidden">
            <FormField
              name="project-testsetup-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for Test Setups..."
              className="m-2"
            />
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 gap-3 m-1">
                {visibleItems.length > 0 ? (
                  visibleItems.map((setup, index) => (
                    <TestSetupSelectableCard
                      key={setup.id}
                      item={setup}
                      index={index}
                      isSelected={activeSetupId === setup.id}
                      onSelect={() => setActiveSetupId(setup.id)}
                      className=""
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-gray-500">
                    <Paragraph>No test setups match your search.</Paragraph>
                    <TooltipButton
                      tooltipText="Clear search and show all test setups"
                      onClick={() => setQuery('')}
                      className="mt-4"
                    >
                      Reset search
                    </TooltipButton>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-100 pt-4 bg-white flex-shrink-0">
            <TooltipButton
              tooltipText="Close without making changes"
              onClick={() => onClose?.()}
              className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
            >
              Cancel
            </TooltipButton>
            <TooltipButton
              tooltipText="Assign the selected test setup to this project"
              onClick={handleConfirm}
              disabled={!activeSetupId}
              className={activeSetupId ? '' : 'opacity-60 cursor-not-allowed'}
            >
              Assign test setup
            </TooltipButton>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default TestSetupPickerDialog;
