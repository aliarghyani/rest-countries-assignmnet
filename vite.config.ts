import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';


import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin, type UserConfig } from 'vite';


import { visualizer } from 'rollup-plugin-visualizer';
import { checker } from 'vite-plugin-checker';
import { VitePWA } from 'vite-plugin-pwa';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

import pkg from './package.json';

import type { IncomingMessage, ServerResponse } from 'node:http';

const isHtmlRequest = (request: IncomingMessage): boolean => {
  const method = request.method ?? 'GET';
  if (method.toUpperCase() !== 'GET') {
    return false;
  }

  const acceptHeader = request.headers.accept;
  const acceptValues: string[] = Array.isArray(acceptHeader)
    ? acceptHeader.filter((value): value is string => typeof value === 'string')
    : typeof acceptHeader === 'string'
      ? [acceptHeader]
      : [];

  if (!acceptValues.some(value => value.includes('text/html'))) {
    return false;
  }

  const url = request.url ?? '';
  if (url.startsWith('/@fs') || url.startsWith('/@vite')) {
    return false;
  }

  const pathname = url.split('?')[0] ?? '';
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return false;
  }

  return true;
};

const sendHtmlResponse = (res: ServerResponse, html: string): void => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(html);
};

const spaHistoryFallbackPlugin = (): Plugin => {
  const devIndexTemplatePath = fileURLToPath(new URL('./index.html', import.meta.url));
  const devIndexTemplate = readFileSync(devIndexTemplatePath, 'utf-8');

  const distIndexTemplatePath = fileURLToPath(new URL('./dist/index.html', import.meta.url));
  const distIndexTemplate = existsSync(distIndexTemplatePath)
    ? readFileSync(distIndexTemplatePath, 'utf-8')
    : devIndexTemplate;

  return {
    name: 'spa-history-fallback',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req || !res || !isHtmlRequest(req)) {
          next();
          return;
        }

        try {
          const html = await server.transformIndexHtml(req.url ?? '/', devIndexTemplate);
          sendHtmlResponse(res, html);
        } catch (error) {
          next(error);
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req || !res || !isHtmlRequest(req)) {
          next();
          return;
        }

        sendHtmlResponse(res, distIndexTemplate);
      });
    },
  };
};

/**
 * Vite Configure
 *
 * @see {@link https://vitejs.dev/config/}
 */
export default defineConfig(({ command, mode }): UserConfig => {
  const config: UserConfig = {
    // https://vitejs.dev/config/shared-options.html#base
    base: '/',
    // https://vitejs.dev/config/shared-options.html#define
    define: { 'process.env': {} },
    plugins: [
      // Vue3
      vue({
        template: {
          // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin#image-loading
          transformAssetUrls,
        },
      }),
      // Vuetify Loader
      // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin
      vuetify({
        autoImport: true,
        styles: { configFile: 'src/styles/settings.scss' },
      }),
      // vite-plugin-checker
      // https://github.com/fi3ework/vite-plugin-checker
      checker({
        typescript: true,
        // vueTsc: true,
        // eslint: { lintCommand: 'eslint' },
        // stylelint: { lintCommand: 'stylelint' },
      }),
      // PWA: Service worker + offline cache
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src/plugins',
        filename: 'sw.ts',
        includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
        injectRegister: 'auto',
        devOptions: { enabled: false },
        manifest: {
          name: 'REST Countries Explorer',
          short_name: 'Countries',
          start_url: '/',
          display: 'standalone',
          theme_color: '#1976D2',
          background_color: '#ffffff',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      }),
      spaHistoryFallbackPlugin(),
    ],
    // https://vitejs.dev/config/server-options.html
    server: {
      fs: {
        // Restrict serving to this project root to avoid external scanning
        allow: ['.'],
      },
      hmr: {
        overlay: true
      }
    },
    // Resolver
    resolve: {
      // https://vitejs.dev/config/shared-options.html#resolve-alias
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./node_modules', import.meta.url)),
      },
      extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
    },
    // Build Options
    // https://vitejs.dev/config/build-options.html
    build: {
      // Build Target
      // https://vitejs.dev/config/build-options.html#build-target
      target: 'esnext',
      // Minify option
      // https://vitejs.dev/config/build-options.html#build-minify
      minify: 'esbuild',
      // Source maps disabled by default for smaller bundles
      sourcemap: false,
      modulePreload: { polyfill: false },
      // Avoid computing brotli sizes to speed up CI builds
      reportCompressedSize: false,
      // Raise the warning limit a bit due to Vuetify chunk sizes
      chunkSizeWarningLimit: 1200,
      // Rollup Options
      // https://vitejs.dev/config/build-options.html#build-rollupoptions
      rollupOptions: {
        plugins: mode === 'analyze'
          ? [visualizer({ open: true, filename: 'dist/stats.html' })]
          : [],
        output: {
          manualChunks: {
            // Split external library from transpiled code.
            vue: ['vue', 'vue-router', 'pinia', 'pinia-plugin-persistedstate'],
            vuetify: [
              'vuetify',
              'vuetify/components',
              'vuetify/directives',
              // 'vuetify/lib/labs',
              'webfontloader',
            ],
            materialdesignicons: ['@mdi/font/css/materialdesignicons.css'],
            vendor_utils: ['axios', 'fuse.js']
          },
          // no output.plugins (visualizer is set in rollupOptions.plugins)
        },
      },
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'axios', 'fuse.js', 'vuetify']
    },
    esbuild: {
      // Drop console when production build.
      drop: command === 'serve' ? [] : ['console', 'debugger'],
    },
    // Pre-bundle common deps to speed up dev HMR
  };

  // Write meta data.
  writeFileSync(
    fileURLToPath(new URL('./src/Meta.ts', import.meta.url)),

    `import type MetaInterface from '@/interfaces/MetaInterface';

// This file is auto-generated by the build system.
const meta: MetaInterface = {
  version: '${pkg.version}',
  date: '${new Date().toISOString()}',
};
export default meta;
`
  );

  return config;
});
