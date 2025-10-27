<template>
  <v-container class="country-details py-4 py-md-6" aria-labelledby="details-heading">
    <section
      class="country-details__hero"
      role="region"
      :aria-busy="loadings.fetchCountryDetails"
      data-test="country-hero"
    >
      <v-row class="country-details__hero-grid" align="stretch">
        <v-col cols="12">
          <div
            class="country-details__nav d-flex flex-column flex-md-row align-md-center justify-space-between"
          >
            <nav aria-label="Breadcrumb" class="country-details__breadcrumbs">
              <v-breadcrumbs :items="breadcrumbs" divider="mdi-chevron-right" />
            </nav>
            <v-btn
              variant="outlined"
              density="comfortable"
              prepend-icon="mdi-arrow-left"
              text="Back"
              aria-label="Back to results"
              class="country-details__back"
              @click="$router.push({ path: '/' })"
            ></v-btn>
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <div class="country-details__media">
            <v-skeleton-loader
              v-if="loadings.fetchCountryDetails"
              type="image"
              class="country-details__flag-skeleton"
            />
            <template v-else>
              <v-responsive :aspect-ratio="16 / 10" class="country-details__flag-shell">
                <template v-if="heroFlagUrl">
                  <v-img
                    :key="heroFlagUrl"
                    :src="heroFlagUrl"
                    :alt="flagAltText"
                    cover
                    class="country-details__flag"
                    @error="onFlagLoadError"
                  >
                    <template #placeholder>
                      <v-skeleton-loader type="image" class="country-details__flag-skeleton" />
                    </template>
                  </v-img>
                </template>
                <v-sheet
                  v-else
                  rounded="lg"
                  elevation="1"
                  class="country-details__flag-placeholder"
                  data-test="flag-placeholder"
                >
                  <v-icon icon="mdi-flag-off" size="40" class="mb-1" />
                  <span>No flag available</span>
                </v-sheet>
              </v-responsive>
            </template>
          </div>
        </v-col>
        <v-col cols="12" md="6" class="d-flex">
          <v-skeleton-loader
            v-if="loadings.fetchCountryDetails"
            type="article"
            class="country-details__summary-skeleton"
          ></v-skeleton-loader>
          <v-card
            v-else
            color="surface"
            elevation="2"
            class="country-details__summary"
          >
            <v-card-title>
              <h1 id="details-heading" ref="detailsHeading" tabindex="-1" class="mb-2">
                {{ country?.name.common ?? 'Unknown country' }}
              </h1>
            </v-card-title>
            <v-card-text class="summary-card__content">
              <dl class="summary-list">
                <div class="summary-list__item">
                  <dt>Native name</dt>
                  <dd>{{ firstNativeName ?? 'N/A' }}</dd>
                </div>
                <div class="summary-list__item">
                  <dt>Population</dt>
                  <dd>{{ formattedPopulation }}</dd>
                </div>
                <div class="summary-list__item">
                  <dt>Region</dt>
                  <dd>{{ country?.region ?? 'N/A' }}</dd>
                </div>
                <div class="summary-list__item">
                  <dt>Subregion</dt>
                  <dd>{{ country?.subregion ?? 'N/A' }}</dd>
                </div>
                <div class="summary-list__item">
                  <dt>Timezones</dt>
                  <dd>{{ timezoneList }}</dd>
                </div>
              </dl>
              <div class="summary-borders" aria-live="polite">
                <span class="summary-borders__label text-caption text-uppercase">Border countries</span>
                <div class="summary-borders__chips" v-if="borderCountriesList.length">
                  <v-chip
                    v-for="border in borderCountriesList"
                    :key="border"
                    variant="tonal"
                    density="comfortable"
                    class="summary-borders__chip"
                    data-test="border-chip"
                    @click="$router.push({ name: 'CountryDetails', params: { name: border } })"
                  >
                    <v-icon icon="mdi-earth" size="18" class="me-1" />
                    {{ border }}
                  </v-chip>
                </div>
                <p v-else-if="!loadings.fetchBorderCountries && !borderError" class="summary-borders__empty">
                  No border countries
                </p>
                <div class="summary-borders__footer">
                  <v-progress-circular
                    v-if="loadings.fetchBorderCountries"
                    indeterminate
                    size="18"
                    class="me-2"
                  />
                  <span v-if="borderNotice" class="summary-borders__notice">{{ borderNotice }}</span>
                  <span v-if="borderError" class="summary-borders__error">{{ borderError }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <section class="country-details__quick-facts mt-8" aria-live="polite">
      <header class="country-details__section-heading">
        <h2 class="text-h5 text-md-h4 mb-3">Quick facts</h2>
      </header>
      <v-row v-if="loadings.fetchCountryDetails" class="quick-facts__skeleton-row">
        <v-col
          v-for="index in 4"
          :key="`quick-fact-skeleton-${index}`"
          cols="12"
          md="6"
          lg="3"
        >
          <v-skeleton-loader type="card" class="quick-fact__skeleton" />
        </v-col>
      </v-row>
      <v-row v-else-if="country" class="quick-facts__grid">
        <v-col
          v-for="fact in quickFacts"
          :key="fact.label"
          cols="12"
          md="6"
          lg="3"
        >
          <v-card variant="outlined" class="quick-fact" data-test="quick-fact-card">
            <div class="quick-fact__icon">
              <v-icon :icon="fact.icon" size="28" />
            </div>
            <div class="quick-fact__content">
              <span class="quick-fact__label">{{ fact.label }}</span>
              <span class="quick-fact__value">{{ fact.value }}</span>
            </div>
          </v-card>
        </v-col>
      </v-row>
      <p v-else class="quick-facts__empty">Country details are unavailable.</p>
    </section>

  </v-container>
</template>

<script setup lang="ts">
import { useGlobal } from '@/store';
import { computed, reactive, ref, watch, nextTick } from 'vue';
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
const detailsHeading = ref<HTMLElement | null>(null);
const borderCountries = ref<Record<string, string>>({});
const borderError = ref<string | null>(null);
const borderNotice = ref<string | null>(null);
const flagSourceIndex = ref(0);
const activeRequestId = ref(0);

interface BreadcrumbItem {
  title: string;
  disabled?: boolean;
  to?: RouteLocationRaw;
}

interface QuickFact {
  label: string;
  value: string;
  icon: string;
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
  borderNotice.value = null;

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
  const hasCachedData = Object.keys(cachedMapping).length > 0;

  if (!missingCodes.length && hasCachedData) {
    applyBorderMapping(cachedMapping);
    borderNotice.value = offline ? 'Offline: Showing cached border data' : 'Showing cached border data';
    loadings.fetchBorderCountries = false;
    return;
  }

  if (offline) {
    if (hasCachedData) {
      applyBorderMapping(cachedMapping);
      borderNotice.value = 'Offline: Showing cached border data';
    }
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
    borderNotice.value = response.fromCache ? 'Showing cached border data' : null;

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
  borderNotice.value = null;

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
    await nextTick();
    detailsHeading.value?.focus?.();
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
  () => country.value?.cca3 ?? country.value?.name.common ?? null,
  () => {
    flagSourceIndex.value = 0;
  }
);

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
        borderNotice.value = 'Offline: Showing cached border data';
      }
    } else if (!offline && borderNotice.value?.startsWith('Offline')) {
      borderNotice.value = null;
    }
  }
);

