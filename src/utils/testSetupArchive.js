import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { isReplaceableCharacteristic } from './testSetupCharacteristics';
import { getDatasheetFile } from './datasheetStore';
import { getImageFile } from './imageStore';
import { saveAttachmentBatch } from './attachmentDatabase';
import generateId from './generateId';
import {
  createTestSetupExportPackage,
  parseTestSetupImportPackage,
  sanitizeTestSetupFileName,
} from './testSetupExport';

export const TEST_SETUP_ARCHIVE_FORMAT = 'isa-phm-test-setup-archive';
export const TEST_SETUP_ARCHIVE_VERSION = 1;

const MANIFEST_PATH = 'manifest.json';
const TEST_SETUP_PATH = 'test-setup.json';
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 150 * 1024 * 1024;
const MAX_JSON_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 128;
const MAX_COMPRESSION_RATIO = 200;
const MAX_DATASHEETS = 50;
const MAX_DATASHEET_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_DATASHEET_BYTES = 100 * 1024 * 1024;
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 50 * 1024 * 1024;
const TEST_SETUP_ARRAY_FIELDS = [
  'characteristics',
  'sensors',
  'sensorTypes',
  'configurations',
  'comments',
  'images',
  'measurementProtocols',
  'processingProtocols',
  'sensorToMeasurementProtocolMapping',
  'sensorToProcessingProtocolMapping',
];

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const toBytes = async (blob) => {
  if (typeof blob?.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error || new Error('The selected file could not be read'));
    reader.readAsArrayBuffer(blob);
  });
};

const sha256 = async (bytes) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot calculate attachment checksums');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const validateTestSetupShape = (testSetup) => {
  if (!isPlainObject(testSetup) || typeof testSetup.id !== 'string' || !testSetup.id.trim()) {
    throw new Error('The package does not contain a valid test setup');
  }
  TEST_SETUP_ARRAY_FIELDS.forEach((field) => {
    if (testSetup[field] !== undefined && !Array.isArray(testSetup[field])) {
      throw new Error(`The test setup field "${field}" must be a list`);
    }
  });
  return testSetup;
};

const getImageKind = (bytes) => {
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isPng) return { extension: 'png', mimeType: 'image/png' };
  if (isJpeg) return { extension: 'jpg', mimeType: 'image/jpeg' };
  return null;
};

const validateDatasheetBytes = (bytes, fileName) => {
  if (!/\.pdf$/i.test(fileName)) throw new Error(`${fileName} must use a .pdf filename`);
  if (bytes.length > MAX_DATASHEET_BYTES) throw new Error(`${fileName} is larger than 25 MB`);
  if (bytes.length < 5 || strFromU8(bytes.subarray(0, 5)) !== '%PDF-') {
    throw new Error(`${fileName} is not a PDF file`);
  }
};

const verifyImageDecode = async (bytes, mimeType) => {
  if (typeof createImageBitmap !== 'function') return;
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
  bitmap.close();
};

const collectOwnedAttachmentReferences = (testSetup) => {
  const references = [];
  const addDatasheet = (datasheet, ownerKind, ownerId) => {
    if (!datasheet?.attachmentId || datasheet.notAvailable) return;
    references.push({
      kind: 'datasheet',
      attachmentId: String(datasheet.attachmentId),
      fileName: String(datasheet.fileName || 'datasheet.pdf'),
      owner: { kind: ownerKind, id: ownerId },
    });
  };

  (testSetup.characteristics || []).forEach((characteristic) => {
    if (isReplaceableCharacteristic(characteristic?.isReplaceable)) {
      if (characteristic?.datasheet?.attachmentId && !characteristic.datasheet.notAvailable) {
        throw new Error('Replaceable characteristics cannot own datasheets; attach the PDF to a project component type instead');
      }
      return;
    }
    addDatasheet(characteristic?.datasheet, 'test_setup_characteristic', characteristic?.id);
  });
  (testSetup.sensorTypes || []).forEach((sensorType) => {
    addDatasheet(sensorType?.datasheet, 'sensor_type', sensorType?.id);
  });
  (testSetup.images || []).forEach((image) => {
    if (!image?.attachmentId) return;
    references.push({
      kind: 'image',
      attachmentId: String(image.attachmentId),
      fileName: String(image.fileName || 'test-setup-image'),
      owner: { kind: 'test_setup', id: testSetup.id },
    });
  });
  return references;
};

