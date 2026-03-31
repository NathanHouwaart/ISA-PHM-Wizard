import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';
import path from "path"

// vite.config.js
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig({
  base: '/ISA-PHM-Wizard/',
  plugins: [
    react(),
    tailwindcss(),
    svgr()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('@revolist')) return 'vendor-revogrid';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('dexie')) return 'vendor-dexie';
          if (id.includes('/react/') || id.includes('\\react\\') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          return 'vendor-misc';
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/tests/**',
        'src/pages/__demo__/**',
        'src/NewGrid.jsx',
        'src/index.jsx'
      ],
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 25,
        branches: 60,
        functions: 40,
        lines: 25
      }
    }
  },
  define: {
    // This is important for making Buffer available globally
    global: 'globalThis',
    // Or, for older versions/more direct approach, though the above is preferred
    // 'process.env': {} // If you get 'process is not defined' later
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global for web browser compatibility
      define: {
        global: 'globalThis'
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        NodeModulesPolyfillPlugin()
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  }
});
