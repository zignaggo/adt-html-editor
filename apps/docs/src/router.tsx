import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFound } from '@/components/not-found';

const basepath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    basepath: basepath || undefined,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
  });
}
