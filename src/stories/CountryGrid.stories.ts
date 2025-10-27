import { useGlobal } from '@/store';
import { createPinia, setActivePinia } from 'pinia';
import { h, provide } from 'vue';
import { routerKey, routeLocationKey } from 'vue-router';

import { within, expect, userEvent } from '@storybook/test';

import type { Country } from '@/interfaces/country';
import type { Meta, StoryObj } from '@storybook/vue3';

import CountryGrid from '@/components/CountryGrid.vue';
import { CACHE_NAMESPACE, createCacheKey } from '@/store/GlobalStore';


const sampleCountries: Country[] = [
  {
    name: { common: 'Poland' },
    flags: { png: 'https://flagcdn.com/w320/pl.png', alt: 'Flag of Poland' },
    population: 37950802,
    region: 'Europe',
    capital: ['Warsaw']
  },
  {
    name: { common: 'Germany' },
    flags: { png: 'https://flagcdn.com/w320/de.png', alt: 'Flag of Germany' },
    population: 83240525,
    region: 'Europe',
    capital: ['Berlin']
  },
  {
    name: { common: 'Japan' },
    flags: { png: 'https://flagcdn.com/w320/jp.png', alt: 'Flag of Japan' },
    population: 125710000,
    region: 'Asia',
    capital: ['Tokyo']
  },
  {
    name: { common: 'Brazil' },
    flags: { png: 'https://flagcdn.com/w320/br.png', alt: 'Flag of Brazil' },
    population: 203062512,
    region: 'Americas',
    capital: ['Brasília']
  }
];

const meta: Meta<typeof CountryGrid> = {
  title: 'Components/CountryGrid',
  component: CountryGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Displays search, filter, and sorting controls with a responsive grid of countries. This story seeds cached data to avoid network calls.'
      }
    }
  },
  render: args => ({
    components: { CountryGrid },
    setup() {
      // Activate a lightweight Pinia instance for the story
      setActivePinia(createPinia());
      const global = useGlobal();
      const key = createCacheKey(CACHE_NAMESPACE.COUNTRIES, 'all');
      // Cache countries and mark as offline to avoid network calls in the story environment
      global.setCachedResponse(key, sampleCountries, 60 * 60 * 1000);
      global.setOffline(true);

      // Provide minimal router + route so useRouter()/useRoute() don't error
      provide(routerKey, { push: () => {} } as any);
      provide(
        routeLocationKey,
        {
          name: 'Home',
          params: {},
          query: {},
          hash: '',
          fullPath: '/',
          path: '/',
          meta: {},
          matched: []
        } as any
      );

      return { args };
    },
    render() {
      return h(CountryGrid, { ...this.args });
    }
  })
};

export default meta;

type Story = StoryObj<typeof meta>;

export const WithCachedCountries: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Basic smoke assertions to confirm cached countries rendered
    expect(await canvas.findByText('Poland')).toBeTruthy();
    expect(await canvas.findByText('Germany')).toBeTruthy();
  }
};

export const SearchFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Locate the search field by placeholder
    const input = (await canvas.findByPlaceholderText('Country Name')) as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, 'Bra');

    // Expect only Brazil to be shown among the sample set
    expect(await canvas.findByText('Brazil')).toBeTruthy();
  }
};
