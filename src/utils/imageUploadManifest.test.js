import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getImageFile } from './imageStore';
import { buildImageUploadManifest } from './imageUploadManifest';

vi.mock('./imageStore', () => ({
  getImageFile: vi.fn(),
}));

describe('buildImageUploadManifest', () => {
  beforeEach(() => {
    getImageFile.mockReset();
  });

  it('maps stored test setup images to manifest entries and upload files', async () => {
    const file = new File(['image'], 'rig.png', { type: 'image/png' });
    getImageFile.mockResolvedValue({ file });

    const result = await buildImageUploadManifest({
      test_setup: {
        id: 'setup-1',
        images: [{ attachmentId: 'image-1', fileName: 'rig.png' }],
      },
    });

    expect(result.manifest).toEqual([{
      attachmentId: 'image-1',
      originalFileName: 'rig.png',
      owner: { kind: 'test_setup', id: 'setup-1' },
    }]);
    expect(result.files).toEqual([{ attachmentId: 'image-1', file }]);
  });

  it('requires locally persisted image bytes', async () => {
    getImageFile.mockResolvedValue(undefined);

    await expect(buildImageUploadManifest({
      test_setup: {
        id: 'setup-1',
        images: [{ attachmentId: 'image-1', fileName: 'rig.png' }],
      },
    })).rejects.toThrow('Please attach it again');
  });
});
