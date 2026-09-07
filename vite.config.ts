import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from "vite-plugin-singlefile";
import { compression } from 'vite-plugin-compression2';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), compression({
    algorithm: 'gzip',
    exclude: [/\.(br)$/i],
    threshold: 1024,
    deleteOriginalAssets: false
  })],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    // Set a high limit (e.g., 100MB) to force Vite to inline all images
    assetsInlineLimit: 100000000, 
  },
});