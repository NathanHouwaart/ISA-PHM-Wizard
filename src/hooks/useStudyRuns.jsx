import { useMemo } from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { expandStudiesIntoRuns } from '../utils/studyRuns';
import { getExperimentTypeConfig } from '../constants/experimentTypes';

const useStudyRuns = () => {
    const { studies, experimentType } = useGlobalDataContext();

    return useMemo(() => {
        const config = getExperimentTypeConfig(experimentType);
        return expandStudiesIntoRuns(studies, {
            singleRunLabel: config.singleRunLabel,
            multiRunLabelFormatter: config.multiRunLabelFormatter,
        });
    }, [studies, experimentType]);
};

export default useStudyRuns;
