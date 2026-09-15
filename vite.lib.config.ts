import { resolve } from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export const SKIN_EXTERNALS = [
  /^@base-ui\/react(\/|$)/,
  /^lucide-react(\/|$)/,
  /^class-variance-authority(\/|$)/,
  /^cmdk(\/|$)/,
  /^react-resizable-panels(\/|$)/,
]

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
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
        // Every subpath, not just the entries: `react/compiler-runtime` (added
        // by the React Compiler) is CJS and calls `require('react')`, which
        // throws in the browser once bundled.
        /^react(\/|$)/,
        /^react-dom(\/|$)/,
        // CJS-only, and it requires react itself. Bundled here it would emit a
        // `require('react')` the browser cannot run; left external, the app's
        // bundler converts it to ESM with its own react.
        /^use-sync-external-store(\/|$)/,
        /^cn(\/|$)/,
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
