import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const getManualChunk = (id: string): string | undefined => {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const normalized = id.replace(/\\/g, '/');

  if (
    normalized.includes('/node_modules/react/') ||
    normalized.includes('/node_modules/react-dom/') ||
    normalized.includes('/node_modules/react-router-dom/')
  ) {
    return 'vendor-react';
  }

  if (normalized.includes('/node_modules/firebase/') || normalized.includes('/node_modules/@firebase/')) {
    return 'vendor-firebase';
  }

  if (normalized.includes('/node_modules/recharts/') || normalized.includes('/node_modules/d3-')) {
    return 'vendor-charts';
  }

  if (normalized.includes('/node_modules/xlsx/')) {
    return 'vendor-xlsx';
  }

  if (normalized.includes('/node_modules/jspdf/')) {
    return 'vendor-jspdf';
  }

  if (normalized.includes('/node_modules/html2canvas/')) {
    return 'vendor-html2canvas';
  }

  if (normalized.includes('/node_modules/lucide-react/')) {
    return 'vendor-icons';
  }

  return undefined;
};

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: getManualChunk
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nexus-it/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
