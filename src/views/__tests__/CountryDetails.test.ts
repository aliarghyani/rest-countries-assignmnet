/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import CountryDetails from '@/views/CountryDetails.vue';
import { useGlobal } from '@/store';

const { getCountryByNameMock, getBorderCountriesByCodesMock } = vi.hoisted(() => ({
  getCountryByNameMock: vi.fn(),
  getBorderCountriesByCodesMock: vi.fn()
}));

vi.mock('@/apiService', () => ({
  __esModule: true,
  default: {
    getCountryByName: getCountryByNameMock,
    getBorderCountriesByCodes: getBorderCountriesByCodesMock,
    getCountries: vi.fn(),
    searchCountries: vi.fn(),
    getCountryByCode: vi.fn()
  }
}));

const { pushMock, routeStub } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  routeStub: { params: { name: 'poland' } }
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeStub,
  useRouter: () => ({ push: pushMock }),
  RouterLink: { template: '<a><slot /></a>' }
}));

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
    getCountryByNameMock.mockResolvedValue({ data: [baseCountry] });
    getBorderCountriesByCodesMock.mockResolvedValue({
      data: [borderCountry],
      missingCodes: [],
      fromCache: false
    });
    pushMock.mockReset();
    pinia = createPinia();
    setActivePinia(pinia);
    const store = useGlobal();
    store.invalidateCache();
    store.setOffline(false);
  });

  it('renders country details and loads borders', async () => {
    const wrapper = mount(CountryDetails, {
      global: {
        plugins: [pinia],
        stubs
      }
    });

    await flushPromises();

    expect(getCountryByNameMock).toHaveBeenCalledWith('poland');
    expect(getBorderCountriesByCodesMock).toHaveBeenCalledWith(['DEU']);
    expect(wrapper.text()).toContain('Poland');
    expect(wrapper.findAll('[data-test="border-btn"]').length).toBeGreaterThan(0);

    await wrapper.find('[data-test="border-btn"]').trigger('click');
    expect(pushMock).toHaveBeenCalled();
  });
});


