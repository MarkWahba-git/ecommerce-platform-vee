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
    // Point at tests inside this directory
    include: ['**/*.test.ts'],
  },
  resolve: {
    // Use the node_modules symlinks created by pnpm workspaces.
    // We also alias 'zod' to ensure it resolves consistently for all
    // workspace package source files that import it.
    alias: {
      '@vee/core': path.resolve(__dirname, '../node_modules/@vee/core/src'),
      '@vee/shared': path.resolve(__dirname, '../node_modules/@vee/shared/src'),
      '@vee/db': path.resolve(__dirname, '../node_modules/@vee/db/src'),
      zod: path.resolve(__dirname, '../node_modules/@vee/shared/node_modules/zod'),
    },
  },
});
