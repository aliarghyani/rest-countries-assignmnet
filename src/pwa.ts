// PWA registration (safe no-op if plugin is not present in dev)
// This file is imported by main.ts to enable service worker in production.
// The virtual module is provided by vite-plugin-pwa at build time.
export function registerPWA() {
  if (typeof window === 'undefined') return;
  // Lazy import to avoid errors in environments without the plugin
  // Use dynamic specifier so TypeScript doesn't try to type-resolve it
  const moduleId = 'virtual:pwa-register' as string;
  // @ts-ignore - vite will replace this virtual module at build time
  import(/* @vite-ignore */ moduleId)
    .then((mod: unknown) => {
      const registerSW =
        (mod as { registerSW?: (options?: { immediate?: boolean }) => void }).registerSW;
      if (typeof registerSW === 'function') {
        registerSW({ immediate: true });
      }
    })
    .catch(() => {
      /* ignore in dev/test */
    });
}