const parseJsonEntry = (entries, path, maxBytes = MAX_JSON_BYTES) => {
  const bytes = entries[path];
  if (!(bytes instanceof Uint8Array)) throw new Error(`The package is missing ${path}`);
  if (bytes.length > maxBytes) throw new Error(`${path} exceeds the package size limit`);
  try {
    return JSON.parse(strFromU8(bytes));
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
};

const assertSafeZipPath = (path) => {
  if (!path || path.includes('\\') || path.startsWith('/') || path.includes('\0')) {
    throw new Error('The ZIP contains an unsafe file path');
  }
  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('The ZIP contains an unsafe file path');
  }
};

const inspectZipDirectory = (bytes) => {
  if (bytes.length < 22) throw new Error('The selected file is not a valid ZIP package');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('The selected file is not a valid ZIP package');

  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (entryCount < 2 || entryCount > MAX_ENTRIES) throw new Error('The ZIP contains an invalid number of files');

  let offset = directoryOffset;
  let totalUncompressed = 0;
  const paths = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('The ZIP directory is invalid');
    }
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nameEnd = offset + 46 + nameLength;
    if (nameEnd > bytes.length || (flags & 1) !== 0) throw new Error('Encrypted ZIP packages are not supported');
    const path = strFromU8(bytes.subarray(offset + 46, nameEnd));
    assertSafeZipPath(path);
    if (paths.includes(path)) throw new Error(`The ZIP contains duplicate path ${path}`);
    if (uncompressedSize > 1024 * 1024 && uncompressedSize / Math.max(1, compressedSize) > MAX_COMPRESSION_RATIO) {
      throw new Error(`The ZIP entry ${path} has an unsafe compression ratio`);
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new Error('The ZIP expands beyond the package size limit');
    paths.push(path);
    offset = nameEnd + extraLength + commentLength;
  }
  return paths;
};

const remapAttachmentReferences = (testSetup, idMap) => {
  const clone = JSON.parse(JSON.stringify(testSetup));
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isPlainObject(value)) return;
    if (value.attachmentId && idMap.has(String(value.attachmentId))) {
      value.attachmentId = idMap.get(String(value.attachmentId));
    }
    Object.values(value).forEach(visit);
  };
  visit(clone);
  return clone;
};

export const getTestSetupArchiveFileName = (testSetup) => {
  const baseName = sanitizeTestSetupFileName(testSetup?.name) || 'test-setup';
  return `${baseName} Test Setup ISA-PHM.zip`;
};

export const hasStoredTestSetupAttachments = async (testSetup) => {
  const references = collectOwnedAttachmentReferences(validateTestSetupShape(testSetup));
  const availability = await Promise.all(references.map(async (reference) => {
    const stored = reference.kind === 'datasheet'
      ? await getDatasheetFile(reference.attachmentId)
      : await getImageFile(reference.attachmentId);
    return Boolean(stored?.file);
  }));
  return availability.every(Boolean);
};

