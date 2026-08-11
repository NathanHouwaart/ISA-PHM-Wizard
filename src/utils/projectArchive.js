import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { exportProject, importProject } from './indexedTreeStore';
import { decodeJsonFromStorage, encodeJsonForStorage } from './storageCodec';
import { getDatasheetFile } from './datasheetStore';
import { getImageFile } from './imageStore';
import { saveAttachmentBatch } from './attachmentDatabase';
import { cleanupAttachmentRefs } from './attachmentLifecycle';
import generateId from './generateId';
import {
  assertSafeArchivePath,
  calculateSha256,
  getArchiveImageKind,
  hasZipSignature,
  inspectArchiveDirectory,
  parseArchiveJsonEntry,
  toArchiveBytes,
  validateArchiveDatasheet,
  verifyArchiveImageDecode,
} from './archiveSecurity';
import { MAX_DATASHEET_BYTES } from '../constants/attachmentLimits';

export const PROJECT_ARCHIVE_FORMAT = 'isa-phm-project-archive';
export const PROJECT_ARCHIVE_VERSION = 1;

const MANIFEST_PATH = 'manifest.json';
const PROJECT_PATH = 'project.json';
const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 300 * 1024 * 1024;
const MAX_PROJECT_JSON_BYTES = 50 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_ENTRIES = 256;
const MAX_DATASHEETS = 100;
const MAX_TOTAL_DATASHEET_BYTES = 150 * 1024 * 1024;
const MAX_IMAGES = 25;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 100 * 1024 * 1024;
const MAX_LOCAL_STORAGE_KEYS = 128;
const MAX_DATASET_NODES = 250_000;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeProjectFileName = (value) => String(value || '')
  .replace(/[<>:"/\\|?*]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const validateProjectPackage = (project) => {
  if (!isPlainObject(project) || typeof project.projectId !== 'string' || !project.projectId.trim()) {
    throw new Error('The package does not contain a valid project');
  }
  if (!Array.isArray(project.nodes) || project.nodes.length > MAX_DATASET_NODES) {
    throw new Error('The project contains an invalid dataset index');
  }
  if (!isPlainObject(project.localStorage)
    || Object.keys(project.localStorage).length > MAX_LOCAL_STORAGE_KEYS) {
    throw new Error('The project contains invalid browser state');
  }
  Object.entries(project.localStorage).forEach(([key, raw]) => {
    if (typeof key !== 'string' || typeof raw !== 'string') {
      throw new Error('The project contains invalid browser state');
    }
  });
  if (project.selectedTestSetup !== null
    && project.selectedTestSetup !== undefined
    && !isPlainObject(project.selectedTestSetup)) {
    throw new Error('The project contains an invalid selected test setup');
  }
  return project;
};

const collectAttachmentReferences = (project) => {
  const references = [];
  const visit = (value, owner) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, owner));
      return;
    }
    if (!isPlainObject(value)) return;

    if (value.datasheet?.attachmentId && !value.datasheet.notAvailable) {
      references.push({
        kind: 'datasheet',
        attachmentId: String(value.datasheet.attachmentId),
        fileName: String(value.datasheet.fileName || 'datasheet.pdf'),
        owner: { ...owner, recordId: value.id || owner.recordId || null },
      });
    }
    if (Array.isArray(value.images)) {
      value.images.forEach((image) => {
        if (!image?.attachmentId) return;
        references.push({
          kind: 'image',
          attachmentId: String(image.attachmentId),
          fileName: String(image.fileName || 'project-image'),
          owner: { ...owner, recordId: value.id || owner.recordId || null },
        });
      });
    }
    Object.values(value).forEach((entry) => visit(entry, owner));
  };

  visit(project.selectedTestSetup, {
    scope: 'selected_test_setup',
    recordId: project.selectedTestSetup?.id || null,
  });
  Object.entries(project.localStorage).forEach(([key, raw]) => {
    const decoded = decodeJsonFromStorage(raw);
    if (!decoded.exists || decoded.value === undefined) return;
    visit(decoded.value, { scope: 'project_state', key, recordId: null });
  });
  return references;
};

const groupAttachmentReferences = (references) => {
  const grouped = new Map();
  references.forEach((reference) => {
    const existing = grouped.get(reference.attachmentId);
    if (existing && existing.kind !== reference.kind) {
      throw new Error('An attachment ID is used for multiple file types');
    }
    if (existing) {
      existing.owners.push(reference.owner);
      return;
    }
    grouped.set(reference.attachmentId, { ...reference, owners: [reference.owner] });
  });
  return grouped;
};

