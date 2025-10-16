import { beforeEach } from 'vitest';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  if (!('ResizeObserver' in window)) {
    // @ts-expect-error - assign test shim
    window.ResizeObserver = ResizeObserver;
  }
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {}
    }) as MediaQueryList;
  }
}

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.sessionStorage?.clear?.();
    window.localStorage?.clear?.();
  }
});
