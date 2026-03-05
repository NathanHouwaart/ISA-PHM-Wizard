import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useProjectDataState from './useProjectDataState';

const createInitialProjectState = (overrides = {}) => ({
    studies: [],
    investigation: {},
    contacts: [],
    publications: [],
    selectedTestSetupId: null,
    studyVariables: [],
    measurementProtocols: [],
    processingProtocols: [],
    studyToMeasurementProtocolSelection: [],
    studyToProcessingProtocolSelection: [],
    experimentType: 'diagnostic-experiment',
    studyToStudyVariableMapping: [],
    sensorToMeasurementProtocolMapping: [],
    studyToSensorMeasurementMapping: [],
    sensorToProcessingProtocolMapping: [],
    studyToSensorProcessingMapping: [],
    pageTabStates: {},
    ...overrides
});

describe('useProjectDataState', () => {
    it('normalizes runCount to 1 for single-run experiment types', async () => {
        const initialProjectState = createInitialProjectState({
            experimentType: 'diagnostic-experiment',
            studies: [{ id: 'study-1', runCount: 4 }]
        });

        const { result } = renderHook(() => useProjectDataState({
            initialProjectState,
            initialTestSetupsState: []
        }));

        await waitFor(() => {
            expect(result.current.studies[0].runCount).toBe(1);
        });
    });

    it('applyProjectStateToMemory updates all project-scoped values', () => {
        const { result } = renderHook(() => useProjectDataState({
            initialProjectState: createInitialProjectState(),
            initialTestSetupsState: []
        }));

        act(() => {
            result.current.applyProjectStateToMemory(createInitialProjectState({
                studies: [{ id: 'study-2', runCount: 2 }],
                contacts: [{ id: 'contact-1' }],
                experimentType: 'prognostics-experiment',
                pageTabStates: { 1: 'grid-view' }
            }));
        });

        expect(result.current.studies).toEqual([{ id: 'study-2', runCount: 2 }]);
        expect(result.current.contacts).toEqual([{ id: 'contact-1' }]);
        expect(result.current.experimentType).toBe('prognostics-experiment');
        expect(result.current.pageTabStates).toEqual({ 1: 'grid-view' });
        expect(result.current.dataMap.studies[0]).toEqual([{ id: 'study-2', runCount: 2 }]);
    });
});
