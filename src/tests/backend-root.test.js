// Simple integration test for backend root endpoint.
// Disabled by default to keep local/unit test runs hermetic.
// Enable with: RUN_BACKEND_INTEGRATION=1 npm test

const RUN_BACKEND_INTEGRATION = process.env.RUN_BACKEND_INTEGRATION === '1';
const integrationTest = RUN_BACKEND_INTEGRATION ? test : test.skip;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

describe('Backend root endpoint', () => {
  integrationTest('GET / returns API is running', async () => {
    const url = `${BACKEND_URL.replace(/\/$/, '')}/`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`Failed to reach backend at ${url}: ${err.message}. Start backend or disable integration tests.`);
    }

    clearTimeout(timeout);

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('message');
    // Accept either exact message or a message that contains 'API'
    expect(String(data.message)).toMatch(/API/i);
  }, 10000);
});
