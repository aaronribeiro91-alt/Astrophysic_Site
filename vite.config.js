import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/Astrophysic_Site/',  // GitHub Pages sub-path
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mediatheque: resolve(__dirname, 'mediatheque.html'),
        horloge: resolve(__dirname, 'horloge-cosmique.html'),
      },
    },
  },
  server: {
    open: true,
  },
});

