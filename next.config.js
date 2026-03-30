/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Vercel Blob Storage — where thumbnails are persisted
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Content Security Policy — restrict what the page can load and where it can connect
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js requires 'unsafe-inline' for styles in development; inline scripts for hydration
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // Allow images from Vercel Blob and xAI temp URLs (expire quickly)
              "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com https://*.x.ai",
              // API calls go to our own origin (server-side routes proxy to xAI)
              "connect-src 'self'",
              "font-src 'self'",
              "frame-src 'none'",
              "object-src 'none'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
