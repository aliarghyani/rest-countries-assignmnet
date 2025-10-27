import meta from '@/Meta';
import router from '@/router';

interface ErrorPayload {
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  url?: string;
  userAgent?: string;
  release?: string;
  env?: string;
}

function send(endpoint: string, data: unknown): void {
  try {
    const json = JSON.stringify(data);
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([json], { type: 'application/json' });
      (navigator as any).sendBeacon(endpoint, blob);
      return;
    }
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    }).catch(() => {});
  } catch {}
}

export function initErrorTracking(): void {
  const endpoint = import.meta.env.VITE_ERROR_ENDPOINT as string | undefined;
  if (!endpoint || typeof window === 'undefined') return;
  const base: Partial<ErrorPayload> = {
    release: meta.version,
    env: import.meta.env.MODE,
    userAgent: navigator.userAgent
  };

  window.addEventListener('error', e => {
    const payload: ErrorPayload = {
      ...base,
      message: e.message,
      stack: e.error?.stack,
      source: e.filename,
      lineno: e.lineno ?? undefined,
      colno: e.colno ?? undefined,
      timestamp: Date.now(),
      url: location.href
    };
    send(endpoint, payload);
  });

  window.addEventListener('unhandledrejection', e => {
    const reason: any = e.reason ?? {};
    const payload: ErrorPayload = {
      ...base,
      message: typeof reason === 'string' ? reason : (reason?.message ?? 'unhandledrejection'),
      stack: reason?.stack,
      timestamp: Date.now(),
      url: location.href
    };
    send(endpoint, payload);
  });
}

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function initAnalytics(): void {
  const gaId = import.meta.env.VITE_GA_ID as string | undefined;
  if (!gaId || typeof document === 'undefined') return;

  if (!window.dataLayer) window.dataLayer = [];
  function gtag(...args: any[]) {
    window.dataLayer!.push(args as unknown as any);
  }
  window.gtag = gtag as any;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(s);

  gtag('js', new Date() as any);
  gtag('config', gaId as any, { send_page_view: false });

  const track = (path: string, title?: string) => {
    try {
      gtag('event', 'page_view', { page_path: path, page_title: title });
    } catch {}
  };

  // initial page
  track(location.pathname + location.search + location.hash, document.title);
  // route changes
  router.afterEach(to => {
    const path = to.fullPath || location.pathname + location.search + location.hash;
    track(path, document.title);
  });
}
