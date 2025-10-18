<template>
  <v-card
    class="mx-auto pb-5 accessible-card"
    max-width="300"
    elevation="6"
    role="link"
    tabindex="0"
    :aria-label="`View details for ${country.name.common}`"
    :aria-describedby="`${countryId}-population ${countryId}-region ${countryId}-capital`"
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

    <v-card-title :id="`${countryId}-title`">{{ country.name.common }}</v-card-title>
    <v-card-text :id="`${countryId}-population`">
      <span class="title">Population</span>
      :
      <span>{{ formatNumbers(country.population) }}</span>
    </v-card-text>
    <v-card-text :id="`${countryId}-region`">
      <span class="title">Region</span>
      :
      <span>{{ country.region ?? 'N/A' }}</span>
    </v-card-text>
    <v-card-text :id="`${countryId}-capital`">
      <span class="title">Capital</span>
      :
      <span>{{ country.capital?.[0] ?? 'N/A' }}</span>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue';
import { useRouter } from 'vue-router';

import type { Country } from '@/interfaces/country';

const router = useRouter();
const isLoaded = defineModel<boolean | null>();
const props = defineProps<{ country: Country }>();

const toIdSegment = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const countryId = computed(() => `country-${toIdSegment(props.country.name.common)}`);

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

.accessible-card:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 4px;
}

@media (forced-colors: active) {
  .accessible-card:focus,
  .accessible-card:focus-visible {
    outline: 2px solid ButtonText;
    outline-offset: 2px;
  }
}
</style>
