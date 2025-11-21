import React, { useMemo, useState, useEffect } from 'react';
import ProjectSectionDialog from './ProjectSectionDialog';
import ExperimentTemplateSection from './sections/ExperimentTemplateSection';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { getProjectExperimentTypeId } from '../../utils/projectMetadata';
import { DEFAULT_EXPERIMENT_TYPE_ID } from '../../constants/experimentTypes';

const ProjectTemplateDialog = ({ projectId, isOpen, onClose, onProjectMetaChange }) => {
  const { updateProjectExperimentType } = useGlobalDataContext();
  const currentId = useMemo(
    () => getProjectExperimentTypeId(projectId, DEFAULT_EXPERIMENT_TYPE_ID),
    [projectId]
  );
  const [selection, setSelection] = useState(currentId);

  useEffect(() => {
    if (isOpen) {
      setSelection(currentId);
    }
  }, [isOpen, currentId]);

  const handleConfirm = () => {
    updateProjectExperimentType?.(projectId, selection || DEFAULT_EXPERIMENT_TYPE_ID);
    onProjectMetaChange?.(projectId);
    onClose?.();
  };

  return (
    <ProjectSectionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Save template"
      disableConfirm={!selection}
      title="Experiment template"
      description="Select the template that reflects how many runs/files each study in this project should contain."
    >
      <ExperimentTemplateSection
        selectedId={selection}
        onSelect={setSelection}
      />
    </ProjectSectionDialog>
  );
};

export default ProjectTemplateDialog;
