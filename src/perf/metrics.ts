/* Lightweight Web Vitals-style performance monitoring without external deps. */
export type MetricName = 'LCP' | 'CLS' | 'FID' | 'TTFB';
export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export interface Metric {
  name: MetricName;
  value: number;
  id?: string;
  rating?: MetricRating;
}

export interface PerfOptions {
  reporter?: (metric: Metric) => void;
}

const thresholds: Record<MetricName, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800]
};

const rate = (name: MetricName, value: number): MetricRating => {
  const [good, ni] = thresholds[name];
  if (value <= good) return 'good';
  if (value <= ni) return 'needs-improvement';
  return 'poor';
};

export function initPerformanceMonitoring(opts: PerfOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return () => {};
  }

  const reporter = opts.reporter ?? ((m: Metric) => {
    // Default reporter logs to console in a consistent format

    console.info(`[perf] ${m.name}: ${Math.round(m.value * 100) / 100}${m.name === 'CLS' ? '' : ' ms'} (${m.rating})`);
  });

  const disconnectors: (() => void)[] = [];

  // TTFB
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const value = nav.responseStart;
      reporter({ name: 'TTFB', value, rating: rate('TTFB', value) });
    }
  } catch {}

  // LCP
  try {
    let lcp = 0;
    const po = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as PerformanceEntry[]) {
        const anyEntry = entry as any;
        const value = (anyEntry.startTime ?? 0) as number;
        if (value > lcp) lcp = value;
      }
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true as any } as unknown as PerformanceObserverInit);
    const finalize = () => {
      reporter({ name: 'LCP', value: lcp, rating: rate('LCP', lcp) });
      po.disconnect();
    };
    addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && finalize(), { once: true });
    addEventListener('pagehide', finalize, { once: true });
    disconnectors.push(() => po.disconnect());
  } catch {}

  // CLS
  try {
    let cls = 0;
    const po = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          cls += entry.value || 0;
        }
      }
    });
    po.observe({ type: 'layout-shift', buffered: true as any } as unknown as PerformanceObserverInit);
    const finalize = () => {
      reporter({ name: 'CLS', value: cls, rating: rate('CLS', cls) });
      po.disconnect();
    };
    addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && finalize(), { once: true });
    addEventListener('pagehide', finalize, { once: true });
    disconnectors.push(() => po.disconnect());
  } catch {}

  // FID
  try {
    const po = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as any[]) {
        const value = entry.processingStart - entry.startTime;
        reporter({ name: 'FID', value, rating: rate('FID', value) });
      }
    });
    po.observe({ type: 'first-input', buffered: true as any } as unknown as PerformanceObserverInit);
    disconnectors.push(() => po.disconnect());
  } catch {}

  return () => disconnectors.forEach(fn => fn());
}

