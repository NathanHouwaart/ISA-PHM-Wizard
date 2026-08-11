import { strFromU8 } from 'fflate';
import { MAX_DATASHEET_BYTES } from '../constants/attachmentLimits';

export const DEFAULT_MAX_COMPRESSION_RATIO = 200;

export const toArchiveBytes = async (blob) => {
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

export const calculateSha256 = async (bytes) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot calculate attachment checksums');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const getArchiveImageKind = (bytes) => {
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isPng) return { extension: 'png', mimeType: 'image/png' };
  if (isJpeg) return { extension: 'jpg', mimeType: 'image/jpeg' };
  return null;
};

export const validateArchiveDatasheet = (bytes, fileName, maxBytes = MAX_DATASHEET_BYTES) => {
  if (!/\.pdf$/i.test(fileName)) throw new Error(`${fileName} must use a .pdf filename`);
  if (bytes.length > maxBytes) {
    throw new Error(`${fileName} is larger than ${Math.floor(maxBytes / (1024 * 1024))} MB`);
  }
  if (bytes.length < 5 || strFromU8(bytes.subarray(0, 5)) !== '%PDF-') {
    throw new Error(`${fileName} is not a PDF file`);
  }
};

export const verifyArchiveImageDecode = async (bytes, mimeType) => {
  if (typeof createImageBitmap !== 'function') return;
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
  bitmap.close();
};

export const parseArchiveJsonEntry = (entries, path, maxBytes) => {
  const bytes = entries[path];
  if (!(bytes instanceof Uint8Array)) throw new Error(`The package is missing ${path}`);
  if (bytes.length > maxBytes) throw new Error(`${path} exceeds the package size limit`);
  try {
    return JSON.parse(strFromU8(bytes));
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
};

export const assertSafeArchivePath = (path) => {
  if (!path || path.includes('\\') || path.startsWith('/') || path.includes('\0')) {
    throw new Error('The ZIP contains an unsafe file path');
  }
  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('The ZIP contains an unsafe file path');
  }
};

export const inspectArchiveDirectory = (bytes, {
  minEntries = 2,
  maxEntries = 128,
  maxUncompressedBytes = 150 * 1024 * 1024,
  maxCompressionRatio = DEFAULT_MAX_COMPRESSION_RATIO,
} = {}) => {
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

  const diskNumber = view.getUint16(endOffset + 4, true);
  const directoryDisk = view.getUint16(endOffset + 6, true);
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const directorySize = view.getUint32(endOffset + 12, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (diskNumber !== 0 || directoryDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error('Multi-part ZIP packages are not supported');
  }
  if (entryCount < minEntries || entryCount > maxEntries || entryCount === 0xffff) {
    throw new Error('The ZIP contains an invalid number of files');
  }
  if (directoryOffset === 0xffffffff || directorySize === 0xffffffff
    || directoryOffset + directorySize > endOffset) {
    throw new Error('The ZIP directory is invalid');
  }

  let offset = directoryOffset;
  let totalUncompressed = 0;
  const paths = [];
  const pathSet = new Set();
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
    const nextOffset = nameEnd + extraLength + commentLength;
    if (nameEnd > bytes.length || nextOffset > bytes.length || (flags & 1) !== 0) {
      throw new Error((flags & 1) !== 0
        ? 'Encrypted ZIP packages are not supported'
        : 'The ZIP directory is invalid');
    }
    const path = strFromU8(bytes.subarray(offset + 46, nameEnd));
    assertSafeArchivePath(path);
    if (pathSet.has(path)) throw new Error(`The ZIP contains duplicate path ${path}`);
    if (uncompressedSize > 1024 * 1024
      && uncompressedSize / Math.max(1, compressedSize) > maxCompressionRatio) {
      throw new Error(`The ZIP entry ${path} has an unsafe compression ratio`);
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > maxUncompressedBytes) {
      throw new Error('The ZIP expands beyond the package size limit');
    }
    pathSet.add(path);
    paths.push(path);
    offset = nextOffset;
  }
  if (offset !== directoryOffset + directorySize) throw new Error('The ZIP directory is invalid');
  return paths;
};

export const hasZipSignature = (bytes) => (
  bytes.length >= 4
  && bytes[0] === 0x50
  && bytes[1] === 0x4b
  && bytes[2] === 0x03
  && bytes[3] === 0x04
);
