import { useGlobal } from '@/store';
import {
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordRaw
} from 'vue-router';


// Components
import HomeView from '@/views/HomeView.vue';

// Pinia Store

// Unimplemented in Vuetify 3.5.6
// import { goTo } from 'vuetify/services';

/** Router Rules */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/:name',
    name: 'CountryDetails',
    component: async () => await import('@/views/CountryDetails.vue'),
    props: route => ({ name: Array.isArray(route.params.name) ? route.params.name[0] : route.params.name }),
    meta: {
      requiresCountryParamValidation: true
    }
  },
  {
    path: '/not-found',
    name: 'NotFound',
    component: HomeView,
    meta: {
      preserveMessage: true,
      isFallbackRoute: true
    },
    beforeEnter: () => {
      const globalStore = useGlobal();
      if (!globalStore.message) {
        globalStore.setMessage('The page you were looking for could not be found.');
      }
      return true;
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'NotFound' },
    meta: {
      preserveMessage: true
    }
  }
];

/** Vue Router */
const router: Router = createRouter({
  /**
   * History Mode
   *
   * @see {@link https://router.vuejs.org/guide/essentials/history-mode.html }
   */
  history: createWebHistory(import.meta.env.BASE_URL), // createWebHashHistory(import.meta.env.BASE_URL)
  /*
  scrollBehavior: (to, _from, savedPosition) => {
    let scrollTo: number | string = 0;

    if (to.hash) {
      scrollTo = to.hash;
    } else if (savedPosition) {
      scrollTo = savedPosition.top;
    }
    return goTo(scrollTo);
  },
  */
  routes
});

const COUNTRY_NAME_PATTERN = /^[\p{L}\s.'-]{1,60}$/u;
const INVALID_COUNTRY_PARAM_MESSAGE =
  'The country name provided in the address is invalid. Please choose a country from the list.';

const extractCountryNameParam = (candidate: unknown): string | null => {
  if (Array.isArray(candidate)) {
    return typeof candidate[0] === 'string' ? candidate[0] : null;
  }
  return typeof candidate === 'string' ? candidate : null;
};

const isCountryNameParamValid = (value: string | null): value is string => {
  if (value === null) {
    return false;
  }

  const normalized = value.trim();
  return COUNTRY_NAME_PATTERN.test(normalized);
};

const normalizeCountryParam = (value: string): string => value.trim();

// Global before guards
// https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards}
router.beforeEach(to => {
  const globalStore = useGlobal();
  globalStore.setLoading(true);

  if (to.meta?.preserveMessage !== true) {
    globalStore.setMessage('');
  }

  if (to.meta?.requiresCountryParamValidation) {
    const countryParam = extractCountryNameParam(to.params.name);
    if (!isCountryNameParamValid(countryParam)) {
      globalStore.setMessage(INVALID_COUNTRY_PARAM_MESSAGE);
      return { name: 'NotFound' };
    }

    const normalized = normalizeCountryParam(countryParam);
    if (normalized !== countryParam) {
      return {
        name: to.name ?? 'CountryDetails',
        params: {
          ...to.params,
          name: normalized
        },
        query: to.query,
        hash: to.hash
      };
    }
  }

  return true;
});

// Global After Hooks
// https://router.vuejs.org/guide/advanced/navigation-guards.html#global-after-hooks}
router.afterEach(() => {
  const globalStore = useGlobal();
  // Hide Loading
  globalStore.setLoading(false);
});

/*
const scrollBehavior = async (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  savedPosition: RouteLocation
): Promise<any> => {
  let scrollpos = {};
  if (to.hash) {
    scrollpos = {
      el: to.hash,
      behavior: 'smooth',
    };
  } else if (savedPosition) {
    scrollpos = savedPosition;
  } else {
    scrollpos = { top: 0 };
  }
  return await new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve(scrollpos);
    }, 600);
  });
};
*/

export default router;
