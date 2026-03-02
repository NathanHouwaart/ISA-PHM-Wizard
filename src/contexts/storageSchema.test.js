import { beforeEach, describe, expect, it } from 'vitest';
import {
    PROJECT_SCHEMA_VERSION,
    TEST_SETUPS_SCHEMA_VERSION,
    loadGlobalTestSetupsWithMigrations,
    loadProjectStateWithMigrations
} from './storageSchema';

const DEFAULTS = {
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
    experimentType: 'diagnostic-single',
    studyToStudyVariableMapping: [],
    sensorToMeasurementProtocolMapping: [],
    studyToSensorMeasurementMapping: [],
    sensorToProcessingProtocolMapping: [],
    studyToSensorProcessingMapping: [],
    pageTabStates: {}
};

const getDefault = (key) => DEFAULTS[key];

describe('storageSchema', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('migrates legacy investigations key to investigation and stamps schema version', () => {
        localStorage.setItem(
            'globalAppData_project-1_investigations',
            JSON.stringify({ investigationIdentifier: 'legacy-1' })
        );

        const result = loadProjectStateWithMigrations({
            projectId: 'project-1',
            resolveDefaultValue: getDefault
        });

        expect(result.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
        expect(result.state.investigation).toEqual({ investigationIdentifier: 'legacy-1' });

        expect(
            JSON.parse(localStorage.getItem('globalAppData_project-1_investigation'))
        ).toEqual({ investigationIdentifier: 'legacy-1' });
        expect(localStorage.getItem('globalAppData_project-1_investigations')).toBeNull();
        expect(
            JSON.parse(localStorage.getItem('globalAppData_project-1_schemaVersion'))
        ).toBe(PROJECT_SCHEMA_VERSION);
    });

    it('normalizes and deduplicates study protocol selections by study id', () => {
        localStorage.setItem(
            'globalAppData_project-2_studyToMeasurementProtocolSelection',
            JSON.stringify([
                { studyId: 'study-a', protocolId: 'old' },
                { studyId: 'study-b', protocolId: 'fixed' },
                { studyId: 'study-a', protocolId: 'new' },
                { protocolId: 'missing-study' },
                null
            ])
        );
        localStorage.setItem(
            'globalAppData_project-2_studyToProcessingProtocolSelection',
            JSON.stringify([
                { studyId: 'study-c', protocolId: '1' },
                { studyId: 'study-c', protocolId: '2' }
            ])
        );

        const result = loadProjectStateWithMigrations({
            projectId: 'project-2',
            resolveDefaultValue: getDefault
        });

        expect(result.state.studyToMeasurementProtocolSelection).toEqual([
            { studyId: 'study-b', protocolId: 'fixed' },
            { studyId: 'study-a', protocolId: 'new' }
        ]);
        expect(result.state.studyToProcessingProtocolSelection).toEqual([
            { studyId: 'study-c', protocolId: '2' }
        ]);
    });

    it('normalizes test setups and adds schema metadata', () => {
        localStorage.setItem(
            'globalAppData_testSetups',
            JSON.stringify([
                {
                    id: 'setup-1',
                    name: 'Setup',
                    sensors: { bad: true },
                    measurementProtocols: null,
                    processingProtocols: undefined
                }
            ])
        );

        const result = loadGlobalTestSetupsWithMigrations({ fallback: [] });

        expect(result.schemaVersion).toBe(TEST_SETUPS_SCHEMA_VERSION);
        expect(result.testSetups).toHaveLength(1);
        expect(Array.isArray(result.testSetups[0].sensors)).toBe(true);
        expect(Array.isArray(result.testSetups[0].measurementProtocols)).toBe(true);
        expect(Array.isArray(result.testSetups[0].processingProtocols)).toBe(true);
        expect(result.testSetups[0].version).toBe(1);
        expect(typeof result.testSetups[0].lastModified).toBe('number');

        expect(
            JSON.parse(localStorage.getItem('globalAppData_testSetups_schemaVersion'))
        ).toBe(TEST_SETUPS_SCHEMA_VERSION);
    });
});
