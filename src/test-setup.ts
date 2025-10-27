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
    window.matchMedia = ((query: string) => {
      const mql = {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      } as unknown as MediaQueryList;
      return mql;
    }) as unknown as typeof window.matchMedia;
  }
}

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.sessionStorage?.clear?.();
    window.localStorage?.clear?.();
  }
});
