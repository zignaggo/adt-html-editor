import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img
            src={`${import.meta.env.BASE_URL}logo-compact.svg`}
            alt=""
            width={22}
            height={22}
            className="rounded-[6px]"
          />
          <span className="font-mono text-[13px] font-semibold">{appName}</span>
        </>
      ),
    },
    links: [
      { text: 'Docs', url: '/docs', active: 'nested-url' },
      { text: 'Playground', url: '/playground', active: 'nested-url' },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
