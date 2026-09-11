import fs from 'node:fs/promises';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

export const readBundledProjectArchive = async (archivePath) => {
  const absolutePath = path.resolve(process.cwd(), archivePath);
  const files = unzipSync(await fs.readFile(absolutePath));
  const projectJson = files['project.json'];
  const manifestJson = files['manifest.json'];

  if (!projectJson || !manifestJson) {
    throw new Error(`Project archive does not contain project.json: ${archivePath}`);
  }

  const manifest = JSON.parse(strFromU8(manifestJson));
  const attachments = (manifest.attachments || []).map((attachment) => {
    const bytes = files[attachment.path];
    if (!bytes) {
      throw new Error(`Project archive attachment is missing: ${attachment.path}`);
    }
    return { ...attachment, bytes };
  });

  return {
    ...JSON.parse(strFromU8(projectJson)),
    attachments,
  };
};
