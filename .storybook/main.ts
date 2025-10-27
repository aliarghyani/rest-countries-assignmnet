import path from 'node:path';

import VueComponentMeta from 'vite-plugin-vue-component-meta';

import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      // Prefer vue-component-meta for robust TS prop/emit extraction
      docgen: 'vue-component-meta'
    }
  },
  docs: {
    autodocs: 'tag'
  },
  viteFinal: async (config) => {
    // Ensure Vite resolves the same aliases as the app
    config.resolve = config.resolve ?? {};
    const existing = config.resolve.alias ?? [];
    const aliasArray = Array.isArray(existing) ? existing : Object.entries(existing).map(([find, replacement]) => ({ find, replacement }));
    aliasArray.push({ find: '@', replacement: path.resolve(__dirname, '../src') });
    aliasArray.push({ find: '~', replacement: path.resolve(__dirname, '../node_modules') });
    (config.resolve as any).alias = aliasArray;

    // Enable vue-component-meta for TypeScript-aware docs
    config.plugins = config.plugins ?? [];
    config.plugins.push(VueComponentMeta());
    return config;
  }
};

export default config;