const flagSources = computed(() => {
  const sources: string[] = [];
  const flags = country.value?.flags;
  const coat = country.value?.coatOfArms;

  if (flags?.png) {
    sources.push(flags.png);
  }
  if (flags?.svg && !sources.includes(flags.svg)) {
    sources.push(flags.svg);
  }
  if (coat?.png) {
    sources.push(coat.png);
  }
  if (coat?.svg && !sources.includes(coat.svg)) {
    sources.push(coat.svg);
  }

  return sources;
});

const heroFlagUrl = computed(() => {
  return flagSources.value[flagSourceIndex.value] ?? null;
});

const flagAltText = computed(() => {
  return country.value?.flags?.alt || `${country.value?.name.common ?? 'Country'} flag`;
});

const onFlagLoadError = () => {
  if (!flagSources.value.length) {
    flagSourceIndex.value = 0;
    return;
  }

  if (flagSourceIndex.value < flagSources.value.length - 1) {
    flagSourceIndex.value += 1;
    return;
  }

  flagSourceIndex.value = flagSources.value.length;
};

watch(flagSources, sources => {
  if (!sources.length) {
    flagSourceIndex.value = 0;
    return;
  }

  if (flagSourceIndex.value > sources.length) {
    flagSourceIndex.value = 0;
  }
});

