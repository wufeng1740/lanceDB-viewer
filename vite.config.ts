import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prefer TS sources when both .ts/.tsx and .js exist with same basename.
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },
  clearScreen: false,
  server: {
    port: 1422,
    strictPort: true
  }
});