const remapProjectReferences = (project, attachmentIdMap, setupIdMap) => {
  const remapValue = (value) => {
    if (Array.isArray(value)) return value.map(remapValue);
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
      if (key === 'attachmentId' && attachmentIdMap.has(String(entry))) {
        return [key, attachmentIdMap.get(String(entry))];
      }
      if ((key === 'testSetupId' || key === 'selectedTestSetupId') && setupIdMap.has(String(entry))) {
        return [key, setupIdMap.get(String(entry))];
      }
      return [key, remapValue(entry)];
    }));
  };

  const clone = JSON.parse(JSON.stringify(project));
  if (clone.selectedTestSetup?.id && setupIdMap.has(String(clone.selectedTestSetup.id))) {
    clone.selectedTestSetup.id = setupIdMap.get(String(clone.selectedTestSetup.id));
  }
  clone.selectedTestSetup = remapValue(clone.selectedTestSetup);
  clone.localStorage = Object.fromEntries(Object.entries(clone.localStorage).map(([key, raw]) => {
    const decoded = decodeJsonFromStorage(raw);
    if (!decoded.exists || decoded.value === undefined) return [key, raw];
    let value = decoded.value;
    if (key.endsWith('_selectedTestSetupId') && setupIdMap.has(String(value))) {
      value = setupIdMap.get(String(value));
    } else {
      value = remapValue(value);
    }
    return [key, encodeJsonForStorage(value)];
  }));
  return clone;
};

export const getProjectArchiveFileName = (project) => {
  const baseName = sanitizeProjectFileName(project?.projectName || project?.projectId) || 'project-export';
  return `${baseName} ISA-PHM.zip`;
};

export const createProjectArchive = async (projectId, options = {}) => {
  const project = validateProjectPackage(await exportProject(projectId, options));
  const references = groupAttachmentReferences(collectAttachmentReferences(project));
  const archiveEntries = {};
  const manifestAttachments = [];
  let datasheetCount = 0;
  let imageCount = 0;
  let totalDatasheetBytes = 0;
  let totalImageBytes = 0;

  for (const reference of references.values()) {
    const stored = reference.kind === 'datasheet'
      ? await getDatasheetFile(reference.attachmentId)
      : await getImageFile(reference.attachmentId);
    if (!stored?.file) {
      throw new Error(`${reference.fileName} is not stored locally. Attach it again before exporting.`);
    }
    const bytes = await toArchiveBytes(stored.file);
    let path;
    let mimeType;
    if (reference.kind === 'datasheet') {
      datasheetCount += 1;
      if (datasheetCount > MAX_DATASHEETS) {
        throw new Error(`A project package can contain at most ${MAX_DATASHEETS} datasheets`);
      }
      validateArchiveDatasheet(bytes, reference.fileName, MAX_DATASHEET_BYTES);
      totalDatasheetBytes += bytes.length;
      if (totalDatasheetBytes > MAX_TOTAL_DATASHEET_BYTES) {
        throw new Error('Datasheets exceed the project package size limit');
      }
      path = `Datasheets/${String(datasheetCount).padStart(3, '0')}.pdf`;
      mimeType = 'application/pdf';
    } else {
      imageCount += 1;
      if (imageCount > MAX_IMAGES) {
        throw new Error(`A project package can contain at most ${MAX_IMAGES} images`);
      }
      const imageKind = getArchiveImageKind(bytes);
      if (bytes.length > MAX_IMAGE_BYTES || !imageKind || !/\.(png|jpe?g)$/i.test(reference.fileName)) {
        throw new Error(`${reference.fileName} is not a valid project image`);
      }
      totalImageBytes += bytes.length;
      if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) throw new Error('Images exceed the project package size limit');
      path = `Images/${String(imageCount).padStart(3, '0')}.${imageKind.extension}`;
      mimeType = imageKind.mimeType;
    }
    archiveEntries[path] = bytes;
    manifestAttachments.push({
      kind: reference.kind,
      attachmentId: reference.attachmentId,
      path,
      fileName: reference.fileName.slice(0, 255),
      mimeType,
      size: bytes.length,
      sha256: await calculateSha256(bytes),
      owners: reference.owners,
    });
  }

  const projectBytes = strToU8(JSON.stringify(project, null, 2));
  if (projectBytes.length > MAX_PROJECT_JSON_BYTES) throw new Error('project.json exceeds the package size limit');
  const manifest = {
    format: PROJECT_ARCHIVE_FORMAT,
    formatVersion: PROJECT_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      path: PROJECT_PATH,
      projectId: project.projectId,
      size: projectBytes.length,
      sha256: await calculateSha256(projectBytes),
    },
    attachments: manifestAttachments,
  };
  archiveEntries[PROJECT_PATH] = projectBytes;
  archiveEntries[MANIFEST_PATH] = strToU8(JSON.stringify(manifest, null, 2));
  const archiveBytes = zipSync(archiveEntries, { level: 6 });
  if (archiveBytes.length > MAX_ARCHIVE_BYTES) throw new Error('The project package is larger than 200 MB');
  return {
    blob: new Blob([archiveBytes], { type: 'application/zip' }),
    project,
  };
};

