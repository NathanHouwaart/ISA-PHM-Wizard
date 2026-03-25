import React, { forwardRef, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle, default as Paragraph } from '../Typography/Paragraph';
import FormField from '../Form/FormField';
import WarningBanner from '../Widgets/WarningBanner';
import Heading3 from '../Typography/Heading3';
import useStudyOutputModeSelection from '../../hooks/useStudyOutputModeSelection';
import {
  OUTPUT_MODE_OPTIONS,
  OUTPUT_MODE_RAW_ONLY,
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_AND_PROCESSED,
  normalizeStudyOutputMode
} from '../../utils/studyOutputMode';

const MODE_HINTS = {
  [OUTPUT_MODE_RAW_ONLY]: {
    raw: 'Required on Slide 9',
    processed: 'Disabled on Slide 10'
  },
  [OUTPUT_MODE_PROCESSED_ONLY]: {
    raw: 'Disabled on Slide 9',
    processed: 'Required on Slide 10'
  },
  [OUTPUT_MODE_RAW_AND_PROCESSED]: {
    raw: 'Required on Slide 9',
    processed: 'Required on Slide 10'
  },
};

const OutputModeSlide = forwardRef(({ onHeightChange }, ref) => {
  const elementToObserveRef = useResizeObserver(onHeightChange);
  const combinedRef = useCombinedRefs(ref, elementToObserveRef);

  const { studies } = useProjectData();
  const { setStudies } = useProjectActions();
  const { updateStudyOutputMode } = useStudyOutputModeSelection({
    studies,
    setStudies,
  });

  const studiesWithMode = useMemo(() => {
    return (Array.isArray(studies) ? studies : []).map((study, index) => {
      const outputMode = normalizeStudyOutputMode(study?.outputMode, OUTPUT_MODE_RAW_ONLY);
      const hints = MODE_HINTS[outputMode] || MODE_HINTS[OUTPUT_MODE_RAW_ONLY];
      const runCount = Math.max(1, Number.parseInt(study?.runCount, 10) || 1);
      return {
        id: study?.id || `study-${index}`,
        studyId: study?.id,
        name: study?.name || `Study ${index + 1}`,
        outputMode,
        runCount,
        rawHint: hints.raw,
        processedHint: hints.processed,
      };
    });
  }, [studies]);

  return (
    <div ref={combinedRef}>
      <SlidePageTitle>
        Study Output Mode
      </SlidePageTitle>

      <SlidePageSubtitle>
        Select whether each study has raw output, processed output, or both. This drives which fields are enabled on the raw and processed output slides.
      </SlidePageSubtitle>

      <div className="bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative space-y-3">
        <WarningBanner type="info" icon={AlertCircle}>
          <strong>Measurement protocol is always required.</strong>
          {' '}
          In <strong>Processed only</strong>, raw file cells are disabled on Slide 9, but the measurement protocol on Slide 9 is still mandatory.
          {' '}
          In <strong>Raw only</strong>, processing protocol and processed file cells are disabled on Slide 10.
        </WarningBanner>

        {studiesWithMode.length === 0 ? (
          <WarningBanner type="warning">
            <strong>No studies available.</strong>
            {' '}
            Add studies on Slide 5 before setting output mode.
          </WarningBanner>
        ) : (
          <div className="max-h-[45vh] overflow-y-auto space-y-3">
            {studiesWithMode.map((study) => (
              <div key={study.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2">
                  <Heading3 className="text-lg font-semibold text-gray-900">
                    {study.name}
                  </Heading3>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-semibold">
                    {study.runCount} run{study.runCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <FormField
                    type="select"
                    label="Output mode"
                    name={`study-${study.studyId}-output-mode`}
                    value={study.outputMode}
                    tags={OUTPUT_MODE_OPTIONS}
                    onChange={(event) => updateStudyOutputMode(study.studyId, event.target.value)}
                  />
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <Paragraph className="text-xs text-gray-500 mb-1">Slide 9 (Raw measurement output)</Paragraph>
                    <Paragraph className={`text-sm font-semibold ${study.outputMode === OUTPUT_MODE_PROCESSED_ONLY ? 'text-gray-500' : 'text-gray-800'}`}>
                      {study.rawHint}
                    </Paragraph>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <Paragraph className="text-xs text-gray-500 mb-1">Slide 10 (Processing output)</Paragraph>
                    <Paragraph className={`text-sm font-semibold ${study.outputMode === OUTPUT_MODE_RAW_ONLY ? 'text-gray-500' : 'text-gray-800'}`}>
                      {study.processedHint}
                    </Paragraph>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

OutputModeSlide.displayName = 'Study Output Mode';

export default OutputModeSlide;
