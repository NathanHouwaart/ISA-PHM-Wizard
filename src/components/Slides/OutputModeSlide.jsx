import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Check, Cpu, Layers3 } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle, default as Paragraph } from '../Typography/Paragraph';
import WarningBanner from '../Widgets/WarningBanner';
import Heading3 from '../Typography/Heading3';
import useStudyOutputModeSelection from '../../hooks/useStudyOutputModeSelection';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '../ui/tooltip';
import { TOOLTIP_DELAY_MS } from '../../constants/ui';
import {
  OUTPUT_MODE_OPTIONS,
  OUTPUT_MODE_RAW_ONLY,
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_AND_PROCESSED,
  normalizeStudyOutputMode
} from '../../utils/studyOutputMode';

const MODE_META = {
  [OUTPUT_MODE_RAW_ONLY]: {
    label: 'Raw only',
    description: 'Only raw output is expected per sensor/run.',
    Icon: Activity,
  },
  [OUTPUT_MODE_PROCESSED_ONLY]: {
    label: 'Processed only',
    description: 'Raw mappings are disabled; processed mappings are required.',
    Icon: Cpu,
  },
  [OUTPUT_MODE_RAW_AND_PROCESSED]: {
    label: 'Raw + processed',
    description: 'Both raw and processed mappings are required.',
    Icon: Layers3,
  },
};

