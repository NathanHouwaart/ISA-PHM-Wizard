import LZString from 'lz-string';

const STORAGE_CODEC_KEY = '__isaPhmCodec';
const STORAGE_CODEC_VERSION_KEY = '__isaPhmCodecVersion';
const STORAGE_CODEC_PAYLOAD_KEY = 'data';
const STORAGE_CODEC_VALUE = 'lz-string-utf16-json';
const STORAGE_CODEC_VERSION = 1;

// Conservative threshold to avoid compressing small payloads.
const DEFAULT_COMPRESSION_THRESHOLD = 64_000;

const isCodecEnvelope = (value) => {
  return !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && value[STORAGE_CODEC_KEY] === STORAGE_CODEC_VALUE
    && typeof value[STORAGE_CODEC_PAYLOAD_KEY] === 'string';
};

const buildCodecEnvelope = (compressed) => JSON.stringify({
  [STORAGE_CODEC_KEY]: STORAGE_CODEC_VALUE,
  [STORAGE_CODEC_VERSION_KEY]: STORAGE_CODEC_VERSION,
  [STORAGE_CODEC_PAYLOAD_KEY]: compressed
});

const tryCompressJson = (json) => {
  try {
    const compressed = LZString.compressToUTF16(json);
    if (!compressed) return null;
    return buildCodecEnvelope(compressed);
  } catch (error) {
    return null;
  }
};

export const encodeJsonForStorage = (
  value,
  {
    compressThreshold = DEFAULT_COMPRESSION_THRESHOLD,
    forceCompression = false
  } = {}
) => {
  const json = JSON.stringify(value);
  const shouldCompress = forceCompression || json.length >= Math.max(0, Number(compressThreshold) || 0);
  if (!shouldCompress) return json;

  const compressedEnvelope = tryCompressJson(json);
  if (!compressedEnvelope) return json;

  // Only keep compressed payload when it is smaller.
  if (!forceCompression && compressedEnvelope.length >= json.length) {
    return json;
  }
  return compressedEnvelope;
};

export const decodeJsonFromStorage = (raw) => {
  if (raw === null || raw === undefined) {
    return { exists: false, value: undefined };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isCodecEnvelope(parsed)) {
      return { exists: true, value: parsed };
    }

    const decompressed = LZString.decompressFromUTF16(parsed[STORAGE_CODEC_PAYLOAD_KEY]);
    if (typeof decompressed !== 'string') {
      return { exists: true, value: undefined };
    }
    return { exists: true, value: JSON.parse(decompressed) };
  } catch (error) {
    return { exists: true, value: undefined };
  }
};

export const isQuotaExceededError = (error) => {
  if (!error) return false;
  if (error.name === 'QuotaExceededError') return true;
  if (error.code === 22 || error.code === 1014) return true;
  const message = String(error.message || error).toLowerCase();
  return message.includes('quota') && message.includes('exceed');
};

