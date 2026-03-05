import { describe, expect, it } from 'vitest';
import {
    DEFAULT_PROJECT_ID,
    MULTI_RUN_EXAMPLE_PROJECT_ID,
    getKeyFallback,
    mergeProjectsWithExamples
} from './projectSessionConfig';

describe('projectSessionConfig', () => {
    it('merges example projects first and deduplicates by id', () => {
        const merged = mergeProjectsWithExamples([
            { id: 'custom-a', name: 'Custom A' },
            { id: DEFAULT_PROJECT_ID, name: 'Renamed Default' },
            { id: 'custom-b', name: 'Custom B' },
            { id: 'custom-a', name: 'Duplicate Custom A' }
        ]);

        expect(merged.map((project) => project.id)).toEqual([
            DEFAULT_PROJECT_ID,
            MULTI_RUN_EXAMPLE_PROJECT_ID,
            'custom-a',
            'custom-b'
        ]);
        expect(merged[0].name).toBe('Renamed Default');
    });

    it('returns typed fallback values for missing project keys', () => {
        expect(getKeyFallback('selectedTestSetupId')).toBeNull();
        expect(getKeyFallback('investigation')).toEqual({});
        expect(getKeyFallback('pageTabStates')).toEqual({});
        expect(getKeyFallback('studyVariables')).toEqual([]);
    });
});
