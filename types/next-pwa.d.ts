declare module "next-pwa" {
  import type { NextConfig } from "next";

  interface RuntimeCachingConfig {
    urlPattern: RegExp;
    handler: string;
    options?: Record<string, unknown>;
  }

  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    swSrc?: string;
    swDest?: string;
    buildExcludes?: Array<RegExp | string>;
    runtimeCaching?: RuntimeCachingConfig[];
    fallbacks?: {
      offline?: string;
    };
  }

  export type Config = PWAConfig;

  export default function withPWA(config: PWAConfig): (config: NextConfig) => NextConfig;
}
