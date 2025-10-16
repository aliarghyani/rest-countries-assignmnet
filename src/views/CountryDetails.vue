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
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';

import apiService from '@/apiService';
import type { Country } from '@/interfaces/country';
import { useGlobal } from '@/store';

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

  loadings.fetchBorderCountries = true;
  try {
    const response = await apiService.getBorderCountriesByCodes(borders);
    if (requestId !== activeRequestId.value) {
      return;
    }

    const mapping: Record<string, string> = {};
    response.data.forEach(borderCountry => {
      const alpha3 = borderCountry.cca3 ?? borderCountry.cca2;
      const name = borderCountry.name?.common;
      if (!alpha3 || !name) {
        return;
      }
      mapping[normalizeCode(alpha3)] = name;
    });

    borderCountries.value = mapping;

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
    const response = await apiService.getCountryByName(countryName);
    if (requestId !== activeRequestId.value) {
      return;
    }

    country.value = Array.isArray(response.data) ? response.data[0] ?? null : null;
    await loadBorderCountries(country.value?.borders ?? [], requestId);
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