const parseProjectArchive = async (file) => {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('The project package is larger than 200 MB');
  const archiveBytes = await toArchiveBytes(file);
  const directoryPaths = inspectArchiveDirectory(archiveBytes, {
    maxEntries: MAX_ENTRIES,
    maxUncompressedBytes: MAX_UNCOMPRESSED_BYTES,
  });
  const entries = unzipSync(archiveBytes);
  const manifest = parseArchiveJsonEntry(entries, MANIFEST_PATH, MAX_MANIFEST_BYTES);
  if (manifest?.format !== PROJECT_ARCHIVE_FORMAT) throw new Error('The selected ZIP is not an ISA-PHM project package');
  if (manifest.formatVersion !== PROJECT_ARCHIVE_VERSION) {
    throw new Error(`Unsupported project package version: ${manifest.formatVersion ?? 'unknown'}`);
  }
  if (manifest?.project?.path !== PROJECT_PATH || !Array.isArray(manifest.attachments)) {
    throw new Error('The project package manifest is invalid');
  }

  const expectedPaths = new Set([MANIFEST_PATH, PROJECT_PATH]);
  let declaredDatasheets = 0;
  let declaredImages = 0;
  manifest.attachments.forEach((attachment) => {
    if (!isPlainObject(attachment) || !['datasheet', 'image'].includes(attachment.kind)) {
      throw new Error('The project package contains invalid attachment metadata');
    }
    assertSafeArchivePath(attachment.path);
    const expectedPrefix = attachment.kind === 'datasheet' ? 'Datasheets/' : 'Images/';
    if (!attachment.path.startsWith(expectedPrefix)) throw new Error('An attachment is stored in the wrong package folder');
    if (attachment.kind === 'datasheet') {
      declaredDatasheets += 1;
      if (!attachment.path.toLowerCase().endsWith('.pdf')) throw new Error('A datasheet has an invalid package filename');
    } else {
      declaredImages += 1;
      if (!/\.(png|jpe?g)$/i.test(attachment.path)) throw new Error('An image has an invalid package filename');
    }
    if (expectedPaths.has(attachment.path)) throw new Error('The package manifest contains a duplicate attachment path');
    expectedPaths.add(attachment.path);
  });
  if (declaredDatasheets > MAX_DATASHEETS || declaredImages > MAX_IMAGES) {
    throw new Error('The project package contains too many attachments');
  }
  if (directoryPaths.length !== expectedPaths.size || directoryPaths.some((path) => !expectedPaths.has(path))) {
    throw new Error('The ZIP contains files not declared by its manifest');
  }

  const projectBytes = entries[PROJECT_PATH];
  if (!(projectBytes instanceof Uint8Array)
    || projectBytes.length !== manifest.project.size
    || await calculateSha256(projectBytes) !== manifest.project.sha256) {
    throw new Error('The project JSON checksum does not match its manifest');
  }
  const project = validateProjectPackage(parseArchiveJsonEntry(entries, PROJECT_PATH, MAX_PROJECT_JSON_BYTES));
  if (manifest.project.projectId !== project.projectId) throw new Error('The project identity does not match its manifest');
  const expectedReferences = groupAttachmentReferences(collectAttachmentReferences(project));
  const manifestIds = new Set();
  const attachments = [];
  let totalDatasheetBytes = 0;
  let totalImageBytes = 0;

  for (const metadata of manifest.attachments) {
    const attachmentId = String(metadata.attachmentId || '');
    if (!attachmentId || manifestIds.has(attachmentId)) {
      throw new Error('The attachment manifest contains duplicate or missing IDs');
    }
    const expected = expectedReferences.get(attachmentId);
    if (!expected || expected.kind !== metadata.kind) {
      throw new Error('An attachment type does not match its project reference');
    }
    if (!Array.isArray(metadata.owners) || metadata.owners.length === 0) {
      throw new Error('An attachment is missing ownership metadata');
    }
    manifestIds.add(attachmentId);
    const bytes = entries[metadata.path];
    if (!(bytes instanceof Uint8Array)
      || bytes.length !== metadata.size
      || await calculateSha256(bytes) !== metadata.sha256) {
      throw new Error(`${metadata.fileName || metadata.path} failed its integrity check`);
    }
    const fileName = String(metadata.fileName || '').slice(0, 255);
    if (!fileName) throw new Error('An attachment is missing its original filename');
    let mimeType = 'application/pdf';
    if (metadata.kind === 'datasheet') {
      validateArchiveDatasheet(bytes, fileName, MAX_DATASHEET_BYTES);
      totalDatasheetBytes += bytes.length;
      if (totalDatasheetBytes > MAX_TOTAL_DATASHEET_BYTES) {
        throw new Error('Datasheets exceed the project package size limit');
      }
    } else {
      const imageKind = getArchiveImageKind(bytes);
      if (bytes.length > MAX_IMAGE_BYTES || !imageKind || !/\.(png|jpe?g)$/i.test(fileName)) {
        throw new Error(`${fileName} is not a valid project image`);
      }
      await verifyArchiveImageDecode(bytes, imageKind.mimeType);
      mimeType = imageKind.mimeType;
      totalImageBytes += bytes.length;
      if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) throw new Error('Images exceed the project package size limit');
    }
    attachments.push({ ...metadata, attachmentId, fileName, mimeType, bytes });
  }
  if (expectedReferences.size !== manifestIds.size
    || [...expectedReferences.keys()].some((id) => !manifestIds.has(id))) {
    throw new Error('The package attachments do not match the project references');
  }
  return { project, attachments, legacy: false };
};

