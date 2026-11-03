/** @type {import('next').NextConfig} */

// CSP allows inline <script>/<style> blocks injected by Next hydration, MUI
// Emotion SSR, and JSON-LD. Plausible is first-party (/stats/*) and sibling
// APIs (stamp/explorer/grcpay) are fetched server-side, so neither needs an
// extra source.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

module.exports = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/((?!_next/).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};
