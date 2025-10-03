import React, { useEffect, useState } from 'react';
import DatasetPicker from './DatasetPicker';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

export default function DatasetSelectionOverlay({ onClose }) {
  const { selectedDataset } = useGlobalDataContext();
  const [visible, setVisible] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Close automatically when a dataset is selected
  useEffect(() => {
    if (selectedDataset) {
      // play fade-out then notify parent
      setVisible(false);
      const t = setTimeout(() => onClose && onClose(), 300);
      return () => clearTimeout(t);
    }
  }, [selectedDataset, onClose]);

  function handleSkip() {
    setVisible(false);
    setTimeout(() => onClose && onClose(), 300);
  }

  return (
    // backdrop
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!visible}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm" />

      <div className={`relative z-50 w-full max-w-2xl mx-4 transition-transform duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <h3 className="text-2xl font-semibold">Welcome to the ISA Questionnaire</h3>
          <p className="text-sm text-gray-600 mt-2">You can index a dataset now to make file selection easier later, or skip and continue without a dataset.</p>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                onClick={() => setShowPicker(true)}
              >
                Select dataset
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              >
                Skip for now
              </button>
            </div>

            <div className="text-xs text-gray-500">You can always choose a dataset later from the File Explorer.</div>
          </div>

          {showPicker && (
            <div className="mt-4">
              <DatasetPicker label="Index Root Folder" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