export const createTestSetupArchive = async (testSetup) => {
  validateTestSetupShape(testSetup);
  const references = collectOwnedAttachmentReferences(testSetup);
  const uniqueReferences = new Map();
  references.forEach((reference) => {
    const existing = uniqueReferences.get(reference.attachmentId);
    if (existing && existing.kind !== reference.kind) throw new Error('An attachment ID is used for multiple file types');
    if (existing) existing.owners.push(reference.owner);
    else uniqueReferences.set(reference.attachmentId, { ...reference, owners: [reference.owner] });
  });

  const archiveEntries = {};
  const manifestAttachments = [];
  let datasheetIndex = 0;
  let imageIndex = 0;
  let totalDatasheetBytes = 0;
  let totalImageBytes = 0;

  for (const reference of uniqueReferences.values()) {
    const stored = reference.kind === 'datasheet'
      ? await getDatasheetFile(reference.attachmentId)
      : await getImageFile(reference.attachmentId);
    if (!stored?.file) throw new Error(`${reference.fileName} is not stored locally. Attach it again before exporting.`);
    const bytes = await toBytes(stored.file);
    let path;
    let mimeType;
    if (reference.kind === 'datasheet') {
      datasheetIndex += 1;
      if (datasheetIndex > MAX_DATASHEETS) throw new Error(`A package can contain at most ${MAX_DATASHEETS} datasheets`);
      validateDatasheetBytes(bytes, reference.fileName);
      totalDatasheetBytes += bytes.length;
      if (totalDatasheetBytes > MAX_TOTAL_DATASHEET_BYTES) throw new Error('Datasheets exceed the package size limit');
      path = `Datasheets/${String(datasheetIndex).padStart(3, '0')}.pdf`;
      mimeType = 'application/pdf';
    } else {
      imageIndex += 1;
      if (imageIndex > MAX_IMAGES) throw new Error(`A package can contain at most ${MAX_IMAGES} images`);
      if (bytes.length > MAX_IMAGE_BYTES) throw new Error(`${reference.fileName} is larger than 10 MB`);
      const kind = getImageKind(bytes);
      if (!kind) throw new Error(`${reference.fileName} is not a PNG or JPEG image`);
      if (!/\.(png|jpe?g)$/i.test(reference.fileName)) {
        throw new Error(`${reference.fileName} must use a .png, .jpg, or .jpeg filename`);
      }
      totalImageBytes += bytes.length;
      if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) throw new Error('Images exceed the package size limit');
      path = `Images/${String(imageIndex).padStart(3, '0')}.${kind.extension}`;
      mimeType = kind.mimeType;
    }
    archiveEntries[path] = bytes;
    manifestAttachments.push({
      kind: reference.kind,
      attachmentId: reference.attachmentId,
      path,
      fileName: reference.fileName.slice(0, 255),
      mimeType,
      size: bytes.length,
      sha256: await sha256(bytes),
      owners: reference.owners,
    });
  }

  const setupBytes = strToU8(JSON.stringify(createTestSetupExportPackage(testSetup), null, 2));
  const manifest = {
    format: TEST_SETUP_ARCHIVE_FORMAT,
    formatVersion: TEST_SETUP_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    testSetup: { path: TEST_SETUP_PATH, size: setupBytes.length, sha256: await sha256(setupBytes) },
    attachments: manifestAttachments,
  };
  archiveEntries[TEST_SETUP_PATH] = setupBytes;
  archiveEntries[MANIFEST_PATH] = strToU8(JSON.stringify(manifest, null, 2));
  const archiveBytes = zipSync(archiveEntries, { level: 6 });
  if (archiveBytes.length > MAX_ARCHIVE_BYTES) throw new Error('The test setup package is larger than 100 MB');
  return new Blob([archiveBytes], { type: 'application/zip' });
};

