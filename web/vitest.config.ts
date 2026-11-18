import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Process the stylesheet so a test can read it (`?raw`) and check the touch-target sizes.
    css: { include: [/styles\.css/] },
  },
});
