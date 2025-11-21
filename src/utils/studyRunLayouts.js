import { groupStudyRuns } from './studyRuns';

export const buildStudyRunGroups = (studies = [], studyRuns = []) => {
  const groups = groupStudyRuns(studyRuns);

  return studies.map((study, index) => {
    const runs = groups.get(study.id) || [];
    return {
      study,
      studyId: study.id,
      studyIndex: index,
      displayLabel: study.name || `Study ${index + 1}`,
      runs,
    };
  });
};

export const buildStudyRunRowData = (studies = [], studyRuns = []) => {
  const grouped = buildStudyRunGroups(studies, studyRuns);

  return grouped.flatMap((group, groupIndex) => {
    const isLastStudy = groupIndex === grouped.length - 1;
    
    if (!group.runs.length) {
      const fallbackId = group.study?.id || `study-${group.studyIndex}`;
      return [{
        ...group.study,
        id: fallbackId,
        runId: fallbackId,
        studyId: group.study?.id,
        studyDisplayIndex: group.studyIndex + 1,
        studyDisplayName: group.displayLabel,
        runNumber: 1,
        runLabel: 'Run 1',
        showStudyLabel: true,
        isLastRunInStudy: !isLastStudy,
      }];
    }

    return group.runs.map((run, runIndex) => ({
      ...run,
      id: run.id || run.runId,
      studyDisplayIndex: group.studyIndex + 1,
      studyDisplayName: group.displayLabel,
      runLabel: run.shortLabel || `Run ${run.runNumber}`,
      showStudyLabel: runIndex === 0,
      isLastRunInStudy: runIndex === group.runs.length - 1 && !isLastStudy,
    }));
  });
};
