import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: true,
    // Configure CORS and file serving
    cors: true,
    fs: {
      // Allow serving files from parent directories
      allow: ['..']
    }
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'pixi': ['pixi.js'],
          'audio': ['howler']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['pixi.js', 'howler']
  }
});