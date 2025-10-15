import { useGlobal } from '@/store';
import {
  createRouter,
  createWebHistory,
  type LocationQuery,
  type LocationQueryRaw,
  type RouteLocationNormalized,
  type RouteLocationNormalizedLoaded,
  type RouteRecordRaw,
  type Router
} from 'vue-router';


import HomeView from '@/views/HomeView.vue';

type MetaFieldResolver<T> = T | ((route: RouteLocationNormalizedLoaded) => T);

declare module 'vue-router' {
  interface RouteMeta {
    title?: MetaFieldResolver<string>;
    breadcrumb?: MetaFieldResolver<string>;
    preserveMessage?: boolean;
    requiresCountryParamValidation?: boolean;
    validateHomeQuery?: boolean;
    isFallbackRoute?: boolean;
  }
}

const COUNTRY_NAME_PATTERN = /^[\p{L}\s.'-]{1,60}$/u;
const INVALID_COUNTRY_PARAM_MESSAGE =
  'The country name provided in the address is invalid. Please choose a country from the list.';
const VALID_HOME_SORT_OPTIONS: ReadonlySet<'population' | 'name'> = new Set(['population', 'name']);
const DEFAULT_DOCUMENT_TITLE = 'REST Countries Explorer';

const extractFirstString = (candidate: unknown): string | null => {
  if (Array.isArray(candidate)) {
    const [first] = candidate;
    return typeof first === 'string' ? first : null;
  }

  return typeof candidate === 'string' ? candidate : null;
};

const extractCountryNameParam = (candidate: unknown): string | null => {
  const value = extractFirstString(candidate);
  return value ?? null;
};

const isCountryNameParamValid = (value: string | null): value is string => {
  if (value === null) {
    return false;
  }

  const normalized = value.trim();
  return COUNTRY_NAME_PATTERN.test(normalized);
};

const normalizeCountryParam = (value: string): string => value.trim();

const normalizeSearchParam = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toQueryRecord = (query: LocationQuery | LocationQueryRaw, whitelist?: Set<string>): Record<string, string> => {
  const entries = Object.entries(query).filter(([key]) => (whitelist ? whitelist.has(key) : true));
  return entries.reduce<Record<string, string>>((acc, [key, rawValue]) => {
    const value = extractFirstString(rawValue);
    if (value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const haveSameQueryEntries = (left: Record<string, string>, right: Record<string, string>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(key => right[key] === left[key]);
};

const sanitizeHomeRouteQuery = (to: RouteLocationNormalized): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  const searchParam = normalizeSearchParam(extractFirstString(to.query.search));
  if (searchParam !== null) {
    sanitized.search = searchParam;
  }

  const regionParam = normalizeSearchParam(extractFirstString(to.query.region));
  if (regionParam !== null) {
    sanitized.region = regionParam;
  }

  const sortParam = normalizeSearchParam(extractFirstString(to.query.sort));
  if (sortParam !== null && VALID_HOME_SORT_OPTIONS.has(sortParam as 'population' | 'name')) {
    sanitized.sort = sortParam;
  }

  return sanitized;
};

const resolveMetaField = <T>(
  value: MetaFieldResolver<T> | undefined,
  route: RouteLocationNormalized | RouteLocationNormalizedLoaded
): T | undefined => {
  if (typeof value === 'function') {
    return (value as (currentRoute: RouteLocationNormalizedLoaded) => T)(route as RouteLocationNormalizedLoaded);
  }

  return value;
};

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: {
      title: 'Explore Countries',
      breadcrumb: 'Home',
      validateHomeQuery: true
    }
  },
  {
    path: '/:name',
    name: 'CountryDetails',
    component: async () => await import('@/views/CountryDetails.vue'),
    props: route => ({ name: Array.isArray(route.params.name) ? route.params.name[0] : route.params.name }),
    meta: {
      requiresCountryParamValidation: true,
      breadcrumb: route => {
        const countryParam = extractCountryNameParam(route.params.name);
        return countryParam ?? 'Country Details';
      },
      title: route => {
        const countryParam = extractCountryNameParam(route.params.name);
        return countryParam ? `${countryParam} - Country Details` : 'Country Details';
      }
    }
  },
  {
    path: '/not-found',
    name: 'NotFound',
    component: HomeView,
    meta: {
      preserveMessage: true,
      isFallbackRoute: true,
      breadcrumb: 'Not Found',
      title: 'Page Not Found'
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
      preserveMessage: true,
      breadcrumb: 'Not Found',
      title: 'Page Not Found'
    }
  }
];

const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

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

  if (to.meta?.validateHomeQuery) {
    const sanitizedQuery = sanitizeHomeRouteQuery(to);
    const managedKeys = new Set(['search', 'region', 'sort']);
    const currentQuery = toQueryRecord(to.query, managedKeys);
    if (!haveSameQueryEntries(currentQuery, sanitizedQuery)) {
      return {
        name: to.name ?? 'Home',
        params: to.params,
        query: sanitizedQuery,
        hash: to.hash
      };
    }
  }

  return true;
});

router.afterEach(to => {
  const globalStore = useGlobal();
  globalStore.setLoading(false);

  const resolvedTitle = resolveMetaField(to.meta?.title, to) ?? DEFAULT_DOCUMENT_TITLE;
  if (typeof document !== 'undefined') {
    document.title = resolvedTitle;
  }
});

export { extractCountryNameParam, resolveMetaField };
export default router;
