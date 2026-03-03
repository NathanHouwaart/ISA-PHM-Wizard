// Simple integration test for backend root endpoint.
// Disabled by default to keep local/unit test runs hermetic.
// Enable with: RUN_BACKEND_INTEGRATION=1 npm test

const RUN_BACKEND_INTEGRATION = process.env.RUN_BACKEND_INTEGRATION === '1';
const integrationTest = RUN_BACKEND_INTEGRATION ? test : test.skip;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

describe('Backend root endpoint', () => {
  integrationTest('backend is reachable', async () => {
    const baseUrl = BACKEND_URL.replace(/\/$/, '');
    const rootUrl = `${baseUrl}/`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res;
    try {
      res = await fetch(rootUrl, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`Failed to reach backend at ${rootUrl}: ${err.message}. Start backend or disable integration tests.`);
    }

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      expect(data).toHaveProperty('message');
      // Accept either exact message or a message that contains 'API'
      expect(String(data.message)).toMatch(/API/i);
      return;
    }

    // Some backend versions do not expose GET / but still provide OpenAPI docs.
    if (res.status === 404 || res.status === 405) {
      const docsRes = await fetch(`${baseUrl}/openapi.json`);
      expect(docsRes.ok).toBe(true);
      const docs = await docsRes.json();
      expect(typeof docs?.openapi).toBe('string');
      return;
    }

    throw new Error(`Backend responded with unexpected status at ${rootUrl}: ${res.status}`);
  }, 10000);
});