export const readProjectImportFile = async (file) => {
  if (!file) throw new Error('Select a project package');
  const signature = await toArchiveBytes(file.slice(0, 4));
  if (hasZipSignature(signature)) return parseProjectArchive(file);
  if (file.size > MAX_PROJECT_JSON_BYTES) throw new Error('Legacy project JSON files must be 50 MB or smaller');
  let project;
  try {
    project = JSON.parse(strFromU8(await toArchiveBytes(file)));
  } catch {
    throw new Error('The selected project file is not valid JSON');
  }
  return { project: validateProjectPackage(project), attachments: [], legacy: true };
};

export const commitProjectArchiveImport = async (candidate, targetProjectId) => {
  if (!candidate || candidate.legacy || !targetProjectId) throw new Error('Invalid project archive import');
  const attachmentIdMap = new Map();
  const setupIdMap = new Map();
  const datasheets = [];
  const images = [];
  const createdRefs = { datasheets: new Set(), images: new Set() };

  for (const attachment of candidate.attachments || []) {
    const id = generateId();
    attachmentIdMap.set(attachment.attachmentId, id);
    const record = {
      id,
      file: new File([attachment.bytes], attachment.fileName, { type: attachment.mimeType }),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.bytes.length,
      updatedAt: Date.now(),
    };
    if (attachment.kind === 'datasheet') {
      datasheets.push(record);
      createdRefs.datasheets.add(id);
    } else {
      images.push(record);
      createdRefs.images.add(id);
    }
  }
  if (candidate.project.selectedTestSetup?.id) {
    setupIdMap.set(String(candidate.project.selectedTestSetup.id), generateId());
  }
  const project = remapProjectReferences(candidate.project, attachmentIdMap, setupIdMap);

  try {
    await saveAttachmentBatch({ datasheets, images });
    const result = await importProject(project, targetProjectId, { skipConflictCheck: true });
    if (!result?.success) throw new Error('The imported project could not be saved');
    return { ...result, project };
  } catch (error) {
    try {
      await cleanupAttachmentRefs(createdRefs);
    } catch (cleanupError) {
      console.warn('[projectArchive] attachment rollback failed', cleanupError);
    }
    throw error;
  }
};
