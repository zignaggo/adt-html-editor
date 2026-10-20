import { resolve } from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * React Scan only sees renders when its devtools hook exists before `react-dom` is evaluated,
 * so it is injected ahead of the app's own entry — and only while serving, which keeps it out
 * of the built playground entirely.
 */
function reactScan(): Plugin {
  return {
    name: 'playground-react-scan',
    apply: 'serve',
    transformIndexHtml: () => [
      {
        tag: 'script',
        attrs: { type: 'module', src: '/src/playground/scan.ts' },
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig({
  plugins: [reactScan(), react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: { '@shadcn': resolve(import.meta.dirname, 'src/shadcn') },
  },
  worker: { format: 'es' },
  build: { outDir: 'dist-playground' },
})
