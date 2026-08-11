import { beforeEach, describe, expect, it, vi } from 'vitest';
import { strFromU8, unzipSync, zipSync } from 'fflate';
import { decodeJsonFromStorage } from './storageCodec';

const mocks = vi.hoisted(() => ({
  datasheets: new Map(),
  images: new Map(),
  exportProject: vi.fn(),
  importProject: vi.fn(),
  saveAttachmentBatch: vi.fn(),
  cleanupAttachmentRefs: vi.fn(),
  nextId: 0,
}));

vi.mock('./indexedTreeStore', () => ({
  exportProject: mocks.exportProject,
  importProject: mocks.importProject,
}));
vi.mock('./datasheetStore', () => ({
  getDatasheetFile: vi.fn(async (id) => mocks.datasheets.get(id)),
}));
vi.mock('./imageStore', () => ({
  getImageFile: vi.fn(async (id) => mocks.images.get(id)),
}));
vi.mock('./attachmentDatabase', () => ({
  saveAttachmentBatch: mocks.saveAttachmentBatch,
}));
vi.mock('./attachmentLifecycle', () => ({
  cleanupAttachmentRefs: mocks.cleanupAttachmentRefs,
}));
vi.mock('./generateId', () => ({
  default: vi.fn(() => `imported-${++mocks.nextId}`),
}));

import {
  commitProjectArchiveImport,
  createProjectArchive,
  readProjectImportFile,
} from './projectArchive';

const pdfBytes = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const fileFromBytes = (bytes, name, type) => new File([bytes], name, { type });

const projectFixture = () => ({
  exportedAt: 1,
  projectId: 'source-project',
  projectName: 'Pump project',
  nodes: [{ path: '', compressed: 'root', parentPath: '', updatedAt: 1, meta: {} }],
  localStorage: {
    'globalAppData_source-project_selectedTestSetupId': JSON.stringify('setup-1'),
    'globalAppData_source-project_configurationTypes': JSON.stringify([
      {
        id: 'component-type-1',
        testSetupId: 'setup-1',
        datasheet: { attachmentId: 'component-sheet', fileName: 'bearing.pdf' },
      },
    ]),
    'globalAppData_source-project_studies': JSON.stringify([{ id: 'study-1' }]),
  },
  selectedTestSetup: {
    id: 'setup-1',
    name: 'Pump rig',
    characteristics: [
      {
        id: 'characteristic-1',
        datasheet: { attachmentId: 'setup-sheet', fileName: 'frame.pdf' },
      },
    ],
    images: [
      { attachmentId: 'setup-image', fileName: 'rig.png', mimeType: 'image/png' },
    ],
  },
});

const asProjectFile = (blob, name = 'project.zip') => new File([blob], name, {
  type: name.endsWith('.json') ? 'application/json' : 'application/zip',
});
const blobToBytes = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