const parseArchiveCandidate = async (file) => {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('The test setup package is larger than 100 MB');
  const archiveBytes = await toBytes(file);
  const directoryPaths = inspectZipDirectory(archiveBytes);
  const entries = unzipSync(archiveBytes);
  const manifest = parseJsonEntry(entries, MANIFEST_PATH);
  if (manifest?.format !== TEST_SETUP_ARCHIVE_FORMAT) throw new Error('The selected ZIP is not a test setup package');
  if (manifest.formatVersion !== TEST_SETUP_ARCHIVE_VERSION) {
    throw new Error(`Unsupported test setup package version: ${manifest.formatVersion ?? 'unknown'}`);
  }
  if (manifest?.testSetup?.path !== TEST_SETUP_PATH || !Array.isArray(manifest.attachments)) {
    throw new Error('The test setup package manifest is invalid');
  }
  const expectedPaths = new Set([MANIFEST_PATH, TEST_SETUP_PATH]);
  let declaredDatasheets = 0;
  let declaredImages = 0;
  manifest.attachments.forEach((attachment) => {
    if (!isPlainObject(attachment) || !['datasheet', 'image'].includes(attachment.kind)) {
      throw new Error('The package contains invalid attachment metadata');
    }
    assertSafeZipPath(attachment.path);
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
    throw new Error('The package contains too many attachments');
  }
  if (directoryPaths.length !== expectedPaths.size || directoryPaths.some((path) => !expectedPaths.has(path))) {
    throw new Error('The ZIP contains files not declared by its manifest');
  }

  const setupBytes = entries[TEST_SETUP_PATH];
  if (setupBytes.length !== manifest.testSetup.size || await sha256(setupBytes) !== manifest.testSetup.sha256) {
    throw new Error('The test setup JSON checksum does not match its manifest');
  }
  const testSetup = validateTestSetupShape(parseTestSetupImportPackage(strFromU8(setupBytes)));
  const expectedReferences = collectOwnedAttachmentReferences(testSetup);
  const expectedById = new Map();
  expectedReferences.forEach((reference) => {
    const existingKind = expectedById.get(reference.attachmentId);
    if (existingKind && existingKind !== reference.kind) {
      throw new Error('A test setup attachment ID is reused for multiple file types');
    }
    expectedById.set(reference.attachmentId, reference.kind);
  });
  const manifestIds = new Set();
  const attachments = [];
  let totalDatasheetBytes = 0;
  let totalImageBytes = 0;

  for (const metadata of manifest.attachments) {
    const attachmentId = String(metadata.attachmentId || '');
    if (!attachmentId || manifestIds.has(attachmentId)) throw new Error('The attachment manifest contains duplicate or missing IDs');
    if (expectedById.get(attachmentId) !== metadata.kind) {
      throw new Error('An attachment type does not match its test setup reference');
    }
    manifestIds.add(attachmentId);
    const bytes = entries[metadata.path];
    if (!(bytes instanceof Uint8Array) || bytes.length !== metadata.size || await sha256(bytes) !== metadata.sha256) {
      throw new Error(`${metadata.fileName || metadata.path} failed its integrity check`);
    }
    const fileName = String(metadata.fileName || '').slice(0, 255);
    if (!fileName) throw new Error('An attachment is missing its original filename');
    let validatedMimeType = 'application/pdf';
    if (metadata.kind === 'datasheet') {
      validateDatasheetBytes(bytes, fileName);
      totalDatasheetBytes += bytes.length;
      if (totalDatasheetBytes > MAX_TOTAL_DATASHEET_BYTES) throw new Error('Datasheets exceed the package size limit');
    } else {
      const imageKind = getImageKind(bytes);
      if (bytes.length > MAX_IMAGE_BYTES || !imageKind || !/\.(png|jpe?g)$/i.test(fileName)) {
        throw new Error(`${fileName} is not a valid package image`);
      }
      await verifyImageDecode(bytes, imageKind.mimeType);
      validatedMimeType = imageKind.mimeType;
      totalImageBytes += bytes.length;
      if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) throw new Error('Images exceed the package size limit');
    }
    attachments.push({
      ...metadata,
      attachmentId,
      fileName,
      mimeType: validatedMimeType,
      bytes,
    });
  }
  if (expectedById.size !== manifestIds.size || [...expectedById.keys()].some((id) => !manifestIds.has(id))) {
    throw new Error('The package attachments do not match the test setup references');
  }
  return { testSetup, attachments, legacy: false };
};

export const readTestSetupImportFile = async (file) => {
  if (!file) throw new Error('Select a test setup package');
  const signature = await toBytes(file.slice(0, 4));
  const isZip = signature.length === 4 && signature[0] === 0x50 && signature[1] === 0x4b;
  if (isZip) return parseArchiveCandidate(file);
  if (file.size > MAX_JSON_BYTES) throw new Error('Legacy test setup JSON files must be 5 MB or smaller');
  return {
    testSetup: validateTestSetupShape(parseTestSetupImportPackage(strFromU8(await toBytes(file)))),
    attachments: [],
    legacy: true,
  };
};

export const commitTestSetupImport = async (candidate) => {
  const idMap = new Map();
  const datasheets = [];
  const images = [];
  for (const attachment of candidate?.attachments || []) {
    const id = generateId();
    idMap.set(attachment.attachmentId, id);
    const file = new File([attachment.bytes], attachment.fileName, { type: attachment.mimeType });
    const record = {
      id,
      file,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.bytes.length,
      updatedAt: Date.now(),
    };
    if (attachment.kind === 'datasheet') datasheets.push(record);
    else images.push(record);
  }
  await saveAttachmentBatch({ datasheets, images });
  return remapAttachmentReferences(candidate.testSetup, idMap);
};
