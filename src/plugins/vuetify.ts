// vuetify.ts

import { createVuetify, type VuetifyOptions } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import * as labsComponents from 'vuetify/labs/components';
import { en } from 'vuetify/locale';

import { loadFonts } from '@/plugins/webfontloader';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

await loadFonts();

let vuetifyConfig: VuetifyOptions = {
  defaults: {
    global: {
      ripple: false
    },
    VSheet: {
      elevation: 4
    }
  },
  locale: {
    locale: 'en',
    fallback: 'en',
    messages: { en }
  },
  theme: {
    themes: {
      light: {
        colors: {
          background: 'hsl(0, 0%, 98%)', // Very Light Gray for light mode background
          surface: 'hsl(0, 0%, 100%)', // White for light mode elements
          primary: 'hsl(200, 15%, 8%)', // Very Dark Blue for text in light mode
          secondary: 'hsl(0, 0%, 52%)' // Dark Gray for input fields
        },
        variables: {
          'high-emphasis-opacity': 0.9,
          'medium-emphasis-opacity': 0.9,
          'disabled-opacity': 0.38,
          'idle-opacity': 0.04,
          'hover-opacity': 0.04,
          'focus-opacity': 0.12,
          'selected-opacity': 0.08,
          'activated-opacity': 0.12,
          'pressed-opacity': 0.12,
          'dragged-opacity': 0.08,
          'theme-kbd': '#212529',
          'theme-on-kbd': '#FFFFFF',
          'theme-code': '#F5F5F5',
          'theme-on-code': '#000000'
        }
      },
      dark: {
        colors: {
          background: 'hsl(207, 26%, 17%)', // Very Dark Blue for dark mode background
          surface: 'hsl(209, 23%, 22%)', // Dark Blue for dark mode elements
          primary: 'hsl(0, 0%, 100%)', // White for text in dark mode
          secondary: 'hsl(0, 0%, 52%)' // Dark Gray for input fields in dark mode
        },
        variables: {
          'high-emphasis-opacity': 0.9,
          'medium-emphasis-opacity': 0.9,
          'disabled-opacity': 0.38,
          'idle-opacity': 0.04,
          'hover-opacity': 0.04,
          'focus-opacity': 0.12,
          'selected-opacity': 0.08,
          'activated-opacity': 0.12,
          'pressed-opacity': 0.12,
          'dragged-opacity': 0.08,
          'theme-kbd': '#212529',
          'theme-on-kbd': '#FFFFFF',
          'theme-code': '#F5F5F5',
          'theme-on-code': '#000000'
        }
      }
    },
    defaultTheme: 'light'
  }
};

if (import.meta.env.DEV) {
  vuetifyConfig = {
    components: { components, labsComponents },
    directives,
    ...vuetifyConfig
  };
}

export default createVuetify(vuetifyConfig);
export { components, directives };
