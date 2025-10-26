import { useGlobal } from '@/store';
import { createPinia } from 'pinia';
import { getCurrentInstance, onUnmounted } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import type { Country } from '@/interfaces/country';
import type { Meta, StoryObj } from '@storybook/vue3';

import apiService, {
  DEFAULT_CACHE_TTL_MS,
  BORDER_COUNTRIES_CACHE_TTL_MS
} from '@/apiService';
import { CACHE_NAMESPACE, createCacheKey } from '@/store/GlobalStore';
import CountryDetails from '@/views/CountryDetails.vue';

const baseCountry: Country = {
  name: {
    common: 'Lithuania',
    nativeName: { lit: { common: 'Lietuva', official: 'Lietuvos Respublika' } }
  },
  flags: {
    png: 'https://flagcdn.com/w640/lt.png',
    alt: 'Flag of Lithuania'
  },
  population: 2794700,
  region: 'Europe',
  subregion: 'Northern Europe',
  capital: ['Vilnius'],
  tld: ['.lt'],
  languages: { lit: 'Lithuanian' },
  currencies: { EUR: { name: 'Euro', symbol: 'EUR' } },
  borders: ['LVA', 'BLR', 'POL', 'RUS'],
  timezones: ['UTC+02:00']
};

const defaultBorderCountries: Country[] = [
  {
    name: { common: 'Latvia' },
    cca3: 'LVA',
    flags: { png: 'https://flagcdn.com/w320/lv.png' },
    population: 1840000,
    region: 'Europe',
    tld: ['.lv']
  },
  {
    name: { common: 'Belarus' },
    cca3: 'BLR',
    flags: { png: 'https://flagcdn.com/w320/by.png' },
    population: 9418000,
    region: 'Europe',
    tld: ['.by']
  },
  {
    name: { common: 'Poland' },
    cca3: 'POL',
    flags: { png: 'https://flagcdn.com/w320/pl.png' },
    population: 37950000,
    region: 'Europe',
    tld: ['.pl']
  },
  {
    name: { common: 'Russia' },
    cca3: 'RUS',
    flags: { png: 'https://flagcdn.com/w320/ru.png' },
    population: 144000000,
    region: 'Europe',
    tld: ['.ru']
  }
];

const originalApi = {
  getCountryByName: apiService.getCountryByName,
  getBorderCountriesByCodes: apiService.getBorderCountriesByCodes
};

interface ScenarioConfig {
  countryOverrides?: Partial<Country>;
  borders?: Country[];
  missingCodes?: string[];
  borderFromCache?: boolean;
  loadingOnly?: boolean;
  offline?: boolean;
  emptyBorders?: boolean;
  routeName?: string;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const configureScenarioApi = (config: ScenarioConfig, store: ReturnType<typeof useGlobal>) => {
  const scenarioBorders = config.emptyBorders
    ? []
    : config.countryOverrides?.borders ??
      (config.borders
        ? config.borders
            .map(border => (border.cca3 ?? border.cca2 ?? '').toUpperCase())
            .filter(Boolean)
        : baseCountry.borders ?? []);

  const scenarioCountry: Country = {
    ...baseCountry,
    ...config.countryOverrides,
    borders: scenarioBorders
  };

  const borderSet = config.emptyBorders
    ? []
    : config.borders ?? defaultBorderCountries.slice(0, scenarioCountry.borders?.length ?? 0);

  Object.assign(apiService, {
    async getCountryByName(_name: string) {
      if (config.loadingOnly) {
        return new Promise(() => {
          /* keep pending to render skeletons */
        }) as any;
      }

      await wait(10);
      return { data: [scenarioCountry] } as any;
    },
    async getBorderCountriesByCodes(_codes: string[]) {
      if (config.loadingOnly) {
        return new Promise(() => {
          /* keep pending */
        }) as any;
      }

      await wait(10);
      return {
        data: borderSet,
        missingCodes: config.missingCodes ?? [],
        fromCache: Boolean(config.borderFromCache)
      } as any;
    }
  });

  store.invalidateCache();
  store.setOffline(Boolean(config.offline));

  if (config.offline) {
    const lowerName = scenarioCountry.name.common.toLowerCase();
    store.setCachedResponse(
      createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_NAME, lowerName),
      [scenarioCountry],
      DEFAULT_CACHE_TTL_MS
    );

    if (scenarioCountry.borders?.length) {
      const normalizedCodes = scenarioCountry.borders.map(code => code.toLowerCase());
      const aggregateKey = createCacheKey(CACHE_NAMESPACE.BORDER_COUNTRIES, normalizedCodes.join(','));
      const mapping: Record<string, Country> = {};

      normalizedCodes.forEach((code, index) => {
        const neighbor = borderSet[index];
        if (!neighbor) {
          return;
        }
        mapping[code] = neighbor;
        store.setCachedResponse(
          createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_CODE, code),
          neighbor,
          DEFAULT_CACHE_TTL_MS
        );
      });

      store.setCachedResponse(aggregateKey, mapping, BORDER_COUNTRIES_CACHE_TTL_MS);
    }
  }
};

const createScenarioStory = (config: ScenarioConfig = {}): StoryObj<typeof CountryDetails> => ({
  render: () => ({
    components: { CountryDetails },
    async setup() {
      const instance = getCurrentInstance();
      const pinia = createPinia();
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/', name: 'Home', component: { template: '<div />' }, meta: { breadcrumb: 'Home' } },
          {
            path: '/:name',
            name: 'CountryDetails',
            component: { template: '<div />' },
            meta: { breadcrumb: (route: any) => route.params.name }
          }
        ]
      });

      instance?.appContext.app.use(pinia);
      instance?.appContext.app.use(router);

      const target = `/${config.routeName ?? baseCountry.name.common}`;
      await router.push(target);
      await router.isReady();

      Object.assign(apiService, originalApi);

      const store = useGlobal();
      configureScenarioApi(config, store);

      onUnmounted(() => {
        Object.assign(apiService, originalApi);
        store.setOffline(false);
      });

      return {};
    },
    template: '<CountryDetails />'
  })
});

const meta: Meta<typeof CountryDetails> = {
  title: 'Views/CountryDetails',
  component: CountryDetails,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
};

export default meta;

export const Loaded = createScenarioStory();

export const LoadingSkeleton = createScenarioStory({ loadingOnly: true });

export const NoBorders = createScenarioStory({ emptyBorders: true, borders: [] });

export const OfflineCache = createScenarioStory({
  offline: true,
  borderFromCache: true
});

export const FlagFallback = createScenarioStory({
  countryOverrides: {
    flags: {
      png: 'https://example.invalid/broken.png',
      svg: 'https://flagcdn.com/be.svg',
      alt: 'Flag of Belgium'
    },
    coatOfArms: {
      svg: 'https://mainfacts.com/media/images/coats_of_arms/be.svg'
    }
  }
});

export const FlagPlaceholder = createScenarioStory({
  countryOverrides: {
    flags: {
      png: 'https://example.invalid/missing.png',
      alt: 'Unavailable flag'
    },
    coatOfArms: undefined
  }
});
