<template>
  <v-container class="py-2 px-0 px-md-4">
    <v-breadcrumbs :items="breadcrumbs" divider="mdi-chevron-right" />
  </v-container>
  <v-container class="fill-height">
    <v-row no-gutters class="d-flex flex-row align-items-center justify-space-between">
      <v-col cols="12" sm="4" md="4">
        <v-text-field
          v-model="searchQuery"
          :items="countries"
          placeholder="Country Name"
          label="Search for a country"
          prepend-inner-icon="mdi-magnify"
          item-props
          :item-value="(country: Country) => country.name?.common || ''"
          :item-title="(country: Country) => country.name?.common || ''"
          menu-icon="mdi-chevron-down"
          variant="solo"
          :clearable="true"
        />
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
  type RouteLocationRaw
} from 'vue-router';

import Fuse from 'fuse.js';

import type { Country } from '@/interfaces/country';

import apiService from '@/apiService';
import SingleCountry from '@/components/SingleCountry.vue';

interface SortOption {
  title: string;
  value: 'population' | 'name';
}

interface BreadcrumbItem {
  title: string;
  disabled?: boolean;
  to?: RouteLocationRaw;
}

const globalStore = useGlobal();

const countries = ref<Country[]>([]);
const regions = ref<string[]>([]);
const sortOptions = ref<SortOption[]>([
  { title: 'Population', value: 'population' },
  { title: 'Country Name', value: 'name' }
]);

const selectedSortOption = ref<'population' | 'name' | null>(null);
const loadings = reactive<{ getCountries?: boolean }>({ getCountries: false });
const errorMessages = ref<string[]>([]);
const selectedRegion = ref<string | null>(null);
const searchQuery = ref<string | null>(null);
const isLoaded = ref<Record<string, boolean>>({});
const router = useRouter();
const route = useRoute();

const MANAGED_QUERY_KEYS = new Set(['region', 'sort', 'search']);
const VALID_SORT_OPTIONS: ReadonlySet<'population' | 'name'> = new Set(['population', 'name']);

const fuseOptions = {
  keys: ['name.common'],
  threshold: 0.4,
  minMatchCharLength: 1,
  shouldSort: true
};
let fuse: Fuse<Country> | null = null;

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

const toQueryRecord = (query: LocationQuery | LocationQueryRaw): Record<string, string> => {
  return Object.entries(query)
    .filter(([key]) => MANAGED_QUERY_KEYS.has(key))
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

const updateRouteQueryFromState = () => {
  const nextQuery = buildQueryFromState();
  const nextRecord = toQueryRecord(nextQuery);
  const currentRecord = toQueryRecord(route.query);

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

watch([selectedRegion, selectedSortOption, searchQuery], () => {
  if (isSyncingRouteQuery) {
    return;
  }
  updateRouteQueryFromState();
});

const filteredCountries = computed(() => {
  if (!fuse) {
    return countries.value;
  }

  const searchResults = searchQuery.value
    ? fuse.search(searchQuery.value).map(result => result.item)
    : countries.value;

  let result = searchResults.filter(country => {
    return !selectedRegion.value || country.region === selectedRegion.value;
  });

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
  loadings.getCountries = true;
  try {
    const response = await apiService.getCountries();
    countries.value = response.data;
    regions.value = Array.from(new Set(countries.value.map(item => item.region))).filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    );

    fuse = new Fuse(countries.value, fuseOptions);

    countries.value.forEach(country => {
      isLoaded.value[country.name.common] = false;
    });
  } catch (error) {
    const errorMessage =
      (error as { response?: { message?: string }; message?: string })?.response?.message ||
      (error as { message?: string })?.message ||
      'An error has occurred';
    globalStore.message = errorMessage;
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

onMounted(() => {
  syncStateFromRoute();
  void getCountries();
});
</script>
