<template>
  <v-container class="py-2 px-0 px-md-4">
    <v-breadcrumbs :items="breadcrumbs" divider="mdi-chevron-right" />
  </v-container>
  <v-container class="my-lg-5 my-md-3 my-2">
    <v-row justify="center">
      <v-col>
        <v-btn
          size="small"
          prepend-icon="mdi-arrow-left"
          text="back"
          @click="$router.push({ path: '/' })"
        ></v-btn>
      </v-col>
    </v-row>
  </v-container>
  <v-container>
    <v-row>
      <v-col cols="12" md="6">
        <v-skeleton-loader
          v-if="loadings.fetchCountryDetails"
          type="image"
          elevation="24"
          min-height="250"
          max-width="570"
          aspect-ratio="16/9"
          class="mx-auto h-100"
        ></v-skeleton-loader>
        <v-lazy v-else :min-height="170" :options="{ threshold: 0.7 }" transition="fab-transition">
          <v-img
            max-width="570"
            aspect-ratio="16/9"
            :src="country?.flags.png"
            :alt="country?.flags.alt"
            class="flag mx-auto"
          />
        </v-lazy>
      </v-col>
      <v-col cols="12" md="6" class="d-flex">
        <v-skeleton-loader
          v-if="loadings.fetchCountryDetails"
          color="transparent"
          type="article,paragraph"
        ></v-skeleton-loader>
        <v-lazy v-else class="w-100" :min-height="170" :options="{ threshold: 0.7 }" transition="fab-transition">
          <v-card color="transparent" flat max-width="570" class="detailsCard align-content-center">
            <v-card-title>{{ country?.name.common }}</v-card-title>
            <v-card-text>
              <v-row no-gutters>
                <v-col cols="12" md="6" class="d-flex flex-column">
                  <p>
                    <strong>Native Name:</strong>
                    {{ firstNativeName }}
                  </p>
                  <p>
                    <strong>Population:</strong>
                    {{ country?.population?.toLocaleString() ?? 'N/A' }}
                  </p>
                  <p>
                    <strong>Region:</strong>
                    {{ country?.region ?? 'N/A' }}
                  </p>
                  <p>
                    <strong>Sub Region:</strong>
                    {{ country?.subregion ?? 'N/A' }}
                  </p>
                  <p>
                    <strong>Capital:</strong>
                    {{ country?.capital?.[0] || 'N/A' }}
                  </p>
                </v-col>
                <v-col cols="12" md="6" class="d-flex flex-column">
                  <p>
                    <strong>Top Level Domain:</strong>
                    {{ country?.tld?.[0] || 'N/A' }}
                  </p>
                  <p>
                    <strong>Currencies:</strong>
                    {{ currencyName }}
                  </p>
                  <p>
                    <strong>Languages:</strong>
                    {{ languageList }}
                  </p>
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-text class="d-flex flex-column">
              <div class="bordersContainer d-flex flex-wrap align-center">
                <strong class="nowrap pe-3">Border Countries:</strong>
                <template v-if="loadings.fetchBorderCountries">
                  <v-progress-circular indeterminate size="20" class="ms-2" />
                </template>
                <template v-else>
                  <v-btn
                    v-for="(border, index) in borderCountriesList"
                    :key="index"
                    size="x-small"
                    class="p-2 mx-1 mb-1"
                    :text="border"
                    @click="$router.push({ name: 'CountryDetails', params: { name: border } })"
                  ></v-btn>
                </template>
              </div>
              <div
                v-if="!loadings.fetchBorderCountries && !borderCountriesList.length && !borderError"
                class="text-center mt-2"
              >
                No Borders
              </div>
              <div v-if="borderError" class="text-error mt-2">
                {{ borderError }}
              </div>
            </v-card-text>
          </v-card>
        </v-lazy>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useGlobal } from '@/store';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';

import type { Country } from '@/interfaces/country';

import apiService, {
  BORDER_COUNTRIES_CACHE_TTL_MS,
  DEFAULT_CACHE_TTL_MS
} from '@/apiService';
import { CACHE_NAMESPACE, createCacheKey } from '@/store/GlobalStore';

const globalStore = useGlobal();
const route = useRoute();

const loadings = reactive<{ fetchCountryDetails: boolean; fetchBorderCountries: boolean }>({
  fetchCountryDetails: false,
  fetchBorderCountries: false
});

const country = ref<Country | null>(null);
const borderCountries = ref<Record<string, string>>({});
const borderError = ref<string | null>(null);
const activeRequestId = ref(0);

