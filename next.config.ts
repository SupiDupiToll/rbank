import type { NextConfig } from "next";
import "./lib/env";

const baseSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
];

const appCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stack-auth.com https://*.stack-auth.com https://*.built-with-stack-auth.com wss://api.stack-auth.com wss://*.stack-auth.com",
  "frame-src 'self' https://*.stack-auth.com https://*.built-with-stack-auth.com"
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
  "connect-src 'self' https://api.stack-auth.com https://*.stack-auth.com https://*.built-with-stack-auth.com wss://api.stack-auth.com wss://*.stack-auth.com",
  "frame-src 'self' https://*.stack-auth.com https://*.built-with-stack-auth.com"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: appCsp },
  ...baseSecurityHeaders
];

const authHandlerHeaders = [
  { key: "Content-Security-Policy", value: authHandlerCsp },
  ...baseSecurityHeaders
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      {
        source: "/handler/:path*",
        headers: authHandlerHeaders
      }
    ];
  }
};

export default nextConfig;
