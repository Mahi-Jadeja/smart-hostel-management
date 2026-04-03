import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Configure the dev server
  server: {
    port: 5173,         // Frontend port
    open: true,          // Auto-open browser when running npm run dev
  },
  // Configure test runner (Vitest)
  test: {
    globals: true,                // Use describe, it, expect without importing
    environment: 'jsdom',         // Simulate browser environment
    setupFiles: './src/test/setup.js',  // Run this file before all tests
    css: true,                    // Process CSS in tests
  },
});