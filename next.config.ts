import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import pwaConfig from "./pwa.config";
import "./lib/env";

const withPWA = withPWAInit(pwaConfig);

const baseSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const appCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "manifest-src 'self'",
  "connect-src 'self' https://api.stack-auth.com https://*.stack-auth.com https://*.built-with-stack-auth.com wss://api.stack-auth.com wss://*.stack-auth.com",
  "frame-src 'self' https://*.stack-auth.com https://*.built-with-stack-auth.com https://vvvpdvda1t.zite.so",
  "worker-src 'self' blob:",
].join("; ");

const authHandlerCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "manifest-src 'self'",
  "connect-src 'self' https://api.stack-auth.com https://*.stack-auth.com https://*.built-with-stack-auth.com wss://api.stack-auth.com wss://*.stack-auth.com",
  "frame-src 'self' https://*.stack-auth.com https://*.built-with-stack-auth.com",
].join("; ");

const checkoutCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const embeddedCheckoutCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors https://*.sdtoll.de",
  "img-src 'self' data:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const demosCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors *",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "manifest-src 'self'",
  "connect-src 'self' https://api.stack-auth.com https://*.stack-auth.com https://*.built-with-stack-auth.com wss://api.stack-auth.com wss://*.stack-auth.com",
  "frame-src 'self' https://*.stack-auth.com https://*.built-with-stack-auth.com",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: appCsp },
  ...baseSecurityHeaders,
];

const authHandlerHeaders = [
  { key: "Content-Security-Policy", value: authHandlerCsp },
  ...baseSecurityHeaders,
];

const checkoutHeaders = [
  { key: "Content-Security-Policy", value: checkoutCsp },
  ...baseSecurityHeaders,
];

const demosHeaders = [
  { key: "Content-Security-Policy", value: demosCsp },
  ...baseSecurityHeaders.filter((header) => header.key !== "X-Frame-Options"),
  { key: "X-Frame-Options", value: "ALLOWALL" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  webpack: (config) => config,
  turbopack: {},
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/handler/:path*",
        headers: authHandlerHeaders,
      },
      {
        source: "/pay/:path*",
        headers: checkoutHeaders,
      },
      {
        source: "/embed/pay/:path*",
        headers: [
          { key: "Content-Security-Policy", value: embeddedCheckoutCsp },
          ...baseSecurityHeaders.filter((header) => header.key !== "X-Frame-Options"),
        ],
      },
      {
        source: "/demos/:path*",
        headers: demosHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