const OutputModeSlide = forwardRef(({ onHeightChange }, ref) => {
  const elementToObserveRef = useResizeObserver(onHeightChange);
  const combinedRef = useCombinedRefs(ref, elementToObserveRef);

  const { studies } = useProjectData();
  const { setStudies } = useProjectActions();
  const {
    selectedOutputModeByStudy,
    updateStudyOutputMode,
    updateAllStudyOutputModes
  } = useStudyOutputModeSelection({
    studies,
    setStudies,
  });

  const [selectedStudyId, setSelectedStudyId] = useState('');
  const [bulkMode, setBulkMode] = useState(OUTPUT_MODE_RAW_ONLY);

  const studiesWithMode = useMemo(() => {
    return (Array.isArray(studies) ? studies : []).map((study, index) => {
      const outputMode = normalizeStudyOutputMode(
        selectedOutputModeByStudy?.[study?.id] ?? study?.outputMode,
        OUTPUT_MODE_RAW_ONLY
      );
      const modeMeta = MODE_META[outputMode] || MODE_META[OUTPUT_MODE_RAW_ONLY];
      const runCount = Math.max(1, Number.parseInt(study?.runCount, 10) || 1);
      return {
        id: study?.id || `study-${index}`,
        studyId: study?.id,
        name: study?.name || `Study ${index + 1}`,
        outputMode,
        modeLabel: modeMeta.label,
        runCount,
      };
    });
  }, [studies, selectedOutputModeByStudy]);

  useEffect(() => {
    if (studiesWithMode.length === 0) {
      setSelectedStudyId('');
      return;
    }
    if (!selectedStudyId || !studiesWithMode.some((study) => study.id === selectedStudyId)) {
      setSelectedStudyId(studiesWithMode[0].id);
    }
  }, [selectedStudyId, studiesWithMode]);

  const selectedStudy = useMemo(
    () => studiesWithMode.find((study) => study.id === selectedStudyId) || studiesWithMode[0] || null,
    [selectedStudyId, studiesWithMode]
  );

  const selectedMode = selectedStudy?.outputMode || OUTPUT_MODE_RAW_ONLY;
  const rawRequired = selectedMode !== OUTPUT_MODE_PROCESSED_ONLY;
  const processedRequired = selectedMode !== OUTPUT_MODE_RAW_ONLY;

  const handleApplyAll = useCallback(() => {
    updateAllStudyOutputModes(bulkMode);
  }, [bulkMode, updateAllStudyOutputModes]);

  return (
    <div ref={combinedRef}>
      <SlidePageTitle>
        Study Output Mode
      </SlidePageTitle>

      <SlidePageSubtitle>
        Select whether each study has raw output, processed output, or both. This drives which fields are enabled on the raw and processed output slides.
      </SlidePageSubtitle>

      <div className="bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative space-y-4">
        {studiesWithMode.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Heading3 className="text-base text-gray-900">Quick Apply</Heading3>
                <Paragraph className="text-xs text-gray-500 mt-1">
                  Set one output mode for all studies in a single action.
                </Paragraph>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full md:w-auto">
                <select
                  aria-label="Bulk output mode"
                  className="w-full sm:w-56 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700"
                  value={bulkMode}
                  onChange={(event) => setBulkMode(event.target.value)}
                >
                  {OUTPUT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Tooltip delayDuration={TOOLTIP_DELAY_MS}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleApplyAll}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Apply to all studies
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-sm">Apply selected mode to all studies</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {studiesWithMode.length === 0 ? (
          <WarningBanner type="warning">
            <strong>No studies available.</strong>
            {' '}
            Add studies on Slide 5 before setting output mode.
          </WarningBanner>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 min-h-[45vh]">
            <div className="hidden lg:flex bg-white border border-gray-200 rounded-xl p-3 flex-col min-h-0">
              <Heading3 className="text-base text-gray-900">Studies</Heading3>
              <Paragraph className="text-xs text-gray-500 mt-1 mb-3">
                Select a study to edit its output requirements.
              </Paragraph>
              <div className="flex-1 overflow-y-auto space-y-2">
                {studiesWithMode.map((study) => {
                  const isActive = study.id === selectedStudy?.id;
                  return (
                    <Tooltip key={study.id} delayDuration={TOOLTIP_DELAY_MS}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setSelectedStudyId(study.id)}
                          className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                            isActive
                              ? 'border-blue-300 bg-blue-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {study.name}
                            </span>
                            {isActive && (
                              <span
                                aria-hidden
                                className="h-2 w-2 rounded-full bg-blue-600 shrink-0"
                              />
                            )}
                          </div>
                          <Paragraph className="text-xs text-gray-600 mt-1">
                            {study.runCount} run{study.runCount === 1 ? '' : 's'} | {study.modeLabel}
                          </Paragraph>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-sm">Select {study.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5 flex flex-col gap-4">
              <div className="lg:hidden">
                <label htmlFor="output-mode-study-select" className="block text-xs font-semibold text-gray-600 mb-1">
                  Study
                </label>
                <select
                  id="output-mode-study-select"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700"
                  value={selectedStudy?.id || ''}
                  onChange={(event) => setSelectedStudyId(event.target.value)}
                >
                  {studiesWithMode.map((study) => (
                    <option key={study.id} value={study.id}>
                      {study.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudy && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Heading3 className="text-xl text-gray-900">{selectedStudy.name}</Heading3>
                      <Paragraph className="text-sm text-gray-600 mt-1">
                        Choose what output data exists for this study.
                      </Paragraph>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-semibold shrink-0">
                      {selectedStudy.runCount} run{selectedStudy.runCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <Paragraph className="text-sm text-blue-800 font-medium">
                      Measurement protocol is always required.
                    </Paragraph>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {OUTPUT_MODE_OPTIONS.map((option) => {
                      const meta = MODE_META[option.value];
                      const Icon = meta?.Icon || Layers3;
                      const isSelected = selectedMode === option.value;
                      return (
                        <Tooltip key={option.value} delayDuration={TOOLTIP_DELAY_MS}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => updateStudyOutputMode(selectedStudy.studyId, option.value)}
                              className={`relative text-left border rounded-2xl p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              {isSelected && (
                                <span
                                  aria-hidden
                                  className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                                >
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                              <div className="flex items-center gap-3 pr-8">
                                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                  <Icon className="w-4 h-4" />
                                </span>
                                <Heading3 className="text-base text-gray-900">{option.label}</Heading3>
                              </div>
                              <Paragraph className="text-xs text-gray-600 mt-2">
                                {meta?.description}
                              </Paragraph>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-sm">Set mode to {option.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <Heading3 className="text-sm text-gray-900">Requirements Preview</Heading3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <Paragraph className="text-xs text-gray-500">Slide 10 - Raw mapping</Paragraph>
                        <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          rawRequired
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {rawRequired ? 'Required' : 'Disabled'}
                        </span>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <Paragraph className="text-xs text-gray-500">Slide 11 - Processed mapping</Paragraph>
                        <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          processedRequired
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {processedRequired ? 'Required' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

OutputModeSlide.displayName = 'Study Output Mode';

export default OutputModeSlide;
