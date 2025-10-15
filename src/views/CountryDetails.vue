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
            <v-card-text class="d-flex">
              <div class="bordersContainer">
                <strong class="nowrap pe-3">Border Countries:</strong>
                <v-btn
                  v-for="(border, index) in borderCountriesList"
                  :key="index"
                  size="x-small"
                  class="p-2 mx-1 mb-1"
                  :text="border"
                  @click="$router.push({ name: 'CountryDetails', params: { name: border } })"
                ></v-btn>
              </div>
              <div v-show="!borderCountriesList.length" class="text-center">No Borders</div>
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
const loadings = reactive<{ fetchCountryDetails?: boolean }>({});

const country = ref<Country | null>(null);
const borderCountries = ref<Record<string, string>>({});

interface BreadcrumbItem {
  title: string;
  disabled?: boolean;
  to?: RouteLocationRaw;
}

const resolveRouteParam = (param: unknown): string | null => {
  if (Array.isArray(param)) {
    const [first] = param;
    return typeof first === 'string' ? first : null;
  }
  return typeof param === 'string' ? param : null;
};

const fetchCountryDetails = async (rawName?: unknown) => {
  const countryName = resolveRouteParam(rawName ?? route.params.name);

  if (!countryName) {
    country.value = null;
    borderCountries.value = {};
    return;
  }

  loadings.fetchCountryDetails = true;
  try {
    const response = await apiService.getCountryByName(countryName);
    country.value = Array.isArray(response.data) ? response.data[0] ?? null : null;
    borderCountries.value = {};

    if (country.value?.borders?.length) {
      const borderPromises = country.value.borders.map(async borderCode => {
        const borderResponse = await fetch(`https://restcountries.com/v3.1/alpha/${borderCode}`);
        const borderData = await borderResponse.json();
        const borderName = Array.isArray(borderData) ? borderData[0]?.name?.common : undefined;
        return { [borderCode]: borderName };
      });
      const borderResults = await Promise.all(borderPromises);
      borderCountries.value = Object.assign({}, ...borderResults);
    }
  } catch (error) {
    const errorMessage =
      (error as { response?: { message?: string }; message?: string })?.response?.message ||
      (error as { message?: string })?.message ||
      'An error has occurred';
    globalStore.message = errorMessage;
  } finally {
    loadings.fetchCountryDetails = false;
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
    .map(borderCode => borderCountries.value[borderCode])
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
