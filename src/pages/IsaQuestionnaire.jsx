import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import "../styles.css";

// Hooks
import useCarouselNavigation from '../hooks/useCarouselNavigation';
import useDynamicHeightContainer from '../hooks/useDynamicHeightContainer';


import PageWrapper from '../layout/PageWrapper';
import { useLocation } from 'react-router-dom';

import { slides } from "../components/Slides/slides";
import SlideReloadOverlay from '../components/Slides/SlideReloadOverlay';
import { cn } from '../utils/utils';
import Heading1 from '../components/Typography/Heading1';
// ProjectSelector removed in favor of the single 'Change Project' button in the header
import { useProjectActions, useProjectData } from '../contexts/GlobalDataContext';
import useSubmitData from '../hooks/useSubmitData';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import TooltipButton from '../components/Widgets/TooltipButton';
import IconToolTipButton from '../components/Widgets/IconTooltipButton';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';
import InAppExplorer from '../components/Widgets/InAppExplorer';
import ProjectSessionsModal from '../components/Widgets/ProjectSessionsModal';
import Heading3 from '../components/Typography/Heading3';
import PreExportValidationPanel from '../components/Widgets/PreExportValidationPanel';
import { buildExportValidationReport } from '../utils/exportValidation';
import { waitForNextPaint } from '../utils/waitForNextPaint';

