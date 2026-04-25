// Philly CRM — standalone Next.js config. Extracted from the parent
// juandiazllc.com monorepo; no locale routing, no marketing bundle
// optimizations, just what the CRM needs to run.

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Bank-grade security headers — applied to every response.
// CSP is intentionally strict; if a feature breaks because an inline
// script is blocked, fix the feature rather than relax the policy.
// Three notes:
// 1. unsafe-inline + unsafe-eval are required by Next 16's runtime
//    (server components hydrate via inline JSON; turbopack dev uses eval).
//    For a stricter posture, switch to nonce-based CSP — see Next.js
//    docs on `headers()` middleware integration.
// 2. HSTS is set without preload; flip to includeSubDomains+preload
//    once the apex domain has been verified.
// 3. Permissions-Policy denies device sensors by default; opt back in
//    on specific routes if needed (e.g. camera for an ID-verify flow).
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '),
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Note: running `npm run build` inside this dir will print a harmless
  // warning about multiple lockfiles (this app's + the parent monorepo's).
  // That's expected: this standalone lives inside the parent repo as a
  // mirrored extraction. The warning doesn't affect correctness.
  // Pinning turbopack.root here broke module resolution, so we accept
  // the warning until moved to its own repo.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
