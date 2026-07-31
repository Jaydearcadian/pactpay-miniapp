import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative assets allow the same build to run on GitHub Pages, a custom
  // domain, or inside Nimiq Pay without changing application routes.
  base: './',
});
