import React, { useMemo, useState, useEffect } from 'react';
import ProjectSectionDialog from './ProjectSectionDialog';
import ProjectTestSetupSection from './sections/ProjectTestSetupSection';
import { useProjectActions } from '../../contexts/GlobalDataContext';
import { getProjectTestSetupId } from '../../utils/projectMetadata';

const ProjectTestSetupDialog = ({ projectId, isOpen, onClose, onProjectMetaChange }) => {
  const { updateProjectTestSetupSelection } = useProjectActions();
  const currentId = useMemo(() => getProjectTestSetupId(projectId), [projectId]);
  const [selection, setSelection] = useState(currentId);

  useEffect(() => {
    if (isOpen) {
      setSelection(currentId);
    }
  }, [isOpen, currentId]);

  const handleConfirm = () => {
    updateProjectTestSetupSelection?.(projectId, selection ?? null);
    onProjectMetaChange?.(projectId);
    onClose?.();
  };

  return (
    <ProjectSectionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Save test setup"
      title="Test setup"
      description="Assign the test setup configuration associated with this project."
    >
      <ProjectTestSetupSection
        projectId={projectId}
        value={selection}
        onChange={setSelection}
      />
    </ProjectSectionDialog>
  );
};

export default ProjectTestSetupDialog;