interface BreadcrumbItem {
  title: string;
  disabled?: boolean;
  to?: RouteLocationRaw;
}

const normalizeCode = (code: string): string => code.trim().toLowerCase();

const sanitizeCountry = (data: unknown): Country | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const candidate = data as Partial<Country>;
  if (!candidate.name?.common || !candidate.flags?.png) {
    return null;
  }
  return candidate as Country;
};

const sanitizeCountryList = (data: unknown): Country[] => {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(sanitizeCountry).filter((item): item is Country => Boolean(item));
};

const resolveRouteParam = (param: unknown): string | null => {
  if (Array.isArray(param)) {
    const [first] = param;
    return typeof first === 'string' ? first : null;
  }
  return typeof param === 'string' ? param : null;
};

const extractErrorMessage = (error: unknown, fallback: string): string =>
  (error as { response?: { message?: string }; message?: string })?.response?.message ||
  (error as { message?: string })?.message ||
  fallback;

const findCountryInAggregateCache = (name: string): Country | null => {
  const cachedList = sanitizeCountryList(globalStore.getCachedResponse<Country[]>(createCacheKey(CACHE_NAMESPACE.COUNTRIES, 'all')));
  if (!cachedList.length) {
    return null;
  }
  const lowerName = name.toLowerCase();
  return cachedList.find(item => item.name?.common?.toLowerCase() === lowerName) ?? null;
};

const resolveCountryFromCache = (name: string): Country | null => {
  const nameCacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_NAME, name.toLowerCase());
  const cachedEntries = sanitizeCountryList(globalStore.getCachedResponse<Country[]>(nameCacheKey, undefined, DEFAULT_CACHE_TTL_MS));
  if (cachedEntries.length) {
    return cachedEntries[0] ?? null;
  }

  return findCountryInAggregateCache(name);
};

const buildBorderMappingFromCache = (codes: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const normalizedCodes = codes.map(normalizeCode);

  const aggregateKey = createCacheKey(CACHE_NAMESPACE.BORDER_COUNTRIES, normalizedCodes.join(','));
  const aggregateRecord = globalStore.getCachedResponse<Record<string, Country>>(
    aggregateKey,
    undefined,
    BORDER_COUNTRIES_CACHE_TTL_MS
  );

  if (aggregateRecord) {
    normalizedCodes.forEach(code => {
      const cachedCountry = aggregateRecord[code];
      if (cachedCountry?.name?.common) {
        mapping[code] = cachedCountry.name.common;
      }
    });
  }

  normalizedCodes.forEach(code => {
    if (mapping[code]) {
      return;
    }
    const perCode = globalStore.getCachedResponse<Country>(
      createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_CODE, code),
      undefined,
      DEFAULT_CACHE_TTL_MS
    );
    if (perCode?.name?.common) {
      mapping[code] = perCode.name.common;
    }
  });

  return mapping;
};

const applyBorderMapping = (mapping: Record<string, string>) => {
  borderCountries.value = mapping;
};

const loadBorderCountries = async (borders: string[] | undefined, requestId: number): Promise<void> => {
  if (requestId !== activeRequestId.value) {
    return;
  }

  borderCountries.value = {};
  borderError.value = null;

  if (!borders?.length) {
    loadings.fetchBorderCountries = false;
    return;
  }

  const normalizedCodes = borders.map(normalizeCode).filter(Boolean);
  if (!normalizedCodes.length) {
    loadings.fetchBorderCountries = false;
    return;
  }

  const cachedMapping = buildBorderMappingFromCache(normalizedCodes);
  const missingCodes = normalizedCodes.filter(code => !cachedMapping[code]);
  const offline = globalStore.isOffline();

  if (!missingCodes.length && Object.keys(cachedMapping).length) {
    applyBorderMapping(cachedMapping);
    loadings.fetchBorderCountries = false;
    return;
  }

  if (offline) {
    applyBorderMapping(cachedMapping);
    if (missingCodes.length) {
      borderError.value = `Offline mode: No cached data for ${missingCodes.map(code => code.toUpperCase()).join(', ')}`;
    }
    loadings.fetchBorderCountries = false;
    return;
  }

  loadings.fetchBorderCountries = true;
  try {
    const response = await apiService.getBorderCountriesByCodes(normalizedCodes);
    if (requestId !== activeRequestId.value) {
      return;
    }

    const mapping = { ...cachedMapping };
    response.data.forEach(borderCountry => {
      const alpha3 = borderCountry.cca3 ?? borderCountry.cca2;
      const name = borderCountry.name?.common;
      if (!alpha3 || !name) {
        return;
      }
      mapping[normalizeCode(alpha3)] = name;
    });

    applyBorderMapping(mapping);

    if (response.missingCodes.length) {
      borderError.value = `Missing data for ${response.missingCodes.join(', ')}`;
    }
  } catch (error) {
    if (requestId !== activeRequestId.value) {
      return;
    }
    const errorMessage = extractErrorMessage(error, 'Unable to load border countries.');
    borderError.value = errorMessage;
    globalStore.setMessage(errorMessage);
  } finally {
    if (requestId === activeRequestId.value) {
      loadings.fetchBorderCountries = false;
    }
  }
};