const languageList = computed(() => {
  const languages = Object.values(country.value?.languages ?? {});
  return languages.length ? languages.join(', ') : 'N/A';
});

const currencyList = computed(() => {
  const currencies = Object.values(country.value?.currencies ?? {});
  return currencies.length ? currencies.map(currency => currency.name).join(', ') : 'N/A';
});

const formattedPopulation = computed(() => {
  const population = country.value?.population;
  return typeof population === 'number' ? population.toLocaleString() : 'N/A';
});

const capitalList = computed(() => {
  const capitalValues = country.value?.capital ?? [];
  return capitalValues.length ? capitalValues.join(', ') : 'N/A';
});

const topLevelDomains = computed(() => {
  const tlds = country.value?.tld ?? [];
  return tlds.length ? tlds.join(', ') : 'N/A';
});

const timezoneList = computed(() => {
  const timezones = country.value?.timezones ?? [];
  return timezones.length ? timezones.join(', ') : 'N/A';
});

const quickFacts = computed<QuickFact[]>(() => {
  if (!country.value) {
    return [];
  }

  return [
    { label: 'Capital', value: capitalList.value, icon: 'mdi-city' },
    { label: 'Top-level domain', value: topLevelDomains.value, icon: 'mdi-domain' },
    { label: 'Currencies', value: currencyList.value, icon: 'mdi-currency-usd' },
    { label: 'Languages', value: languageList.value, icon: 'mdi-translate' }
  ];
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
.country-details {
  max-width: 1200px;
  padding-block: clamp(16px, 4vw, 32px);
}

.country-details__hero {
  row-gap: 1.5rem;
}

.country-details__nav {
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.country-details__back {
  align-self: flex-start;
}

.country-details__media {
  display: flex;
  justify-content: center;
}

.country-details__flag-shell {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 32px -20px rgba(0, 0, 0, 0.45);
}

.country-details__flag {
  width: 100%;
  height: 100%;
}

.country-details__flag-placeholder {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--v-theme-on-surface-variant);
}

.country-details__summary {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-inline: clamp(12px, 3vw, 20px);
}

.summary-card__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-list {
  display: grid;
  row-gap: 0.6rem;
}

.summary-list__item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-list__item dt {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--v-theme-on-surface-variant);
}

.summary-list__item dd {
  margin: 0;
  font-weight: 600;
  color: var(--v-theme-on-surface);
}

.summary-borders {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-borders__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.summary-borders__chip {
  cursor: pointer;
}

.summary-borders__empty {
  margin: 0;
  color: var(--v-theme-on-surface-variant);
}

.summary-borders__footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 1rem;
}

.summary-borders__notice {
  color: var(--v-theme-on-surface-variant);
  font-size: 0.85rem;
}

.summary-borders__error {
  color: var(--v-theme-error);
  font-weight: 600;
  font-size: 0.85rem;
}

.country-details__quick-facts {
  margin-top: clamp(24px, 4vw, 40px);
}

.quick-facts__grid,
.quick-facts__skeleton-row {
  row-gap: 0.85rem;
}

.quick-fact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  min-height: 96px;
}

.quick-fact__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--v-theme-surface-variant);
  color: var(--v-theme-on-surface-variant);
}

.quick-fact__label {
  display: block;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--v-theme-on-surface-variant);
}

.quick-fact__value {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: var(--v-theme-on-surface);
  word-break: break-word;
}

.quick-facts__empty {
  margin: 0.75rem 0 0;
}

.country-details__flag-skeleton {
  min-height: 260px;
}

.country-details__flag-skeleton,
.country-details__summary-skeleton,
.quick-fact__skeleton {
  border-radius: 16px;
}

@media (min-width: 960px) {
  .summary-list__item {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
  }

  .summary-list__item dt {
    min-width: 140px;
  }
}

:deep(.v-skeleton-loader__image) {
  height: 100%;
}
</style>
