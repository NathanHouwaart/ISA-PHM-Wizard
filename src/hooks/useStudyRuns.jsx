import { useMemo } from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { expandStudiesIntoRuns } from '../utils/studyRuns';

const useStudyRuns = () => {
    const { studies } = useGlobalDataContext();

    return useMemo(() => expandStudiesIntoRuns(studies), [studies]);
};

export default useStudyRuns;