const fetchCountryDetails = async (rawName?: unknown) => {
  const requestId = ++activeRequestId.value;
  const countryName = resolveRouteParam(rawName ?? route.params.name);

  borderCountries.value = {};
  borderError.value = null;

  if (!countryName) {
    country.value = null;
    loadings.fetchCountryDetails = false;
    loadings.fetchBorderCountries = false;
    return;
  }

  loadings.fetchCountryDetails = true;
  try {
    const cachedCountry = resolveCountryFromCache(countryName);
    const offline = globalStore.isOffline();

    if (cachedCountry) {
      country.value = cachedCountry;
      await loadBorderCountries(cachedCountry.borders ?? [], requestId);
      if (offline) {
        return;
      }

      const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_NAME, countryName.toLowerCase());
      if (globalStore.isCacheFresh(cacheKey, DEFAULT_CACHE_TTL_MS)) {
        return;
      }
    } else if (offline) {
      const offlineMessage = 'Offline mode: Country details are unavailable without cached data.';
      borderError.value = offlineMessage;
      globalStore.setMessage(offlineMessage);
      return;
    }

    const response = await apiService.getCountryByName(countryName);
    if (requestId !== activeRequestId.value) {
      return;
    }

    const sanitized = sanitizeCountryList(response.data);
    country.value = sanitized[0] ?? null;

    if (!country.value) {
      throw new Error('Country data is unavailable.');
    }

    await loadBorderCountries(country.value.borders ?? [], requestId);
  } catch (error) {
    if (requestId !== activeRequestId.value) {
      return;
    }
    const errorMessage = extractErrorMessage(error, 'An error has occurred');
    borderCountries.value = {};
    borderError.value = errorMessage;
    globalStore.setMessage(errorMessage);
  } finally {
    if (requestId === activeRequestId.value) {
      loadings.fetchCountryDetails = false;
    }
  }
};

watch(
  () => route.params.name,
  newName => {
    void fetchCountryDetails(newName);
  },
  { immediate: true }
);

watch(
  () => globalStore.isOffline(),
  offline => {
    if (offline && country.value) {
      const cachedBorderMapping = buildBorderMappingFromCache(country.value.borders ?? []);
      if (Object.keys(cachedBorderMapping).length) {
        applyBorderMapping(cachedBorderMapping);
      }
    }
  }
);

const languageList = computed(() => {
  return Object.values(country.value?.languages || {})
    .reverse()
    .join(', ');
});

const currencyName = computed(() => {
  return Object.values(country.value?.currencies || {})
    .map(currency => `${currency.name}`)
    .join(', ');
});

const firstNativeName = computed(() => {
  if (country.value?.name.nativeName) {
    const keys = Object.keys(country.value.name.nativeName);
    const lastKey = keys[keys.length - 1];
    return country.value.name.nativeName[lastKey]?.common;
  }
  return undefined;
});

const borderCountriesList = computed(() => {
  if (!country.value?.borders) {
    return [];
  }

  return country.value.borders
    .map(borderCode => borderCountries.value[normalizeCode(borderCode)])
    .filter((name): name is string => Boolean(name));
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [];

  route.matched.forEach((record, index) => {
    const isLast = index === route.matched.length - 1;
    const resolver = record.meta?.breadcrumb;
    let title: string | undefined;

    if (typeof resolver === 'function') {
      title = resolver(route);
    } else if (typeof resolver === 'string') {
      title = resolver;
    } else if (typeof record.name === 'string') {
      title = record.name;
    }

    if (!title) {
      return;
    }

    items.push({
      title,
      disabled: isLast,
      to: !isLast && typeof record.name === 'string' ? { name: record.name } : undefined
    });
  });

  return items;
});
</script>

<style scoped>
.detailsCard {
  p {
    margin-bottom: 10px;
  }
}

.nowrap {
  text-wrap: nowrap;
}
:deep(.v-skeleton-loader__image) {
  height: 100%;
}
.flag {
  max-height: 300px;
}
</style>