describe('project archive', () => {
  beforeEach(() => {
    mocks.datasheets.clear();
    mocks.images.clear();
    mocks.nextId = 0;
    vi.clearAllMocks();
    mocks.exportProject.mockResolvedValue(projectFixture());
    mocks.importProject.mockResolvedValue({ success: true, targetProjectId: 'target-project' });
    mocks.datasheets.set('setup-sheet', {
      file: fileFromBytes(pdfBytes, 'frame.pdf', 'application/pdf'),
    });
    mocks.datasheets.set('component-sheet', {
      file: fileFromBytes(pdfBytes, 'bearing.pdf', 'application/pdf'),
    });
    mocks.images.set('setup-image', {
      file: fileFromBytes(pngBytes, 'rig.png', 'image/png'),
    });
  });

  it('round-trips all project attachments and remaps setup and attachment IDs', async () => {
    const { blob } = await createProjectArchive('source-project', { projectName: 'Pump project' });
    const entries = unzipSync(await blobToBytes(blob));
    expect(Object.keys(entries).sort()).toEqual([
      'Datasheets/001.pdf',
      'Datasheets/002.pdf',
      'Images/001.png',
      'manifest.json',
      'project.json',
    ]);

    const candidate = await readProjectImportFile(asProjectFile(blob));
    expect(candidate.legacy).toBe(false);
    expect(candidate.attachments).toHaveLength(3);
    await commitProjectArchiveImport(candidate, 'target-project');

    expect(mocks.saveAttachmentBatch).toHaveBeenCalledTimes(1);
    const saved = mocks.saveAttachmentBatch.mock.calls[0][0];
    expect(saved.datasheets).toHaveLength(2);
    expect(saved.images).toHaveLength(1);
    expect(mocks.importProject).toHaveBeenCalledWith(expect.any(Object), 'target-project', {
      skipConflictCheck: true,
    });

    const imported = mocks.importProject.mock.calls[0][0];
    expect(imported.selectedTestSetup.id).not.toBe('setup-1');
    expect(imported.selectedTestSetup.images[0].attachmentId).not.toBe('setup-image');
    expect(imported.selectedTestSetup.characteristics[0].datasheet.attachmentId).not.toBe('setup-sheet');
    const selectedSetupId = decodeJsonFromStorage(
      imported.localStorage['globalAppData_source-project_selectedTestSetupId']
    ).value;
    const configurationTypes = decodeJsonFromStorage(
      imported.localStorage['globalAppData_source-project_configurationTypes']
    ).value;
    expect(selectedSetupId).toBe(imported.selectedTestSetup.id);
    expect(configurationTypes[0].testSetupId).toBe(imported.selectedTestSetup.id);
    expect(configurationTypes[0].datasheet.attachmentId).not.toBe('component-sheet');
  });

  it('rejects modified attachment bytes', async () => {
    const { blob } = await createProjectArchive('source-project');
    const entries = unzipSync(await blobToBytes(blob));
    entries['Datasheets/001.pdf'] = new TextEncoder().encode('%PDF-tampered');
    const tampered = new Blob([zipSync(entries)], { type: 'application/zip' });
    await expect(readProjectImportFile(asProjectFile(tampered))).rejects.toThrow('integrity check');
  });

  it('rejects ZIP entries that are not declared by the manifest', async () => {
    const { blob } = await createProjectArchive('source-project');
    const entries = unzipSync(await blobToBytes(blob));
    entries['extra.txt'] = new TextEncoder().encode('unexpected');
    const unexpected = new Blob([zipSync(entries)], { type: 'application/zip' });
    await expect(readProjectImportFile(asProjectFile(unexpected))).rejects.toThrow(
      'files not declared by its manifest'
    );
  });

  it('rejects path traversal entries before extracting the archive', async () => {
    const { blob } = await createProjectArchive('source-project');
    const entries = unzipSync(await blobToBytes(blob));
    entries['../escape.txt'] = new TextEncoder().encode('unexpected');
    const unsafe = new Blob([zipSync(entries)], { type: 'application/zip' });
    await expect(readProjectImportFile(asProjectFile(unsafe))).rejects.toThrow('unsafe file path');
  });

  it('keeps legacy JSON project exports importable without attachments', async () => {
    const project = projectFixture();
    project.selectedTestSetup = null;
    project.localStorage = {};
    const file = asProjectFile(new Blob([JSON.stringify(project)]), 'legacy.json');
    const candidate = await readProjectImportFile(file);
    expect(candidate.legacy).toBe(true);
    expect(candidate.project.projectId).toBe('source-project');
    expect(candidate.attachments).toEqual([]);
  });

  it('rolls back newly staged attachments when project persistence fails', async () => {
    const { blob } = await createProjectArchive('source-project');
    const candidate = await readProjectImportFile(asProjectFile(blob));
    mocks.importProject.mockRejectedValueOnce(new Error('storage failed'));

    await expect(commitProjectArchiveImport(candidate, 'target-project')).rejects.toThrow('storage failed');
    expect(mocks.cleanupAttachmentRefs).toHaveBeenCalledTimes(1);
    const refs = mocks.cleanupAttachmentRefs.mock.calls[0][0];
    expect(refs.datasheets.size).toBe(2);
    expect(refs.images.size).toBe(1);
  });

  it('refuses to export when a referenced attachment is unavailable', async () => {
    mocks.datasheets.delete('component-sheet');
    await expect(createProjectArchive('source-project')).rejects.toThrow('not stored locally');
  });

  it('writes a versioned manifest tied to project.json', async () => {
    const { blob } = await createProjectArchive('source-project');
    const entries = unzipSync(await blobToBytes(blob));
    const manifest = JSON.parse(strFromU8(entries['manifest.json']));
    expect(manifest).toMatchObject({
      format: 'isa-phm-project-archive',
      formatVersion: 1,
      project: { path: 'project.json', projectId: 'source-project' },
    });
    expect(manifest.attachments).toHaveLength(3);
  });
});
