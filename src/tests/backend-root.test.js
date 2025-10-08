// Simple integration test for backend root endpoint
// This test attempts to GET http://localhost:8080/ and verifies the JSON payload.
// It uses a short timeout to avoid hanging when the backend is not running.

describe('Backend root endpoint', () => {
  test('GET / returns API is running', async () => {
    const url = 'http://localhost:8080/';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeout);
      // Provide a helpful error message when backend isn't reachable
      throw new Error(`Failed to reach backend at ${url}: ${err.message}`);
    }

    clearTimeout(timeout);

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('message');
    // Accept either exact message or a message that contains 'API'
    expect(String(data.message)).toMatch(/API/i);
  }, 10000);
});
