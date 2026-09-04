// `__APP_VERSION__` is injected at build time by vite.config.ts (see `define`),
// sourced from package.json's `version` field. See src/vite-env.d.ts for the
// ambient declaration. The fallback below keeps this module type-safe and
// crash-proof in contexts where the define hasn't run (e.g. certain test runners).
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
