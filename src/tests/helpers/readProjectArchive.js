import fs from 'node:fs/promises';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

export const readBundledProjectArchive = async (archivePath) => {
  const absolutePath = path.resolve(process.cwd(), archivePath);
  const files = unzipSync(await fs.readFile(absolutePath));
  const projectJson = files['project.json'];

  if (!projectJson) {
    throw new Error(`Project archive does not contain project.json: ${archivePath}`);
  }

  return JSON.parse(strFromU8(projectJson));
};
