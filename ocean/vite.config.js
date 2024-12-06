// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, 'myapi/static/myapi/js'), // Set output directory inside static/myapi/js
    rollupOptions: {
      input: path.resolve(__dirname, 'myapi/static/myapi/js/app.js'), // Entry point is your app.js file
    }
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000', // (Optional) Proxy API requests to your Django server
    }
  }
});

