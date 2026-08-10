import { getImageFile } from './imageStore';

export const buildImageUploadManifest = async (payload = {}) => {
  const testSetup = payload?.test_setup;
  const files = [];
  const manifest = [];

  for (const image of testSetup?.images || []) {
    if (!image?.attachmentId) continue;
    const storedAttachment = await getImageFile(image.attachmentId);
    if (!storedAttachment?.file) {
      throw new Error(`Image ${image.fileName || ''} is not stored locally. Please attach it again.`);
    }
    manifest.push({
      attachmentId: image.attachmentId,
      originalFileName: image.fileName,
      owner: { kind: 'test_setup', id: testSetup.id },
    });
    files.push({ attachmentId: image.attachmentId, file: storedAttachment.file });
  }

  return { manifest, files };
};
