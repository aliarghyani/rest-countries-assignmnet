<template>
  <v-container class="py-2 px-0 px-md-4">
    <v-breadcrumbs :items="breadcrumbs" divider="mdi-chevron-right" />
  </v-container>
  <v-container class="fill-height">
    <v-row no-gutters class="d-flex flex-row align-items-center justify-space-between">
      <v-col cols="12" sm="4" md="4">
        <v-text-field
          v-model="searchQuery"
          placeholder="Country Name"
          label="Search for a country"
          prepend-inner-icon="mdi-magnify"
          variant="solo"
          :clearable="true"
          :loading="isSearching"
          :error-messages="searchError ? [searchError] : undefined"
        />
        <div v-if="searchSuggestions.length" class="d-flex flex-wrap ga-2 mt-2">
          <v-chip
            v-for="suggestion in searchSuggestions"
            :key="suggestion"
            variant="outlined"
            size="small"
            @click="applySuggestion(suggestion)"
          >
            {{ suggestion }}
          </v-chip>
        </div>
      </v-col>

      <v-col cols="12" sm="4" md="3">
        <v-select
          v-model="selectedRegion"
          :items="regions"
          label="Filter by Region"
          placeholder="Select a region"
          :loading="loadings.getCountries"
          :disabled="loadings.getCountries"
          :error-messages="errorMessages"
          menu-icon="mdi-chevron-down"
          variant="solo"
          :clearable="true"
        ></v-select>
      </v-col>

      <v-col cols="12" sm="3" md="3">
        <v-select
          v-model="selectedSortOption"
          :items="sortOptions"
          label="Sort By"
          placeholder="Select Option"
          :loading="loadings.getCountries"
          :disabled="loadings.getCountries"
          :error-messages="errorMessages"
          menu-icon="mdi-chevron-down"
          variant="solo"
          :clearable="true"
        ></v-select>
      </v-col>
    </v-row>
  </v-container>

  <v-container class="fill-height">
    <v-row no-gutters>
      <v-col
        v-for="country in filteredCountries"
        :key="country.name.common"
        cols="12"
        md="4"
        lg="3"
        sm="6"
        xl="2"
        class="mb-10 pa-2"
      >
        <v-lazy :min-height="170" :options="{ threshold: 0.7 }" transition="fab-transition">
          <SingleCountry
            v-model:is-loaded="isLoaded[country.name.common]"
            :country="country"
          ></SingleCountry>
        </v-lazy>
      </v-col>

      <v-col
        v-if="filteredCountries?.length === 0 && !loadings.getCountries"
        class="justify-center d-flex"
        cols="12"
      >
        <strong class="text-center mt-5 fw-bold">No results found for your search criteria.</strong>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useGlobal } from '@/store';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
  type RouteLocationRaw
} from 'vue-router';

import Fuse from 'fuse.js';

import type { Country } from '@/interfaces/country';

import apiService, { COUNTRIES_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS } from '@/apiService';
import SingleCountry from '@/components/SingleCountry.vue';
import { CACHE_NAMESPACE, createCacheKey } from '@/store/GlobalStore';

interface SortOption {
  title: string;
  value: 'population' | 'name';
}

interface BreadcrumbItem {
  title: string;
  disabled?: boolean;
  to?: RouteLocationRaw;
}

const DEBOUNCE_MS = 250;
const SUGGESTION_LIMIT = 8;

const globalStore = useGlobal();
const countriesCacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRIES, 'all');
const searchSuggestions = computed(() => globalStore.searchSuggestions);

const countries = ref<Country[]>([]);
const regions = ref<string[]>([]);
const sortOptions = ref<SortOption[]>([
  { title: 'Population', value: 'population' },
  { title: 'Country Name', value: 'name' }
]);

const selectedSortOption = ref<'population' | 'name' | null>(null);
const loadings = reactive<{ getCountries: boolean }>({ getCountries: false });
const errorMessages = ref<string[]>([]);
const selectedRegion = ref<string | null>(null);
const searchQuery = ref<string | null>(null);
const searchResults = ref<Country[]>([]);
const isSearching = ref(false);
const searchError = ref<string | null>(null);
const activeSearchQuery = ref<string | null>(null);
const isLoaded = ref<Record<string, boolean>>({});
const router = useRouter();
const route = useRoute();

const MANAGED_QUERY_KEYS = new Set(['region', 'sort', 'search']);
const VALID_SORT_OPTIONS: ReadonlySet<'population' | 'name'> = new Set(['population', 'name']);

const fuseOptions = {
  keys: ['name.common', 'capital', 'region'],
  threshold: 0.4,
  minMatchCharLength: 1,
  shouldSort: true
};
let fuse: Fuse<Country> | null = null;
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

