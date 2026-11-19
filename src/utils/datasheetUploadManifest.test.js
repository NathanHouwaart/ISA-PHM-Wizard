import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDatasheetUploadManifest } from './datasheetUploadManifest';
import { getDatasheetFile } from './datasheetStore';

vi.mock('./datasheetStore', () => ({ getDatasheetFile: vi.fn() }));

describe('datasheet upload manifest', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('uploads a shared datasheet once and records each owner', async () => {
    const file = new File(['pdf'], 'Sensor.pdf', { type: 'application/pdf' });
    getDatasheetFile.mockResolvedValue({ file });
    const datasheet = { attachmentId: 'shared', fileName: 'Sensor.pdf' };
    const result = await buildDatasheetUploadManifest({ test_setup: { sensorTypes: [
      { id: 'first', datasheet }, { id: 'second', datasheet },
    ] } });
    expect(result.files).toEqual([{ attachmentId: 'shared', file }]);
    expect(result.manifest).toEqual([{ attachmentId: 'shared', originalFileName: 'Sensor.pdf', owners: [
      { kind: 'sensor_type', id: 'first' }, { kind: 'sensor_type', id: 'second' },
    ] }]);
    expect(getDatasheetFile).toHaveBeenCalledTimes(1);
  });
});
