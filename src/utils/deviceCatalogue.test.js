import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { DEVICE_CATALOGUE, createDefinitionFromCatalogue } from './deviceCatalogue';

describe('built-in device catalogue', () => {
  it('ships the requested definitions, channels, descriptions and datasheets', async () => {
    expect(DEVICE_CATALOGUE.map((item) => item.outputs.length)).toEqual([18, 8]);
    for (const item of DEVICE_CATALOGUE) {
      expect(item.outputs.every((output) => output.name && output.description)).toBe(true);
      const pdf = await readFile(path.join(process.cwd(), 'public', item.catalogueDatasheet.path));
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    }
  });
  it('creates an independent editable copy with a locally saved datasheet', async () => {
    const entry = DEVICE_CATALOGUE[0];
    const saveFile = vi.fn();
    const fetchFile = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['%PDF-example'], { type: 'application/pdf' }) });
    const first = await createDefinitionFromCatalogue(entry, { fetchFile, saveFile });
    const second = await createDefinitionFromCatalogue(entry, { fetchFile, saveFile });
    expect(first.id).not.toBe(second.id);
    expect(first.outputs[0].id).not.toBe(second.outputs[0].id);
    expect(first.datasheet.attachmentId).not.toBe(second.datasheet.attachmentId);
    expect(saveFile).toHaveBeenCalledTimes(2);
    first.outputs[0].name = 'Changed';
    expect(second.outputs[0].name).toBe(entry.outputs[0].name);
  });
  it('does not create an incomplete copy when its datasheet cannot be fetched', async () => {
    const saveFile = vi.fn();
    await expect(createDefinitionFromCatalogue(DEVICE_CATALOGUE[0], { fetchFile: vi.fn().mockResolvedValue({ ok: false }), saveFile })).rejects.toThrow('datasheet');
    expect(saveFile).not.toHaveBeenCalled();
  });
});
