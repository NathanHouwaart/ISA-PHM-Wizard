import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';
import path from "path"

// vite.config.js
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { Buffer } from 'buffer'; // Import Buffer here

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr()
  ],
  define: {
    // This is important for making Buffer available globally
    global: 'globalThis',
    Buffer: ['buffer', 'Buffer'], // Provide Buffer
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