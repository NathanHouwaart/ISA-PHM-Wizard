import { beforeEach, describe, expect, it } from 'vitest';
import {
    PROJECT_SCHEMA_VERSION,
    TEST_SETUPS_SCHEMA_VERSION,
    loadGlobalTestSetupsWithMigrations,
    loadProjectStateWithMigrations
} from './storageSchema';
import { encodeJsonForStorage } from '../utils/storageCodec';

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
    experimentType: 'diagnostic-experiment',
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

    it('migrates legacy study shape for runCount, outputMode, protocol selections, and experiment type', () => {
        localStorage.setItem(
            'globalAppData_project-legacy_experimentType',
            JSON.stringify('diagnostic-multi')
        );
        localStorage.setItem(
            'globalAppData_project-legacy_studies',
            JSON.stringify([
                {
                    id: 'study-1',
                    name: 'Study 1',
                    runCount: '3',
                    measurementProtocolId: 'mp-1',
                    processingProtocolId: 'pp-1'
                },
                {
                    id: 'study-2',
                    name: 'Study 2'
                }
            ])
        );
        localStorage.setItem(
            'globalAppData_project-legacy_studyToSensorMeasurementMapping',
            JSON.stringify([
                { studyId: 'study-1', sensorId: 'sensor-1', value: 'raw-a.csv' }
            ])
        );
        localStorage.setItem(
            'globalAppData_project-legacy_studyToSensorProcessingMapping',
            JSON.stringify([
                { studyId: 'study-1', sensorId: 'sensor-1', value: 'proc-a.csv' },
                { studyId: 'study-2', sensorId: 'sensor-1', value: 'proc-b.csv' }
            ])
        );

        const result = loadProjectStateWithMigrations({
            projectId: 'project-legacy',
            resolveDefaultValue: getDefault
        });

        expect(result.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
        expect(result.state.experimentType).toBe('prognostics-experiment');

        const study1 = result.state.studies.find((study) => study.id === 'study-1');
        const study2 = result.state.studies.find((study) => study.id === 'study-2');

        expect(study1.runCount).toBe(3);
        expect(study1.outputMode).toBe('raw_and_processed');
        expect(study2.runCount).toBe(1);
        expect(study2.outputMode).toBe('processed_only');

        expect(result.state.studyToMeasurementProtocolSelection).toEqual([
            { studyId: 'study-1', protocolId: 'mp-1' },
            { studyId: 'study-2', protocolId: '' }
        ]);
        expect(result.state.studyToProcessingProtocolSelection).toEqual([
            { studyId: 'study-1', protocolId: 'pp-1' },
            { studyId: 'study-2', protocolId: '' }
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

    it('reads compressed project state values', () => {
        const mapping = Array.from({ length: 1500 }).map((_, index) => ({
            studyVariableId: `var-${index % 10}`,
            studyRunId: `study-1::run-${String(index + 1).padStart(4, '0')}`,
            value: `value-${index}`
        }));
        localStorage.setItem(
            'globalAppData_project-3_studyToStudyVariableMapping',
            encodeJsonForStorage(mapping, { forceCompression: true })
        );

        const result = loadProjectStateWithMigrations({
            projectId: 'project-3',
            resolveDefaultValue: getDefault
        });

        expect(Array.isArray(result.state.studyToStudyVariableMapping)).toBe(true);
        expect(result.state.studyToStudyVariableMapping).toHaveLength(mapping.length);
        expect(result.state.studyToStudyVariableMapping[0]).toEqual(mapping[0]);
    });
});
