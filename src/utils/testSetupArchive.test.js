import { webcrypto } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';

const mocks = vi.hoisted(() => ({
  datasheets: new Map(),
  images: new Map(),
  saveAttachmentBatch: vi.fn(async () => undefined),
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

import {
  commitTestSetupImport,
  createTestSetupArchive,
  hasStoredTestSetupAttachments,
  readTestSetupImportFile,
} from './testSetupArchive';
import { createTestSetupExportPackage } from './testSetupExport';

const pdfBytes = strToU8('%PDF-1.7\n%%EOF');
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

const fileFromBytes = (bytes, name, type) => new File([bytes], name, { type });

const blobToBytes = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

const sampleSetup = () => ({
  id: 'setup-1',
  name: 'Pump Rig',
  characteristics: [
    {
      id: 'fixed-characteristic',
      category: 'Frame',
      isReplaceable: false,
      datasheet: { attachmentId: 'fixed-sheet', fileName: 'frame.pdf' },
    },
    {
      id: 'replaceable-characteristic',
      category: 'Bearing',
      isReplaceable: true,
    },
  ],
  sensorTypes: [{
    id: 'sensor-type-1',
    name: 'Accelerometer',
    datasheet: { attachmentId: 'sensor-sheet', fileName: 'sensor.pdf' },
  }],
  sensors: [],
  images: [{ attachmentId: 'setup-image', fileName: 'rig.png', mimeType: 'image/png', size: pngBytes.length }],
});

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});

beforeEach(() => {
  mocks.datasheets.clear();
  mocks.images.clear();
  mocks.saveAttachmentBatch.mockClear();
  mocks.datasheets.set('fixed-sheet', {
    file: fileFromBytes(pdfBytes, 'frame.pdf', 'application/pdf'),
  });
  mocks.datasheets.set('sensor-sheet', {
    file: fileFromBytes(pdfBytes, 'sensor.pdf', 'application/pdf'),
  });
  mocks.images.set('setup-image', {
    file: fileFromBytes(pngBytes, 'rig.png', 'image/png'),
  });
});

describe('test setup ZIP packages', () => {
  it('exports setup-owned attachments and remaps their IDs on import', async () => {
    const archive = await createTestSetupArchive(sampleSetup());
    const candidate = await readTestSetupImportFile(
      fileFromBytes(await blobToBytes(archive), 'Pump Rig.zip', 'application/zip')
    );

    expect(candidate.legacy).toBe(false);
    expect(candidate.attachments).toHaveLength(3);
    expect(candidate.attachments.map((entry) => entry.attachmentId).sort()).toEqual([
      'fixed-sheet', 'sensor-sheet', 'setup-image'
    ]);

    const imported = await commitTestSetupImport(candidate);
    expect(imported.characteristics[0].datasheet.attachmentId).not.toBe('fixed-sheet');
    expect(imported.sensorTypes[0].datasheet.attachmentId).not.toBe('sensor-sheet');
    expect(imported.images[0].attachmentId).not.toBe('setup-image');
    expect(mocks.saveAttachmentBatch).toHaveBeenCalledOnce();
    const saved = mocks.saveAttachmentBatch.mock.calls[0][0];
    expect(saved.datasheets).toHaveLength(2);
    expect(saved.images).toHaveLength(1);
  });

  it('rejects undeclared and unsafe ZIP paths', async () => {
    const archive = await createTestSetupArchive(sampleSetup());
    const entries = unzipSync(await blobToBytes(archive));
    entries['../unexpected.txt'] = strToU8('unexpected');
    const tampered = zipSync(entries);

    await expect(readTestSetupImportFile(
      fileFromBytes(tampered, 'unsafe.zip', 'application/zip')
    )).rejects.toThrow('unsafe file path');
  });

  it('rejects attachment checksum mismatches', async () => {
    const archive = await createTestSetupArchive(sampleSetup());
    const entries = unzipSync(await blobToBytes(archive));
    entries['Datasheets/001.pdf'] = strToU8('%PDF-1.7\nchanged\n%%EOF');
    const tampered = zipSync(entries);

    await expect(readTestSetupImportFile(
      fileFromBytes(tampered, 'tampered.zip', 'application/zip')
    )).rejects.toThrow('integrity check');
  });

  it('keeps legacy JSON packages importable without attachments', async () => {
    const legacyFile = new File(
      [JSON.stringify(createTestSetupExportPackage(sampleSetup()))],
      'legacy.json',
      { type: 'application/json' }
    );

    const candidate = await readTestSetupImportFile(legacyFile);

    expect(candidate.legacy).toBe(true);
    expect(candidate.testSetup.id).toBe('setup-1');
    expect(candidate.attachments).toEqual([]);
  });

  it('reports whether every setup-owned attachment is stored locally', async () => {
    expect(await hasStoredTestSetupAttachments(sampleSetup())).toBe(true);

    mocks.images.delete('setup-image');

    expect(await hasStoredTestSetupAttachments(sampleSetup())).toBe(false);
  });

  it('rejects datasheets attached directly to replaceable characteristics', async () => {
    const setup = sampleSetup();
    setup.characteristics[1].datasheet = {
      attachmentId: 'project-sheet',
      fileName: 'bearing.pdf',
    };

    await expect(createTestSetupArchive(setup)).rejects.toThrow(
      'Replaceable characteristics cannot own datasheets'
    );
  });
});
