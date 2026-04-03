const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000';

module.exports = defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '..'),
  plugins: [react()],
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: 5173,
    proxy: {
      '/api': devProxyTarget,
      '/uploads': devProxyTarget,
      '/images': devProxyTarget,
      '/css': devProxyTarget,
      '/js': devProxyTarget,
      '/manifest.json': devProxyTarget,
      '/service-worker.js': devProxyTarget
    }
  },
  build: {
    outDir: path.resolve(__dirname, '..', 'dist'),
    emptyOutDir: true
  }
});
