import { describe, expect, it } from 'vitest';
import {
    getDuplicateConfigurationIds,
    isPrognosticsExperiment,
} from './studyConfigurationValidation';

describe('study configuration validation', () => {
    it('identifies prognostics projects', () => {
        expect(isPrognosticsExperiment('prognostics-experiment')).toBe(true);
        expect(isPrognosticsExperiment('diagnostic-experiment')).toBe(false);
    });

    it('returns all duplicated configuration ids', () => {
        const duplicates = getDuplicateConfigurationIds([
            { id: 'study-1', configurationId: 'configuration-1' },
            { id: 'study-2', configurationId: 'configuration-1' },
            { id: 'study-3', configurationId: 'configuration-2' }
        ]);

        expect(duplicates).toEqual(new Set(['configuration-1']));
    });
});
