import { beforeEach, describe, expect, it, vi } from 'vitest';

const { putMock } = vi.hoisted(() => ({
    putMock: vi.fn(async () => undefined)
}));

vi.mock('dexie', () => {
    class DexieMock {
        constructor() {
            this.nodes = {
                put: putMock,
                get: vi.fn(async () => null),
                where: vi.fn(() => ({
                    equals: vi.fn(() => ({
                        toArray: vi.fn(async () => []),
                        delete: vi.fn(async () => undefined)
                    }))
                }))
            };
        }

        version() {
            return {
                stores: () => this
            };
        }

        transaction(_mode, _tableName, callback) {
            return callback();
        }
    }

    return {
        default: DexieMock
    };
});

import { importProject } from './indexedTreeStore';

describe('indexedTreeStore import key policy', () => {
    beforeEach(() => {
        localStorage.clear();
        putMock.mockClear();
    });

    it('restores only allowlisted project keys for the package source project', async () => {
        const pkg = {
            projectId: 'source-project',
            nodes: [],
            localStorage: {
                'globalAppData_source-project_studies': JSON.stringify([{ id: 's1' }]),
                'globalAppData_source-project_investigation': JSON.stringify({ investigationTitle: 'x' }),
                'globalAppData_source-project_schemaVersion': '2',
                'globalAppData_source-project_investigations': JSON.stringify({ legacy: true }),
                'globalAppData_source-project_datasetName': JSON.stringify('dataset'),
                'globalAppData_source-project_lastEdited': JSON.stringify('2024-01-01T00:00:00.000Z'),
                'globalAppData_source-project_seeded_v2': '1',
                'globalAppData_source-project_customBlob': JSON.stringify({ junk: true }),
                'globalAppData_other-project_studies': JSON.stringify([{ id: 'should-not-import' }])
            },
            selectedTestSetup: null
        };

        await importProject(pkg, 'target-project', { skipConflictCheck: true });

        expect(localStorage.getItem('globalAppData_target-project_studies')).toBe(
            JSON.stringify([{ id: 's1' }])
        );
        expect(localStorage.getItem('globalAppData_target-project_investigation')).toBe(
            JSON.stringify({ investigationTitle: 'x' })
        );
        expect(localStorage.getItem('globalAppData_target-project_schemaVersion')).toBe('2');
        expect(localStorage.getItem('globalAppData_target-project_investigations')).toBe(
            JSON.stringify({ legacy: true })
        );

        expect(localStorage.getItem('globalAppData_target-project_datasetName')).toBeNull();
        expect(localStorage.getItem('globalAppData_target-project_lastEdited')).toBeNull();
        expect(localStorage.getItem('globalAppData_target-project_seeded_v2')).toBeNull();
        expect(localStorage.getItem('globalAppData_target-project_customBlob')).toBeNull();
    });

    it('ignores invalid schemaVersion payloads while importing other allowed keys', async () => {
        const pkg = {
            projectId: 'source-project',
            nodes: [],
            localStorage: {
                'globalAppData_source-project_studies': JSON.stringify([{ id: 's1' }]),
                'globalAppData_source-project_schemaVersion': JSON.stringify('not-a-number')
            },
            selectedTestSetup: null
        };

        await importProject(pkg, 'target-project', { skipConflictCheck: true });

        expect(localStorage.getItem('globalAppData_target-project_studies')).toBe(
            JSON.stringify([{ id: 's1' }])
        );
        expect(localStorage.getItem('globalAppData_target-project_schemaVersion')).toBeNull();
    });

    it('throws and rolls back localStorage writes if restoring imported project state fails', async () => {
        const pkg = {
            projectId: 'source-project',
            nodes: [{ path: '', compressed: 'root-node' }],
            localStorage: {
                'globalAppData_source-project_studies': JSON.stringify([{ id: 's1' }]),
                'globalAppData_source-project_investigation': JSON.stringify({ investigationTitle: 'x' })
            },
            selectedTestSetup: null
        };

        const originalSetItem = Storage.prototype.setItem;
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function mockedSetItem(key, value) {
            if (key === 'globalAppData_target-project_investigation') {
                throw new Error('simulated localStorage failure');
            }
            return originalSetItem.call(this, key, value);
        });

        try {
            await expect(
                importProject(pkg, 'target-project', { skipConflictCheck: true })
            ).rejects.toThrow('simulated localStorage failure');
        } finally {
            setItemSpy.mockRestore();
        }

        expect(localStorage.getItem('globalAppData_target-project_studies')).toBeNull();
        expect(localStorage.getItem('globalAppData_target-project_investigation')).toBeNull();
        expect(putMock).not.toHaveBeenCalled();
    });
});
