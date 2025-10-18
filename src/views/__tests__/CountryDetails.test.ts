/// <reference types="vitest" />
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive } from 'vue';

const apiMocks = vi.hoisted(() => ({
  getCountryByName: vi.fn(),
  getBorderCountriesByCodes: vi.fn()
}));

const routerPush = vi.hoisted(() => vi.fn());

const routeState = vi.hoisted(() => ({
  params: { name: 'poland' },
  matched: [{ name: 'Home', meta: { breadcrumb: 'Home' } }],
  query: {}
}));

vi.mock('@/apiService', () => ({
  __esModule: true,
  default: {
    getCountryByName: apiMocks.getCountryByName,
    getBorderCountriesByCodes: apiMocks.getBorderCountriesByCodes,
    getCountries: vi.fn(),
    searchCountries: vi.fn(),
    getCountryByCode: vi.fn()
  },
  DEFAULT_CACHE_TTL_MS: 300000,
  BORDER_COUNTRIES_CACHE_TTL_MS: 600000
}));

vi.mock('vue-router', () => ({
  useRoute: () => reactive(routeState),
  useRouter: () => ({ push: routerPush }),
  RouterLink: { template: '<a><slot /></a>' }
}));

import CountryDetails from '@/views/CountryDetails.vue';

import { useGlobal } from '@/store';

const stubs = {
  'v-container': { template: '<div class="v-container"><slot /></div>' },
  'v-row': { template: '<div class="v-row"><slot /></div>' },
  'v-col': { template: '<div class="v-col"><slot /></div>' },
  'v-breadcrumbs': { template: '<nav><slot /></nav>' },
  'v-btn': {
    emits: ['click'],
    template: '<button data-test="border-btn" type="button" @click="$emit(\'click\')"><slot /></button>'
  },
  'v-skeleton-loader': { template: '<div class="skeleton"><slot /></div>' },
  'v-lazy': { template: '<div><slot /></div>' },
  'v-img': { props: ['src'], template: '<img :src="src" />' },
  'v-card': { template: '<div class="v-card"><slot /></div>' },
  'v-card-title': { template: '<h2><slot /></h2>' },
  'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
  'v-progress-circular': { template: '<div class="progress" />' }
};

const baseCountry = {
  name: { common: 'Poland', nativeName: { pol: { common: 'Polska', official: 'Rzeczpospolita Polska' } } },
  flags: { png: 'poland.png', alt: 'Flag of Poland' },
  population: 123,
  region: 'Europe',
  subregion: 'Central Europe',
  capital: ['Warsaw'],
  tld: ['.pl'],
  languages: { pol: 'Polish' },
  currencies: { PLN: { name: 'Polish zloty' } },
  borders: ['DEU']
};

const borderCountry = {
  name: { common: 'Germany' },
  cca3: 'DEU',
  flags: { png: 'germany.png' },
  population: 200,
  region: 'Europe'
};

describe('CountryDetails', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    apiMocks.getCountryByName.mockReset();
    apiMocks.getBorderCountriesByCodes.mockReset();
    routerPush.mockReset();

    apiMocks.getCountryByName.mockResolvedValue({ data: [baseCountry] });
    apiMocks.getBorderCountriesByCodes.mockResolvedValue({
      data: [borderCountry],
      missingCodes: [],
      fromCache: false
    });

    // Update hoisted mutable object without calling reactive()
    Object.assign(routeState.params, { name: 'poland' });
    routeState.matched = [{ name: 'Home', meta: { breadcrumb: 'Home' } }];
    routeState.query = {};

    const store = useGlobal();
    store.invalidateCache();
    store.setOffline(false);
  });

  it('renders country details and loads borders', async () => {
    const wrapper = mount(CountryDetails, {
      global: {
        plugins: [pinia],
        stubs,
        mocks: { $router: { push: routerPush } }
      }
    });

    await flushPromises();

    expect(apiMocks.getCountryByName).toHaveBeenCalledWith('poland');
    expect(apiMocks.getBorderCountriesByCodes).toHaveBeenCalledWith(['deu']);
    expect(wrapper.text()).toContain('Poland');
    expect(wrapper.findAll('[data-test="border-btn"]').length).toBeGreaterThan(0);

    await wrapper.find('[data-test="border-btn"]').trigger('click');
    expect(routerPush).toHaveBeenCalled();
  });

  it('handles API errors gracefully and shows message', async () => {
    apiMocks.getCountryByName.mockRejectedValueOnce(new Error('Boom'));
    const wrapper = mount(CountryDetails, {
      global: { plugins: [pinia], stubs, mocks: { $router: { push: routerPush } } }
    });
    await flushPromises();
    // Displays underlying error message
    expect(wrapper.text()).toContain('Boom');
  });
});
