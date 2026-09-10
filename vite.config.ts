import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@adapters': path.resolve(__dirname, './src/adapters'),
      '@ui': path.resolve(__dirname, './src/ui')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.ts']
  }
});
