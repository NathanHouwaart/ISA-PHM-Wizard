import catalogue from '../data/deviceCatalogue.json';
import { v4 as uuid4 } from 'uuid';
import { cloneDeviceDefinition } from './deviceDefinitions';
import { saveDatasheetFile } from './datasheetStore';

export const DEVICE_CATALOGUE = catalogue;

// Built-in data are copied into the test setup, with a fresh local attachment.
// No catalogue edit can silently change an existing test setup.
export async function createDefinitionFromCatalogue(entry, { fetchFile = fetch, saveFile = saveDatasheetFile } = {}) {
  const { catalogueDatasheet, catalogueDescription: _catalogueDescription, ...template } = entry;
  const result = cloneDeviceDefinition(template);
  if (catalogueDatasheet) {
    const response = await fetchFile(`${import.meta.env.BASE_URL}${catalogueDatasheet.path}`);
    if (!response.ok) throw new Error('The catalogue datasheet could not be loaded.');
    const blob = await response.blob();
    if (!blob.size) throw new Error('The catalogue datasheet is empty.');
    const file = new File([blob], catalogueDatasheet.fileName, { type: 'application/pdf' });
    const attachmentId = uuid4();
    await saveFile({ id: attachmentId, file });
    result.datasheet = { attachmentId, fileName: file.name, mimeType: file.type, size: file.size, notAvailable: false };
  }
  return result;
}
