/** @type {import('next').NextConfig} */

// CSP allows our self-hosted Plausible at daj.pw and inline <script>/<style>
// blocks injected by Next hydration, MUI Emotion SSR, and JSON-LD. Sibling
// APIs (stamp/explorer/grcpay) are fetched server-side, so they don't need
// connect-src entries.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://daj.pw",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://daj.pw",
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
