// client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.lottie'],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',     // you already have this
      '/uploads': 'http://localhost:8000', // add this line!
    },
  },
});
