import { describe, expect, it } from 'vitest';
import {
    getAssignedComponentInstanceId,
    getDuplicateComponentInstanceIds,
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

    it('detects reused physical component instances across assignments', () => {
        const studies = [
            { componentAssignments: [{ replaceableCharacteristicId: 'bearing', componentInstanceId: 'bearing-1' }] },
            { componentAssignments: [{ replaceableCharacteristicId: 'bearing', componentInstanceId: 'bearing-1' }] },
            { componentAssignments: [{ replaceableCharacteristicId: 'motor', componentInstanceId: 'motor-1' }] },
        ];
        expect(getDuplicateComponentInstanceIds(studies)).toEqual(new Set(['bearing-1']));
        expect(getAssignedComponentInstanceId(studies[0], 'bearing')).toBe('bearing-1');
    });
});
