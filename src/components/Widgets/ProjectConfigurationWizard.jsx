import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from './TooltipButton';
import Z_INDEX from '../../constants/zIndex';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import {
  DEFAULT_EXPERIMENT_TYPE_ID
} from '../../constants/experimentTypes';
import {
  getProjectExperimentTypeId,
  getProjectTestSetupId,
  getProjectDatasetName
} from '../../utils/projectMetadata';
import ProjectNameSection from '../ProjectConfiguration/sections/ProjectNameSection';
import ExperimentTemplateSection from '../ProjectConfiguration/sections/ExperimentTemplateSection';
import ProjectDatasetSection from '../ProjectConfiguration/sections/ProjectDatasetSection';
import ProjectTestSetupSection from '../ProjectConfiguration/sections/ProjectTestSetupSection';

const steps = [
  { id: 'name', title: 'Project name', description: 'Give this project a recognizable name.' },
  { id: 'template', title: 'Experiment template', description: 'Select the type of experiment to be processed.' },
  { id: 'dataset', title: 'Dataset configuration', description: 'Index or remove the dataset associated with this project.' },
  { id: 'test', title: 'Test setup', description: 'Assign the applicable test setup.' },
];

const ProjectConfigurationWizard = ({
  open,
  onCancel,
  onComplete,
  projectId,
  initialStep = 0,
  onProjectMetaChange
}) => {
  const { projects = [] } = useProjectData();
  const { renameProject, updateProjectExperimentType, updateProjectTestSetupSelection } = useProjectActions();

  const targetProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const [activeStep, setActiveStep] = useState(initialStep);
  const [nameDraft, setNameDraft] = useState(targetProject?.name || '');
  const [templateDraft, setTemplateDraft] = useState(() => getProjectExperimentTypeId(projectId, DEFAULT_EXPERIMENT_TYPE_ID));
  const [setupDraft, setSetupDraft] = useState(() => getProjectTestSetupId(projectId));
  const [_datasetVersion, setDatasetVersion] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveStep(initialStep);
      setNameDraft(targetProject?.name || '');
      setTemplateDraft(getProjectExperimentTypeId(projectId, DEFAULT_EXPERIMENT_TYPE_ID));
      setSetupDraft(getProjectTestSetupId(projectId));
      setDatasetVersion((prev) => prev + 1); // force cached dataset refresh
    }
  }, [open, projectId, targetProject?.name, initialStep]);

  const cachedDatasetName = getProjectDatasetName(projectId);

  if (!open || !projectId) {
    return null;
  }

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const handleFinish = () => {
    if (nameDraft.trim() && nameDraft.trim() !== targetProject?.name) {
      renameProject?.(projectId, nameDraft.trim());
    }
    updateProjectExperimentType?.(projectId, templateDraft || DEFAULT_EXPERIMENT_TYPE_ID);
    updateProjectTestSetupSelection?.(projectId, setupDraft ?? null);
    onProjectMetaChange?.(projectId);
    onComplete?.();
  };

  const renderStepContent = () => {
    const stepId = steps[activeStep].id;
    switch (stepId) {
      case 'name':
        return (
          <ProjectNameSection
            value={nameDraft}
            onChange={setNameDraft}
          />
        );
      case 'template':
        return (
          <ExperimentTemplateSection
            selectedId={templateDraft}
            onSelect={setTemplateDraft}
          />
        );
      case 'dataset':
        return (
          <ProjectDatasetSection
            projectId={projectId}
            cachedName={cachedDatasetName}
            onDatasetChanged={() => {
              setDatasetVersion((prev) => prev + 1);
              onProjectMetaChange?.(projectId);
            }}
          />
        );
      case 'test':
      default:
        return (
          <ProjectTestSetupSection
            projectId={projectId}
            value={setupDraft}
            onChange={setSetupDraft}
          />
        );
    }
  };

  const canAdvance = steps[activeStep].id !== 'name' || nameDraft.trim().length > 0;

  const modal = (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl p-6 space-y-5">
        <div>
          <Heading3>Configure project</Heading3>
          <Paragraph className="text-gray-600 mt-1">
            Step {activeStep + 1} of {steps.length}: {steps[activeStep].title}
          </Paragraph>
          <Paragraph className="text-sm text-gray-500 mt-2">
            {steps[activeStep].description}
          </Paragraph>
        </div>

        <div className="mt-2 max-h-[65vh] overflow-y-auto pr-1">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <TooltipButton
            tooltipText="Close the wizard"
            onClick={handleCancel}
            className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
          >
            Cancel
          </TooltipButton>
          <div className="flex items-center gap-3">
            <TooltipButton
              tooltipText="Go to previous step"
              onClick={handleBack}
              disabled={activeStep === 0}
              className={`px-4 py-2 rounded-lg border ${activeStep === 0 ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
            >
              Back
            </TooltipButton>
            {activeStep < steps.length - 1 ? (
              <TooltipButton
                tooltipText={canAdvance ? 'Continue to next step' : 'Please enter a project name'}
                onClick={handleNext}
                disabled={!canAdvance}
                className={`px-4 py-2 rounded-lg ${canAdvance ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                Next
              </TooltipButton>
            ) : (
              <TooltipButton
                tooltipText="Finish configuration"
                onClick={handleFinish}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Finish
              </TooltipButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ProjectConfigurationWizard;
