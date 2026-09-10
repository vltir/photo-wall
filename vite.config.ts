import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

export default defineConfig({
  base: '/photo-wall/',
  plugins: [svelte()],
  resolve: {
    alias: {
      '@core': path.resolve(import.meta.dirname, './src/core'),
      '@adapters': path.resolve(import.meta.dirname, './src/adapters'),
      '@ui': path.resolve(import.meta.dirname, './src/ui'),
      '@tests': path.resolve(import.meta.dirname, './src/tests'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});