export const IsaQuestionnaire = () => {
  const totalPages = slides.length;

  const {
    currentPage,
    handleForward,
    handlePrevious,
    goToPage,
    isLastPage,
    translateXValue,
  } = useCarouselNavigation(totalPages);

  const {
    containerHeight,
    childRefs,
    handleChildHeightChange,
  } = useDynamicHeightContainer(currentPage, 400);

  const {
    pageTabStates,
    explorerOpen,
    currentProjectId,
    projects,
    investigation,
    contacts,
    studyVariables,
    selectedTestSetupId,
    testSetups,
    studies,
    selectedDataset,
    studyToStudyVariableMapping,
    studyToMeasurementProtocolSelection,
    studyToProcessingProtocolSelection,
    studyToSensorMeasurementMapping,
    studyToSensorProcessingMapping,
    experimentType,
  } = useProjectData();
  const { setScreenWidth, resolveExplorerSelection } = useProjectActions();
  const { submitData, isSubmitting, message, error, cancel, retry, clearError } = useSubmitData();

  // Overlay state management - all overlays follow the same conditional rendering pattern
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [isRemountingSlides, setIsRemountingSlides] = useState(false);
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [isFullValidationPending, setIsFullValidationPending] = useState(true);
  const [slidesKey, setSlidesKey] = useState(() => currentProjectId ? `slides-${currentProjectId}-${Date.now()}` : 'slides-none');
  const hasInitializedProjectRef = useRef(false);
  const overlayTimeoutRef = useRef(null);
  const keyUpdateTimeoutRef = useRef(null);
  const MIN_OVERLAY_DURATION = 250;
  
  // Handler: Close project sessions modal
  const handleSessionsModalClose = () => {
    setShowSessionsModal(false);
  };
  
  // Handler: Close explorer (cancel = resolve with null)
  const handleExplorerClose = () => {
    resolveExplorerSelection(null);
  };

  // Handler: Confirm explorer selection
  const handleExplorerSelect = (files) => {
    resolveExplorerSelection(files);
  };

  // Always show the sessions modal when navigating to this route so the user can pick a project.
  // This makes the selection explicit on every visit (reload or client-side navigation).
  const location = useLocation();
  useEffect(() => {
    setShowSessionsModal(true);
  }, [location.pathname]);

  // Set screen width based on persisted tab state for the active page and slide index.
  // Slides 0-6 (IntroductionSlide through OperatingConditionsSlide): tab-aware width
  //   - simple-view: max-w-5xl
  //   - grid-view: max-w-[100rem]
  // Slides 7+ (StudyVariableSlide onwards): always max-w-[100rem] for both simple and grid views
  useEffect(() => {
    const FIRST_WIDE_SLIDE_INDEX = 7; // StudyVariableSlide is at index 7

    if (currentPage >= FIRST_WIDE_SLIDE_INDEX) {
      // Always wide for slides from StudyVariableSlide onwards
      setScreenWidth('max-w-[100rem]');
    } else {
      // Tab-aware width for earlier slides (Introduction through OperatingConditionsSlide)
      const activeTab = pageTabStates?.[currentPage];
      if (activeTab === 'grid-view') {
        setScreenWidth('max-w-[100rem]');
      } else {
        setScreenWidth('max-w-5xl');
      }
    }
    
    // Reset to default width when component unmounts
    return () => {
      setScreenWidth('max-w-5xl');
    };
  }, [currentPage, pageTabStates, setScreenWidth]);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }

    if (!hasInitializedProjectRef.current) {
      hasInitializedProjectRef.current = true;
      return;
    }

    childRefs.current = [];
    setIsRemountingSlides(true);

    if (keyUpdateTimeoutRef.current) {
      clearTimeout(keyUpdateTimeoutRef.current);
    }
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }

    keyUpdateTimeoutRef.current = setTimeout(() => {
      setSlidesKey(`slides-${currentProjectId}-${Date.now()}`);
    }, 0);

    overlayTimeoutRef.current = setTimeout(() => {
      setIsRemountingSlides(false);
    }, MIN_OVERLAY_DURATION);

    return () => {
      if (keyUpdateTimeoutRef.current) {
        clearTimeout(keyUpdateTimeoutRef.current);
      }
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, [currentProjectId, childRefs]);

  const deferredInvestigation = useDeferredValue(investigation);
  const deferredContacts = useDeferredValue(contacts);
  const deferredStudyVariables = useDeferredValue(studyVariables);
  const deferredStudyVariableMappings = useDeferredValue(studyToStudyVariableMapping);
  const deferredStudies = useDeferredValue(studies);
  const deferredTestSetups = useDeferredValue(testSetups);
  const deferredSelectedTestSetupId = useDeferredValue(selectedTestSetupId);
  const deferredMeasurementProtocolSelection = useDeferredValue(studyToMeasurementProtocolSelection);
  const deferredProcessingProtocolSelection = useDeferredValue(studyToProcessingProtocolSelection);
  const deferredRawMappings = useDeferredValue(studyToSensorMeasurementMapping);
  const deferredProcessedMappings = useDeferredValue(studyToSensorProcessingMapping);
  const deferredSelectedDataset = useDeferredValue(selectedDataset);
  const deferredExperimentType = useDeferredValue(experimentType);

  const fastValidationReport = useMemo(() => buildExportValidationReport({
    investigation: deferredInvestigation,
    contacts: deferredContacts,
    studyVariables: deferredStudyVariables,
    studyToStudyVariableMapping: deferredStudyVariableMappings,
    studies: deferredStudies,
    testSetups: deferredTestSetups,
    selectedTestSetupId: deferredSelectedTestSetupId,
    studyToMeasurementProtocolSelection: deferredMeasurementProtocolSelection,
    studyToProcessingProtocolSelection: deferredProcessingProtocolSelection,
    studyToSensorMeasurementMapping: deferredRawMappings,
    studyToSensorProcessingMapping: deferredProcessedMappings,
    selectedDataset: deferredSelectedDataset,
    experimentType: deferredExperimentType,
  }, {
    // Keep per-edit checks fast; expensive dataset path/duplicate checks run
    // when opening details or converting.
    includePathChecks: false
  }), [
    deferredInvestigation,
    deferredContacts,
    deferredStudyVariables,
    deferredStudyVariableMappings,
    deferredStudies,
    deferredTestSetups,
    deferredSelectedTestSetupId,
    deferredMeasurementProtocolSelection,
    deferredProcessingProtocolSelection,
    deferredRawMappings,
    deferredProcessedMappings,
    deferredSelectedDataset,
    deferredExperimentType,
  ]);

  const [fullValidationReport, setFullValidationReport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    setIsFullValidationPending(true);

    const compute = () => {
      if (cancelled) return;
      const nextReport = buildExportValidationReport({
        investigation: deferredInvestigation,
        contacts: deferredContacts,
        studyVariables: deferredStudyVariables,
        studyToStudyVariableMapping: deferredStudyVariableMappings,
        studies: deferredStudies,
        testSetups: deferredTestSetups,
        selectedTestSetupId: deferredSelectedTestSetupId,
        studyToMeasurementProtocolSelection: deferredMeasurementProtocolSelection,
        studyToProcessingProtocolSelection: deferredProcessingProtocolSelection,
        studyToSensorMeasurementMapping: deferredRawMappings,
        studyToSensorProcessingMapping: deferredProcessedMappings,
        selectedDataset: deferredSelectedDataset,
        experimentType: deferredExperimentType,
      }, {
        includePathChecks: true
      });
      if (!cancelled) {
        setFullValidationReport(nextReport);
        setIsFullValidationPending(false);
      }
    };

    timeoutId = setTimeout(
      compute,
      showValidationPanel ? 0 : 350
    );

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    showValidationPanel,
    deferredInvestigation,
    deferredContacts,
    deferredStudyVariables,
    deferredStudyVariableMappings,
    deferredStudies,
    deferredTestSetups,
    deferredSelectedTestSetupId,
    deferredMeasurementProtocolSelection,
    deferredProcessingProtocolSelection,
    deferredRawMappings,
    deferredProcessedMappings,
    deferredSelectedDataset,
    deferredExperimentType
  ]);

  const expandedValidationReport = useMemo(() => {
    if (!showValidationPanel) return fullValidationReport || fastValidationReport;
    return fullValidationReport || buildExportValidationReport({
      investigation: deferredInvestigation,
      contacts: deferredContacts,
      studyVariables: deferredStudyVariables,
      studyToStudyVariableMapping: deferredStudyVariableMappings,
      studies: deferredStudies,
      testSetups: deferredTestSetups,
      selectedTestSetupId: deferredSelectedTestSetupId,
      studyToMeasurementProtocolSelection: deferredMeasurementProtocolSelection,
      studyToProcessingProtocolSelection: deferredProcessingProtocolSelection,
      studyToSensorMeasurementMapping: deferredRawMappings,
      studyToSensorProcessingMapping: deferredProcessedMappings,
      selectedDataset: deferredSelectedDataset,
      experimentType: deferredExperimentType,
    }, {
      includePathChecks: true
    });
  }, [
    showValidationPanel,
    fullValidationReport,
    fastValidationReport,
    deferredInvestigation,
    deferredContacts,
    deferredStudyVariables,
    deferredStudyVariableMappings,
    deferredStudies,
    deferredTestSetups,
    deferredSelectedTestSetupId,
    deferredMeasurementProtocolSelection,
    deferredProcessingProtocolSelection,
    deferredRawMappings,
    deferredProcessedMappings,
    deferredSelectedDataset,
    deferredExperimentType
  ]);

  const statusValidationReport = fullValidationReport || fastValidationReport;
  const hasBlockingValidationIssues = statusValidationReport?.hasBlockingErrors;
  const validationSummaryErrors = Number(statusValidationReport?.summary?.errors || 0);
  const validationSummaryWarnings = Number(statusValidationReport?.summary?.warnings || 0);

  const validationStatusMeta = useMemo(() => {
    if (
      isFullValidationPending
      && validationSummaryErrors === 0
      && validationSummaryWarnings === 0
    ) {
      return {
        icon: Loader2,
        iconClassName: 'text-blue-600 animate-spin',
        tooltipText: 'Refreshing pre-export checks...'
      };
    }

    if (validationSummaryErrors > 0) {
      return {
        icon: XCircle,
        iconClassName: 'text-red-600',
        tooltipText: `${validationSummaryErrors} blocking issue${validationSummaryErrors === 1 ? '' : 's'} found. Click to review.`
      };
    }

    if (validationSummaryWarnings > 0) {
      return {
        icon: AlertTriangle,
        iconClassName: 'text-yellow-600',
        tooltipText: `${validationSummaryWarnings} warning${validationSummaryWarnings === 1 ? '' : 's'} found. Click to review.`
      };
    }

    return {
      icon: CheckCircle2,
      iconClassName: 'text-emerald-600',
      tooltipText: 'Pre-export checks are clean. Click to view summary.'
    };
  }, [isFullValidationPending, validationSummaryErrors, validationSummaryWarnings]);

  const ValidationStatusIcon = validationStatusMeta.icon;

  const handleSubmit = async () => {
    if (isPreparingSubmit || isSubmitting) {
      return;
    }

    setIsPreparingSubmit(true);
    try {
      await waitForNextPaint();

      const liveValidationReport = buildExportValidationReport({
        investigation,
        contacts,
        studyVariables,
        studyToStudyVariableMapping,
        studies,
        testSetups,
        selectedTestSetupId,
        studyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
        studyToSensorMeasurementMapping,
        studyToSensorProcessingMapping,
        selectedDataset,
        experimentType,
      }, {
        includePathChecks: true
      });

      if (liveValidationReport?.hasBlockingErrors) {
        setShowValidationPanel(true);
        setShowValidationDetails(true);
        return;
      }

      submitData().catch(() => {
        // errors are displayed in overlay message; no additional alert needed
      });
    } finally {
      setIsPreparingSubmit(false);
    }
  };

  const isSubmitOverlayVisible = isPreparingSubmit || isSubmitting;
  const submitOverlayMessage = isPreparingSubmit ? 'Checking pre-export validation...' : message;
  const submitOverlayCancel = isSubmitting ? cancel : null;

  return (
    <PageWrapper>
      {/* All overlays follow consistent conditional rendering pattern with explicit handlers */}
      {isSubmitOverlayVisible && <LoadingOverlay message={submitOverlayMessage} onCancel={submitOverlayCancel} />}
      {error && <LoadingOverlay message={error.message || 'Submission failed'} isError onRetry={retry} onCancel={clearError} />}
      {showSessionsModal && <ProjectSessionsModal onClose={handleSessionsModalClose} />}
      {explorerOpen && <InAppExplorer onClose={handleExplorerClose} onSelect={handleExplorerSelect} />}

      <div className="relative">

        <div className="absolute top-0 right-0 z-50 flex items-center gap-2">
          {!showSessionsModal && (
            <>
              <div className="flex flex-col items-end max-w-[220px] mr-2">
                <div className="text-xs text-gray-500 truncate whitespace-nowrap">
                  {testSetups?.find(s => s.id === selectedTestSetupId)?.name || 'No test setup selected'}
                </div>
                <Heading3 className="text-sm text-gray-600 font-medium truncate whitespace-nowrap">
                  {projects.find(p => p.id === currentProjectId)?.name || 'No project selected'}
                </Heading3>
              </div>
              <IconToolTipButton
                icon={Layers}
                tooltipText="Open project/session chooser"
                onClick={() => setShowSessionsModal(true)}
                className=""
                aria-label="Change Project"
              />
            </>
          )}
        </div>

        <Heading1> ISA Questionnaire Form </Heading1>
      </div>

      <div className="flex justify-center items-center mb-1 gap-4">
        <TooltipButton
          onClick={handlePrevious}
          tooltipText={currentPage > 0 ? "Previous slide" : undefined}
          disabled={isRemountingSlides || currentPage === 0}
          className={cn(
            "p-2 rounded-full transition-colors duration-200",
            currentPage === 0
              ? "invisible"
              : "bg-blue-100 hover:bg-blue-200 text-blue-700"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </TooltipButton>

        <div className="flex">
          {slides.map((slide, index) => (
            <TooltipButton
              key={index}
              tooltipText={`${slide.displayName}`}
              onClick={() => goToPage(index)}
              disabled={isRemountingSlides}
              className={cn(
                "h-2 p-1.5 w-12 mx-1 rounded-full transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                index === currentPage
                  ? 'bg-blue-500'
                  : index < currentPage
                    ? 'bg-green-400'
                    : 'bg-gray-300'
              )}
            />
          ))}
        </div>

        <TooltipButton
          onClick={handleForward}
          tooltipText={!isLastPage(currentPage) ? "Next slide" : undefined}
          disabled={isRemountingSlides || isLastPage(currentPage)}
          className={cn(
            "p-2 rounded-full transition-colors duration-200",
            isLastPage(currentPage)
              ? "invisible"
              : "bg-blue-100 hover:bg-blue-200 text-blue-700"
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </TooltipButton>
      </div>

      <div className="space-y-6">
        {/* Main content - mark as inert when any overlay is visible */}
        <div 
          aria-hidden={showSessionsModal || explorerOpen} 
          className={showSessionsModal || explorerOpen ? 'pointer-events-none select-none opacity-60' : ''}
        >
          <div
            className="relative overflow-hidden transition-all duration-300 ease-in-out"
            aria-busy={isRemountingSlides}
          >
            <div
              key={slidesKey}
              aria-hidden={isRemountingSlides}
              className={cn(
                "flex transition-transform duration-500 ease-in-out",
                isRemountingSlides ? 'pointer-events-none' : ''
              )}
              style={{ transform: `translateX(${translateXValue}%)` }}
            >
              {slides.map((slide, index) => {
                const SlideComponent = slide;
                // Only fully render the current slide and its immediate neighbors
                const shouldRender = Math.abs(index - currentPage) <= 1;

                return (
                  <div key={index} className='w-full overflow-hidden flex-shrink-0'>
                    <div style={{ height: containerHeight, transition: 'height 0.35s' }}>
                      {shouldRender ? (
                        <SlideComponent
                          ref={el => (childRefs.current[index] = el)}
                          onHeightChange={handleChildHeightChange}
                          currentPage={currentPage}
                          pageIndex={index}
                        />
                      ) : (
                        // Lightweight placeholder keeps layout but avoids mounting heavy components
                        <div ref={el => (childRefs.current[index] = el)} style={{ width: '100%', height: '100%' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <SlideReloadOverlay isVisible={isRemountingSlides} animationMs={MIN_OVERLAY_DURATION - 100} />
          </div>
        </div>

        {showValidationPanel ? (
          <div className="mx-5">
            <PreExportValidationPanel
              report={expandedValidationReport}
              expanded={showValidationDetails}
              onToggle={() => setShowValidationDetails((value) => !value)}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-center space-x-4 mx-5">
          {/* Previous: always rendered but invisible/disabled on first page to reserve space */}
          <TooltipButton
            onClick={handlePrevious}
            tooltipText={currentPage > 0 ? "Go to previous page" : undefined}
            disabled={isRemountingSlides || currentPage === 0}
            aria-hidden={currentPage === 0}
            className={`text-center text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === 0 ? 'invisible' : ''}`}
          >
            <span className='w-30'>&lt; Previous</span>
          </TooltipButton>

          <div className="flex items-center gap-2">
            <TooltipButton
              tooltipText={hasBlockingValidationIssues ? 'Resolve blocking validation issues before converting' : 'Submit the form'}
              onClick={handleSubmit}
              disabled={hasBlockingValidationIssues || isPreparingSubmit || isSubmitting}
              className={cn(
                "py-2 px-4 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg disabled:cursor-not-allowed disabled:opacity-70",
                hasBlockingValidationIssues || isPreparingSubmit || isSubmitting
                  ? "bg-gray-400 hover:bg-gray-400"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 hover:shadow-xl"
              )}
            >
              <span className='w-56 sm:w-72 md:w-[23rem] text-center'>Convert to ISA-PHM</span>
            </TooltipButton>

            <IconToolTipButton
              icon={ValidationStatusIcon}
              size="md"
              tooltipText={validationStatusMeta.tooltipText}
              onClick={() => {
                setShowValidationPanel((isVisible) => {
                  const nextVisible = !isVisible;
                  if (nextVisible && hasBlockingValidationIssues) {
                    setShowValidationDetails(true);
                  }
                  return nextVisible;
                });
              }}
              className={cn(
                "h-10 w-10 rounded-lg shadow-lg",
                isFullValidationPending && validationSummaryErrors === 0 && validationSummaryWarnings === 0
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  : validationSummaryErrors > 0
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  : validationSummaryWarnings > 0
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              )}
              iconClassName="!text-white group-hover:!text-white"
              aria-label="Toggle pre-export validation summary"
            />
          </div>

          {/* Next: always rendered but invisible/disabled on last page to reserve space */}
          <TooltipButton
            onClick={handleForward}
            tooltipText={!isLastPage(currentPage) ? "Go to next page" : undefined}
            disabled={isRemountingSlides || isLastPage(currentPage)}
            aria-hidden={isLastPage(currentPage)}
            className={`text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${isLastPage(currentPage) ? 'invisible' : ''}`}
          >
            <span className='w-30'>{currentPage === 0 ? 'Start' : 'Next >'}</span>
          </TooltipButton>
        </div>
      </div>
    </PageWrapper>
  );
};

export default IsaQuestionnaire;
