import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    setupFiles: [path.resolve(__dirname, 'src/tests/setup.js')],
    environment: 'jsdom',
    globals: true,
  }
});
