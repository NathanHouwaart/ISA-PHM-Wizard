import React, { useState, useEffect } from 'react';
import ProjectSectionDialog from './ProjectSectionDialog';
import ProjectNameSection from './sections/ProjectNameSection';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';

const ProjectNameDialog = ({ projectId, isOpen, onClose }) => {
  const { projects = [] } = useProjectData();
  const { renameProject } = useProjectActions();
  const project = projects.find((p) => p.id === projectId);
  const [value, setValue] = useState(project?.name || '');

  useEffect(() => {
    setValue(project?.name || '');
  }, [projectId, project?.name, isOpen]);

  const handleConfirm = () => {
    if (!value.trim()) return;
    renameProject?.(projectId, value.trim());
    onClose?.();
  };

  return (
    <ProjectSectionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Save name"
      disableConfirm={!value.trim()}
      title="Rename project"
      description="Update the display name for this project session."
    >
      <ProjectNameSection value={value} onChange={setValue} />
    </ProjectSectionDialog>
  );
};

export default ProjectNameDialog;
