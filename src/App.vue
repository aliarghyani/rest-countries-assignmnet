<script setup lang="ts">
import { useGlobal, useConfig } from '@/store';
import {
  computed,
  nextTick,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type WritableComputedRef
} from 'vue';

import { useTheme } from 'vuetify';

// Components
import logo from '@/assets/logo.png';
import AppBarMenuComponent from '@/components/AppBarMenuComponent.vue';



/** Vuetify Theme */
const theme = useTheme();

/** Global Store */
const globalStore = useGlobal();

/** Config Store */
const configStore = useConfig();

/** Title */
const title = import.meta.env.VITE_APP_TITLE ?? '';

/** loading overlay visibility */
const loading: WritableComputedRef<boolean> = computed({
  get: () => globalStore.loading,
  set: v => globalStore.setLoading(v)
});

/** Appbar progressbar value */
const progress: ComputedRef<number | null> = computed(() => globalStore.progress);

/** Snackbar visibility */
const snackbarVisibility: Ref<boolean> = ref(false);

/** Snackbar text */
const snackbarText: ComputedRef<string> = computed(() => globalStore.message);

/** Toggle Dark mode */
const isDark: ComputedRef<string> = computed(() => (configStore.theme ? 'dark' : 'light'));

// When snackbar text has been set, show snackbar.
watch(
  () => globalStore.message,
  message => (snackbarVisibility.value = message !== '')
);

/** Clear store when snackbar hide */
const onSnackbarChanged = async () => {
  globalStore.setMessage();
  await nextTick();
};

onMounted(() => {
  document.title = title;
});
</script>

<template>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <v-app :theme="isDark">
      <v-app-bar class="px-lg-5 px-md-4 px-3">
        <v-app-bar-title class="app-title" tag="h1">{{ title }}</v-app-bar-title>
        <v-spacer />
        <app-bar-menu-component />
        <v-progress-linear
          v-show="loading"
          :active="loading"
          :indeterminate="progress === null"
          :model-value="progress !== null ? progress : 0"
          color="blue-accent-3"
        />
      </v-app-bar>
    <v-main id="main-content">
      <router-view v-slot="{ Component, route }">
        <!--transition :name="route.meta.transition as string || 'fade'"-->
        <component :is="Component" :key="route.path" />
        <!--/transition-->
      </router-view>
    </v-main>

    <v-overlay v-model="loading" app class="justify-center align-center" persistent>
      <v-progress-circular indeterminate size="64" />
    </v-overlay>

    <v-snackbar
      color="red"
      v-model="snackbarVisibility"
      role="status"
      aria-live="polite"
      @update:model-value="onSnackbarChanged"
    >
      {{ snackbarText }}
      <template #actions>
        <v-btn icon="mdi-close" @click="onSnackbarChanged" />
      </template>
    </v-snackbar>

    <v-footer app elevation="3">
      <span class="mr-5">Made By Ali Arghyani Oct 2024 &copy;</span>
    </v-footer>
  </v-app>
  <teleport to="head">
    <meta name="theme-color" :content="theme.computedThemes.value[isDark].colors.primary" />
    <link rel="icon" :href="logo" type="image/svg+xml" />
  </teleport>
</template>

<style lang="scss">
@use 'vuetify/_settings' as settings;
@import url('https://fonts.googleapis.com/css?family=Nunito+Sans:300,600,800&display=swap');

// Custom color variables
$grey-lighten-2: #f5f5f5; // Define your custom grey colors here if needed
$grey-base: #9e9e9e;

#app {
  font-family: 'Nunito Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #111517;
  font-size: 15px;
  height: 100%;
  background-color: #fff;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 12px;
  z-index: 1000;
}

.skip-link:focus {
  top: 0;
}

html {
  overflow-y: auto;
  // Modern scrollbar style
  scrollbar-width: thin;
  scrollbar-color: $grey-lighten-2 $grey-base;
}

::-webkit-scrollbar {
  width: 0.5rem;
  height: 0.5rem;
}

::-webkit-scrollbar-track {
  box-shadow: inset 0 0 0.5rem rgba(0, 0, 0, 0.1);
  background-color: $grey-lighten-2;
}

::-webkit-scrollbar-thumb {
  border-radius: 0.5rem;
  background-color: $grey-base;
  box-shadow: inset 0 0 0.5rem rgba(0, 0, 0, 0.1);
}

// Fixed a bug that the theme color is interrupted when scrolling
.v-application {
  overflow-y: auto;
}

.v-app-bar .v-progress-linear {
  position: absolute;
  bottom: 0;
}

@media screen and (max-width: 580px) {
  .v-toolbar-title, .v-toolbar-title__placeholder {
    font-size: 16px !important;
    white-space: nowrap;
    overflow: visible !important;
  }
}

.v-toolbar-title {
  font-weight: 600 !important;
}
</style>
