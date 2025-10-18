import { setup } from '@storybook/vue3';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

import type { Preview } from '@storybook/vue3';

// Vuetify styles and icons
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

// Install Vuetify globally for all stories
const vuetify = createVuetify({ components, directives });
setup(app => {
  app.use(vuetify);
});

const preview: Preview = {
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
    }
  },
  decorators: [
    // Ensure Vuetify layout context for components
    (story) => ({
      components: { story },
      template: '<v-app><story /></v-app>'
    })
  ]
};

export default preview;

