import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // forward API calls
      '/api':     'http://localhost:8000',
      // forward static uploads
      '/uploads': 'http://localhost:8000',
    }
  }
});
