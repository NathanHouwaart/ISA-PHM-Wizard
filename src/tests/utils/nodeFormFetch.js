import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FormData = require('form-data');
const fetch = require('node-fetch');

/**
 * Post a JSON object as a file field using form-data + node-fetch
 * @param {string} url
 * @param {Object} jsonObj
 * @param {string} filename
 */
export async function postJsonFile(url, jsonObj, filename = 'input.json') {
  const fd = new FormData();
  const bodyStr = typeof jsonObj === 'string' ? jsonObj : JSON.stringify(jsonObj);
  fd.append('file', bodyStr, { filename, contentType: 'application/json' });

  const headers = fd.getHeaders();

  const res = await fetch(url, { method: 'POST', body: fd, headers });
  return res;
}
