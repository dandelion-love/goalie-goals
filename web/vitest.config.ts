import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Keep concurrent jsdom startup within the shared host's capacity.
    maxWorkers: 2,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    // Process the stylesheets so a test can read them (`?raw`) and check sizes and contrast.
    css: { include: [/(styles|tokens)\.css/] },
  },
});
