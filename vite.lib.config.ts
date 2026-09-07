import { resolve } from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  worker: { format: 'es' },
  publicDir: false,
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/lib/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
