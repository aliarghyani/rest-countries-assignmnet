import { setup } from '@storybook/vue3';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

import type { Preview, DecoratorFunction } from '@storybook/vue3';

//

// Vuetify styles and icons
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

// Install Vuetify globally for all stories
const vuetify = createVuetify({ components, directives });
setup(app => {
  app.use(vuetify);
});

// Global toolbar to toggle light/dark theme for Vuetify
const withVuetifyApp: DecoratorFunction = (story, context) => ({
  components: { story },
  setup() {
    const theme = context.globals.theme ?? 'light';
    return { theme };
  },
  template: '<v-app :theme="theme"><story /></v-app>'
});

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' }
        ]
      }
    }
  },
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    a11y: {
      element: '#storybook-root'
    },
    backgrounds: {
      default: 'Light',
      values: [
        { name: 'Light', value: '#ffffff' },
        { name: 'Dark', value: '#121212' }
      ]
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
        widescreen: { name: 'Widescreen', styles: { width: '1600px', height: '900px' } }
      },
      defaultViewport: 'desktop'
    }
  },
  decorators: [withVuetifyApp]
};

export default preview;