const sanitizeCountries = (data: unknown): Country[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((item: unknown): item is Country => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const candidate = item as Partial<Country>;
    return Boolean(candidate.name?.common && candidate.flags?.png);
  });
};

const applyCountriesState = (list: Country[]) => {
  countries.value = list;
  regions.value = Array.from(new Set(list.map(item => item.region))).filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
  fuse = new Fuse(list, fuseOptions);
  const loadedState: Record<string, boolean> = {};
  list.forEach(country => {
    loadedState[country.name.common] = isLoaded.value[country.name.common] ?? false;
  });
  isLoaded.value = loadedState;

  if (!normalizeSearchValue(searchQuery.value)) {
    globalStore.setSearchSuggestions(
      list.slice(0, SUGGESTION_LIMIT).map(country => country.name.common)
    );
  }
};

const normalizeSearchValue = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractFirstString = (candidate: unknown): string | null => {
  if (Array.isArray(candidate)) {
    const [first] = candidate;
    return typeof first === 'string' ? first : null;
  }

  return typeof candidate === 'string' ? candidate : null;
};

const toQueryRecord = (query: LocationQuery | LocationQueryRaw, whitelist?: Set<string>): Record<string, string> => {
  return Object.entries(query)
    .filter(([key]) => (whitelist ? whitelist.has(key) : MANAGED_QUERY_KEYS.has(key)))
    .reduce<Record<string, string>>((acc, [key, rawValue]) => {
      const value = extractFirstString(rawValue);
      if (value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {});
};

const haveSameEntries = (left: Record<string, string>, right: Record<string, string>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(key => right[key] === left[key]);
};

const buildQueryFromState = (): LocationQueryRaw => {
  const search = normalizeSearchValue(searchQuery.value);
  return {
    region: selectedRegion.value ?? undefined,
    sort: selectedSortOption.value ?? undefined,
    search: search ?? undefined
  };
};

const searchCacheKey = (query: string): string => createCacheKey(CACHE_NAMESPACE.SEARCH, query);

async function performSearch(rawQuery: string | null): Promise<void> {
  const query = normalizeSearchValue(rawQuery);
  activeSearchQuery.value = query;
  searchError.value = null;

  if (!query) {
    searchResults.value = [];
    globalStore.setSearchSuggestions(
      countries.value.slice(0, SUGGESTION_LIMIT).map(country => country.name.common)
    );
    return;
  }

  const cached = sanitizeCountries(
    globalStore.getCachedResponse<Country[]>(searchCacheKey(query), undefined, DEFAULT_CACHE_TTL_MS)
  );
  if (cached.length) {
    searchResults.value = cached;
    globalStore.setSearchSuggestions(
      cached.slice(0, SUGGESTION_LIMIT).map(country => country.name.common)
    );
    globalStore.recordSearchEvent(query, cached.length);
    return;
  }

  if (globalStore.isOffline()) {
    const fallback = fuse ? fuse.search(query).map(result => result.item) : [];
    searchResults.value = fallback;
    globalStore.setSearchSuggestions(
      fallback.slice(0, SUGGESTION_LIMIT).map(country => country.name.common)
    );
    searchError.value = fallback.length
      ? 'Offline mode: results limited to cached data.'
      : 'Offline mode: no cached results for this search.';
    globalStore.recordSearchEvent(query, fallback.length);
    return;
  }

  isSearching.value = true;
  try {
    const response = await apiService.searchCountries(query);
    const sanitized = sanitizeCountries(response.data);
    searchResults.value = sanitized;
    globalStore.setSearchSuggestions(
      sanitized.slice(0, SUGGESTION_LIMIT).map(country => country.name.common)
    );
    globalStore.recordSearchEvent(query, sanitized.length);
  } catch (error) {
    searchResults.value = [];
    const message =
      (error as { message?: string })?.message ?? 'Unable to complete search right now.';
    searchError.value = message;
    globalStore.recordSearchEvent(query, 0);
  } finally {
    isSearching.value = false;
  }
}

function scheduleSearch(rawQuery: string | null): void {
  if (searchDebounce) {
    clearTimeout(searchDebounce);
  }
  searchDebounce = setTimeout(() => {
    void performSearch(rawQuery);
  }, DEBOUNCE_MS);
}

function applySuggestion(suggestion: string): void {
  searchQuery.value = suggestion;
}

let isSyncingRouteQuery = false;

const syncStateFromRoute = () => {
  isSyncingRouteQuery = true;
  try {
    const routeRegion = normalizeSearchValue(extractFirstString(route.query.region));
    selectedRegion.value = routeRegion ?? null;

    const routeSort = normalizeSearchValue(extractFirstString(route.query.sort));
    selectedSortOption.value =
      routeSort && VALID_SORT_OPTIONS.has(routeSort as 'population' | 'name')
        ? (routeSort as 'population' | 'name')
        : null;

    const routeSearch = normalizeSearchValue(extractFirstString(route.query.search));
    searchQuery.value = routeSearch;
  } finally {
    isSyncingRouteQuery = false;
  }
};

watch(
  () => route.query,
  () => {
    syncStateFromRoute();
  },
  { immediate: true }
);

const updateRouteQueryFromState = (): void => {
  const nextQuery = buildQueryFromState();
  const currentRecord = toQueryRecord(route.query, MANAGED_QUERY_KEYS);
  const nextRecord = toQueryRecord(nextQuery, MANAGED_QUERY_KEYS);

  if (haveSameEntries(currentRecord, nextRecord)) {
    return;
  }

  isSyncingRouteQuery = true;
  router
    .replace({ query: nextQuery })
    .catch(() => undefined)
    .finally(() => {
      isSyncingRouteQuery = false;
    });
};

watch([selectedRegion, selectedSortOption], () => {
  if (isSyncingRouteQuery) {
    return;
  }
  updateRouteQueryFromState();
});

watch(
  () => searchQuery.value,
  newValue => {
    if (isSyncingRouteQuery) {
      return;
    }
    scheduleSearch(newValue);
    updateRouteQueryFromState();
  }
);

const baseDataset = computed(() => {
  const query = normalizeSearchValue(activeSearchQuery.value);
  if (query) {
    if (searchResults.value.length) {
      return searchResults.value;
    }
    if (fuse) {
      return fuse.search(query).map(result => result.item);
    }
  }

  return countries.value;
});

const filteredCountries = computed(() => {
  let result: Country[] = baseDataset.value;

  if (selectedRegion.value) {
    result = result.filter(country => country.region === selectedRegion.value);
  }

  if (selectedSortOption.value) {
    result = [...result].sort((a, b) => {
      if (selectedSortOption.value === 'population') {
        return (b.population ?? 0) - (a.population ?? 0);
      }
      return (a.name.common ?? '').localeCompare(b.name.common ?? '');
    });
  }

  return result;
});

const getCountries = async () => {
  errorMessages.value = [];
  loadings.getCountries = true;
  try {
    const cachedCountries = sanitizeCountries(globalStore.getCachedResponse<Country[]>(countriesCacheKey));
    if (cachedCountries.length) {
      applyCountriesState(cachedCountries);
      if (searchQuery.value) {
        scheduleSearch(searchQuery.value);
      }
    }

    const cacheIsFresh = globalStore.isCacheFresh(countriesCacheKey, COUNTRIES_CACHE_TTL_MS);
    if (cacheIsFresh) {
      return;
    }

    if (globalStore.isOffline()) {
      if (!cachedCountries.length) {
        const offlineMessage = 'Offline mode: Unable to load country list without cached data.';
        errorMessages.value = [offlineMessage];
        globalStore.setMessage(offlineMessage);
      }
      return;
    }

    const response = await apiService.getCountries();
    const sanitized = sanitizeCountries(response.data);
    if (!sanitized.length) {
      throw new Error('Country data is unavailable or malformed.');
    }

    applyCountriesState(sanitized);
    if (searchQuery.value) {
      scheduleSearch(searchQuery.value);
    }
  } catch (error) {
    const errorMessage =
      (error as { response?: { message?: string }; message?: string })?.response?.message ||
      (error as { message?: string })?.message ||
      'An error has occurred while loading countries.';
    errorMessages.value = [errorMessage];
    if (!countries.value.length) {
      globalStore.setMessage(errorMessage);
    }
  } finally {
    loadings.getCountries = false;
  }
};

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

watch(
  () => globalStore.isOffline(),
  offline => {
    if (offline) {
      if (!countries.value.length) {
        const offlineMessage = 'Offline mode detected. Showing cached data when available.';
        errorMessages.value = [offlineMessage];
        globalStore.setMessage(offlineMessage);
      }
      if (activeSearchQuery.value) {
        void performSearch(activeSearchQuery.value);
      }
    } else {
      errorMessages.value = [];
      searchError.value = null;
      if (activeSearchQuery.value) {
        void performSearch(activeSearchQuery.value);
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  syncStateFromRoute();
  void getCountries();
});

onBeforeUnmount(() => {
  if (searchDebounce) {
    clearTimeout(searchDebounce);
  }
});
</script>

