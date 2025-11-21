import { v4 as uuidv4 } from 'uuid';

const RUN_ID_PREFIX = 'run';

export const normalizeRunCount = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const createStudyRunId = (studyId, runNumber = 1) => {
    const paddedRun = String(runNumber).padStart(2, '0');
    return `${studyId || uuidv4()}::${RUN_ID_PREFIX}-${paddedRun}`;
};

export const expandStudiesIntoRuns = (studies = [], options = {}) => {
    if (!Array.isArray(studies)) {
        return [];
    }

    const {
        singleRunLabel = 'Run 1',
        multiRunLabelFormatter = (runNumber) => `Run ${runNumber}`,
    } = options || {};

    return studies.flatMap((study, studyIndex) => {
        const runCount = normalizeRunCount(study?.runCount);

        return Array.from({ length: runCount }, (_, idx) => {
            const runNumber = idx + 1;
            const runId = createStudyRunId(study?.id, runNumber);
            const shortLabel = runCount > 1 ? multiRunLabelFormatter(runNumber, study) : singleRunLabel;
            const displayName = shortLabel
                ? `${study?.name || 'Study'} (${shortLabel})`
                : (study?.name || 'Study');

            return {
                ...study,
                id: runId,
                studyId: study?.id,
                studyIndex,
                runNumber,
                runCount,
                runId,
                displayName,
                shortLabel,
                studyName: study?.name,
                name: displayName,
            };
        });
    });
};

export const findRunForMapping = (runs = [], studyRunId, studyId) => {
    if (!Array.isArray(runs)) {
        return null;
    }

    if (studyRunId) {
        return runs.find((run) => run.runId === studyRunId) || null;
    }

    return runs.find((run) => run.studyId === studyId && run.runNumber === 1) || null;
};

export const groupStudyRuns = (studyRuns = []) => {
    return studyRuns.reduce((acc, run) => {
        if (!run || !run.studyId) {
            return acc;
        }
        const bucket = acc.get(run.studyId) || [];
        bucket.push(run);
        acc.set(run.studyId, bucket);
        return acc;
    }, new Map());
};
