import { createRequire } from 'module';
import { strFromU8, unzipSync } from 'fflate';
const require = createRequire(import.meta.url);
const FormData = require('form-data');
const fetch = require('node-fetch');

/**
 * Post a JSON object as a file field using form-data + node-fetch
 * @param {string} url
 * @param {Object} jsonObj
 * @param {string} filename
 */
export async function postJsonFile(url, jsonObj, filename = 'input.json', {
  datasheetManifest = [],
  datasheets = [],
  imageManifest = [],
  images = [],
} = {}) {
  const fd = new FormData();
  const bodyStr = typeof jsonObj === 'string' ? jsonObj : JSON.stringify(jsonObj);
  fd.append('file', bodyStr, { filename, contentType: 'application/json' });
  fd.append('datasheet_manifest', JSON.stringify(datasheetManifest));
  datasheets.forEach(({ attachmentId, bytes }) => {
    fd.append('datasheets', Buffer.from(bytes), {
      filename: `${attachmentId}.pdf`,
      contentType: 'application/pdf',
    });
  });
  fd.append('image_manifest', JSON.stringify(imageManifest));
  images.forEach(({ attachmentId, bytes, fileName, mimeType }) => {
    const extension = String(fileName || '').split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
    fd.append('images', Buffer.from(bytes), {
      filename: `${attachmentId}.${extension}`,
      contentType: mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg'),
    });
  });

  const headers = fd.getHeaders();

  const res = await fetch(url, { method: 'POST', body: fd, headers });
  return res;
}

/**
 * Read the converted ISA-PHM JSON from either the current ZIP response or the
 * legacy direct JSON response.
 * @param {import('node-fetch').Response} response
 */
export async function readConversionJson(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const body = new Uint8Array(await response.buffer());
  const isZip = body.length >= 4
    && body[0] === 0x50
    && body[1] === 0x4b
    && body[2] === 0x03
    && body[3] === 0x04;

  if (!isZip) {
    return JSON.parse(strFromU8(body));
  }

  const entries = unzipSync(body);
  const output = entries['ISA-PHM-Out.json'];
  if (!output) {
    throw new Error('Conversion ZIP does not contain ISA-PHM-Out.json');
  }
  return JSON.parse(strFromU8(output));
}
