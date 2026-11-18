import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('dexie')) {
              return 'vendor-db';
            }
            if (id.includes('react-router') || id.includes('@remix-run')) {
              return 'vendor-router';
            }
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('zod')) {
              return 'vendor-validation';
            }
          }
        },
      },
    },
  },
  // @ts-expect-error vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
});
