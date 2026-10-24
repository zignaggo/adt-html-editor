import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { glob } from 'node:fs/promises';
import { getSlugs } from 'fumadocs-core/source';
import { fileURLToPath } from 'node:url';
import { getPageImageUrl } from './src/lib/shared';

const editorDist = fileURLToPath(new URL('../../dist', import.meta.url));

const base = process.env.DOCS_BASE ?? '/';

const imageRoutes: string[] = [];
for await (const entry of glob('**/*.mdx', { cwd: 'content/docs' })) {
  imageRoutes.push(getPageImageUrl({ slugs: getSlugs(entry) }).url);
}

export default defineConfig({
  base,
  server: {
    port: 3000,
  },
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          crawlLinks: true,
        },
      },

      pages: [
        {
          path: '/',
        },
        {
          path: '/docs',
        },
        {
          path: '/api/search',
        },
        {
          path: 'llms-full.txt',
        },
        {
          path: 'llms.txt',
        },
      ],
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
    nitro({
      // TanStack Start pre-renders responses as text, which breaks images
      prerender: { routes: imageRoutes },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: 'tslib/tslib.es6.js',
      '@zignaggo/adt-html-editor/style.css?url': `${editorDist}/style.css?url`,
      '@zignaggo/adt-html-editor/style.css': `${editorDist}/style.css`,
      '@zignaggo/adt-html-editor/shadcn': `${editorDist}/shadcn.js`,
      '@zignaggo/adt-html-editor': `${editorDist}/index.js`,
    },
  },
});
