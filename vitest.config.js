import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    setupFiles: [path.resolve(__dirname, 'vitest.setup.cjs')],
    environment: 'node',
    // run in-band by default can help on Windows with some IPC issues; tests will still
    // use worker threads when --threads true is provided by the CLI.
    //threads: false,
  }
});
