import React, { useMemo } from 'react';
import ProjectSectionDialog from './ProjectSectionDialog';
import ProjectDatasetSection from './sections/ProjectDatasetSection';
import { getProjectDatasetName } from '../../utils/projectMetadata';

const ProjectDatasetDialog = ({ projectId, isOpen, onClose, onDatasetChanged }) => {
  const cachedName = useMemo(() => getProjectDatasetName(projectId), [projectId, isOpen]);

  return (
    <ProjectSectionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={null}
      title="Dataset management"
      description="Index or remove the dataset associated with this project."
    >
      <ProjectDatasetSection
        projectId={projectId}
        cachedName={cachedName}
        onDatasetChanged={() => {
          onDatasetChanged?.(projectId);
        }}
      />
    </ProjectSectionDialog>
  );
};

export default ProjectDatasetDialog;
