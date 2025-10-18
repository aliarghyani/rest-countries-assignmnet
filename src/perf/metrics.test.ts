/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { initPerformanceMonitoring } from './metrics';

describe('performance metrics (lightweight)', () => {
  let originalPO: any;
  beforeEach(() => {
    originalPO = (globalThis as any).PerformanceObserver;
  });
  afterEach(() => {
    (globalThis as any).PerformanceObserver = originalPO;
    vi.restoreAllMocks();
  });

  it('reports TTFB and observes LCP/CLS/FID without throwing', async () => {
    // Stub navigation timing
    const navEntry: any = { responseStart: 123.45 };
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([navEntry] as any);

    // Stub PO to deliver one LCP, one layout shift, one first-input
    class PO {
      private cb: Function;
      constructor(cb: Function) {
        this.cb = cb;
      }
      observe(opts: any) {
        if (opts.type === 'largest-contentful-paint') {
          this.cb({ getEntries: () => [{ startTime: 2500 }] });
        }
        if (opts.type === 'layout-shift') {
          this.cb({ getEntries: () => [{ value: 0.05, hadRecentInput: false }] });
        }
        if (opts.type === 'first-input') {
          this.cb({ getEntries: () => [{ processingStart: 110, startTime: 10 }] });
        }
      }
      disconnect() {}
    }
    (globalThis as any).PerformanceObserver = PO as any;

    const reports: any[] = [];
    const stop = initPerformanceMonitoring({ reporter: m => reports.push(m) });
    // Trigger lifecycle events
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    stop();

    expect(reports.find(r => r.name === 'TTFB')?.value).toBeCloseTo(123.45);
    expect(reports.some(r => r.name === 'LCP')).toBeTruthy();
    expect(reports.some(r => r.name === 'CLS')).toBeTruthy();
    expect(reports.some(r => r.name === 'FID')).toBeTruthy();
  });
});

