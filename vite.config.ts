import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built app also runs from a USB stick or file server
  // during a competition demonstration.
  base: './',
  plugins: [react(), tailwindcss()],
});
