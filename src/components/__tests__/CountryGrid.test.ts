/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import { useGlobal } from '@/store';

const getCountriesMock = vi.hoisted(() => vi.fn());
const searchCountriesMock = vi.hoisted(() => vi.fn());
const noop = vi.hoisted(() => vi.fn());
const route = vi.hoisted(() => reactive<{ query: Record<string, unknown> }>({ query: {} }));
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock('@/apiService', () => ({
  __esModule: true,
  default: {
    getCountries: getCountriesMock,
    searchCountries: searchCountriesMock,
    getCountryByName: noop,
    getCountryByCode: noop,
    getBorderCountriesByCodes: noop
  },
  COUNTRIES_CACHE_TTL_MS: 600000,
  DEFAULT_CACHE_TTL_MS: 300000,
  BORDER_COUNTRIES_CACHE_TTL_MS: 600000
}));

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    replace: (location: { query?: Record<string, unknown> }) => {
      const nextQuery = location.query ?? {};
      route.query = { ...nextQuery };
      replaceMock(location);
      return Promise.resolve();
    }
  }),
  RouterLink: { template: '<a><slot /></a>' }
}));

import CountryGrid from '@/components/CountryGrid.vue';

const sampleCountries = [
  {
    name: { common: 'Poland' },
    flags: { png: 'poland.png' },
    population: 100,
    region: 'Europe'
  },
  {
    name: { common: 'Germany' },
    flags: { png: 'germany.png' },
    population: 200,
    region: 'Europe'
  },
  {
    name: { common: 'Canada' },
    flags: { png: 'canada.png' },
    population: 300,
    region: 'Americas'
  }
];

const stubs = {
  'v-container': { template: '<div class="v-container"><slot /></div>' },
  'v-row': { template: '<div class="v-row"><slot /></div>' },
  'v-col': { template: '<div class="v-col"><slot /></div>' },
  'v-breadcrumbs': { template: '<nav class="breadcrumbs"><slot /></nav>' },
  'v-text-field': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `<input data-test="search-input" :value="modelValue ?? ''" @input="$emit('update:modelValue', $event.target.value)" />`
  },
  'v-select': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
  },
  'v-progress-circular': { template: '<span class="progress" />' },
  'v-skeleton-loader': { template: '<div class="skeleton"><slot /></div>' },
  'v-lazy': { template: '<div><slot /></div>' },
  'v-chip': {
    emits: ['click'],
    template: '<button data-test="suggestion" type="button" @click="$emit(\'click\')"><slot /></button>'
  },
  'v-btn': {
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
  },
  SingleCountry: {
    props: ['country'],
    template: '<div class="country-card">{{ country.name.common }}</div>'
  }
};

async function mountGrid() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useGlobal();
  store.invalidateCache();
  store.clearSearchSuggestions();
  store.searchAnalytics = [];
  store.setOffline(false);
  route.query = {};

  const wrapper = mount(CountryGrid, {
    global: {
      plugins: [pinia],
      stubs
    }
  });

  await flushPromises();
  return { wrapper, store };
}

describe('CountryGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getCountriesMock.mockReset();
    searchCountriesMock.mockReset();
    replaceMock.mockReset();
    getCountriesMock.mockResolvedValue({ data: sampleCountries });
    searchCountriesMock.mockResolvedValue({ data: [sampleCountries[0]] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('loads countries and renders cards', async () => {
    const { wrapper } = await mountGrid();
    expect(getCountriesMock).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.country-card')).toHaveLength(sampleCountries.length);
  });

  it('performs debounced search and updates suggestions', async () => {
    const { wrapper, store } = await mountGrid();
    const input = wrapper.find('[data-test="search-input"]');
    await input.setValue('Pol');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(searchCountriesMock).toHaveBeenCalledWith('pol');
    expect(store.searchAnalytics.length).toBeGreaterThan(0);
    const suggestions = wrapper.findAll('[data-test="suggestion"]');
    expect(suggestions.length).toBeGreaterThan(0);

    await suggestions[0].trigger('click');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect((wrapper.find('[data-test="search-input"]').element as HTMLInputElement).value).toBe(
      suggestions[0].text()
    );
  });
});
