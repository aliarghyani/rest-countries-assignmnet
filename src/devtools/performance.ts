/* Development-only performance helpers. Safe to import conditionally. */
import { initPerformanceMonitoring } from '@/perf/metrics';

interface OverlayEntry { label: string; value: string }

let overlayEl: HTMLDivElement | null = null;
let rafId = 0;
let stopMetrics: (() => void) | null = null;

export function mark(name: string): void {
  if (typeof performance === 'undefined') return;
  performance.mark(name);
}

export function measure(name: string, startMark: string, endMark?: string): number | null {
  if (typeof performance === 'undefined') return null;
  if (endMark) performance.mark(endMark);
  const m = performance.measure(name, startMark, endMark);
  return m.duration ?? null;
}

export function mountPerfOverlay(): void {
  if (overlayEl || typeof document === 'undefined') return;

  overlayEl = document.createElement('div');
  overlayEl.style.position = 'fixed';
  overlayEl.style.right = '8px';
  overlayEl.style.bottom = '8px';
  overlayEl.style.zIndex = '99999';
  overlayEl.style.background = 'rgba(0,0,0,.7)';
  overlayEl.style.color = '#fff';
  overlayEl.style.font = '12px/1.4 system-ui, sans-serif';
  overlayEl.style.padding = '8px 10px';
  overlayEl.style.borderRadius = '6px';
  overlayEl.style.pointerEvents = 'none';
  overlayEl.setAttribute('role', 'status');
  overlayEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(overlayEl);

  const entries: Record<string, OverlayEntry> = {};
  const set = (key: string, label: string, value: string) => {
    entries[key] = { label, value };
    const html = Object.values(entries)
      .map(e => `<div><strong>${e.label}:</strong> ${e.value}</div>`)
      .join('');
    if (overlayEl) overlayEl.innerHTML = html;
  };

  // FPS approximation
  let last = performance.now();
  let frames = 0;
  const loop = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) {
      const fps = Math.round((frames * 1000) / (now - last));
      set('fps', 'FPS', `${fps}`);
      frames = 0;
      last = now;
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  // Web-vitals style metrics into the overlay
  stopMetrics = initPerformanceMonitoring({
    reporter: m => set(m.name, m.name, `${Math.round(m.value)}${m.name === 'CLS' ? '' : ' ms'}`)
  });

  // Memory if available
  try {
    const anyPerf: any = performance as any;
    if (anyPerf && anyPerf.memory) {
      const memTimer = setInterval(() => {
        const used = Math.round(anyPerf.memory.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(anyPerf.memory.jsHeapSizeLimit / 1024 / 1024);
        set('mem', 'Heap', `${used} / ${total} MB`);
      }, 1500);
      // attach cleanup
      (overlayEl as any)._memTimer = memTimer;
    }
  } catch {
    /* ignore */
  }
}

export function unmountPerfOverlay(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (stopMetrics) stopMetrics();
  stopMetrics = null;
  if (overlayEl) {
    const timer = (overlayEl as any)._memTimer as number | undefined;
    if (timer) clearInterval(timer);
    overlayEl.remove();
  }
  overlayEl = null;
}

