import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/sspe/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'baseline-widely-available', // Vite 7 optimized browser target
    chunkSizeWarningLimit: 1500, // Increase limit to 1.5MB to suppress warning for main bundle
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['zustand', 'lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0', // Escuchar en todas las interfaces
    allowedHosts: true,
    open: true, // Auto-open browser on dev start
  },
  // Optimize dependencies for better performance
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'lucide-react'],
  },
});