// Minimal typings for the Vite PWA virtual modules.
// This avoids TS2307 in strict builds if the consumer does not include
// vite-plugin-pwa type references (or if tooling fails to resolve them).

declare module "virtual:pwa-register/react" {
  // The actual type is provided by vite-plugin-pwa. We keep it permissive here
  // to ensure the app builds reliably.
  export function useRegisterSW(options?: any): any;
}
