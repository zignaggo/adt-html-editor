import { resolve } from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

export const SKIN_EXTERNALS = [
  /^@base-ui\/react(\/|$)/,
  /^lucide-react(\/|$)/,
  /^class-variance-authority(\/|$)/,
  /^cn(\/|$)/,
  /^cmdk(\/|$)/,
  /^react-resizable-panels(\/|$)/,
]

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: { '@shadcn': resolve(import.meta.dirname, 'src/shadcn') },
  },
  worker: { format: 'es' },
  publicDir: false,
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/lib/index.ts'),
        shadcn: resolve(import.meta.dirname, 'src/shadcn/index.ts'),
      },
      formats: ['es'],
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-dom/client',
        ...SKIN_EXTERNALS,
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
