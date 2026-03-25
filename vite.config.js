import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/Astrophysic_Site/',  // GitHub Pages sub-path
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
