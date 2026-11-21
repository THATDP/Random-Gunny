import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { allowedHosts: true, host: true, port: 5173 },
  preview: { allowedHosts: true, host: true, port: 4173 },
});
