import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    mockReset: true,
  },
  resolve: {
    alias: {
      '@vee/db': path.resolve(__dirname, '../db/src'),
      '@vee/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
