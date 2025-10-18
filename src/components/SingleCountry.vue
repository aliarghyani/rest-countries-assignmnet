<template>
  <v-card
    class="mx-auto pb-5"
    max-width="300"
    elevation="6"
    role="link"
    tabindex="0"
    :aria-label="`View details for ${country.name.common}`"
    @click="goToCountry(country)"
    @keydown.enter.prevent="goToCountry(country)"
    @keydown.space.prevent="goToCountry(country)"
  >
    <v-skeleton-loader
      v-if="!isLoaded"
      type="image"
      color="var(--v-theme-on-surface)"
      elevation="24"
      class="align-end text-white img-fluid flagImg h-100"
      height="170"
    ></v-skeleton-loader>

    <v-img
      class="align-end text-white img-fluid flagImg border-b-thin"
      :height="isLoaded ? 170 : 0"
      :src="country.flags.png"
      :alt="country.flags.alt ?? `${country.name.common} flag`"
      cover
      @load="isLoaded = true"
    ></v-img>

    <v-card-title>{{ country.name.common }}</v-card-title>
    <v-card-text>
      <span class="title">Population</span>
      :
      <span>{{ formatNumbers(country.population) }}</span>
    </v-card-text>
    <v-card-text>
      <span class="title">Region</span>
      :
      <span>{{ country.region ?? 'N/A' }}</span>
    </v-card-text>
    <v-card-text>
      <span class="title">Capital</span>
      :
      <span>{{ country.capital?.[0] ?? 'N/A' }}</span>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import { useRouter } from 'vue-router';

import type { Country } from '@/interfaces/country';

const router = useRouter();
const isLoaded = defineModel<boolean | null>();
defineProps<{ country: Country }>();

const goToCountry = (country: Country) => {
  router.push({ name: 'CountryDetails', params: { name: country.name.common } });
};

function formatNumbers(value: number): string {
  return value.toLocaleString();
}
</script>

<style scoped lang="scss">
.logo:hover {
  will-change: filter;
  filter: drop-shadow(0 0 1em #2196f3aa);
}
:deep().flagImg {
  img {
    object-fit: fill !important;
  }
}

:deep().v-card-text {
  padding: 0 1rem;
  span {
    font-weight: normal;
    opacity: 1 !important;
  }
  .title {
    font-weight: 600;
  }
}
:deep(.v-card-title) {
  font-weight: 600;
}
</style>
