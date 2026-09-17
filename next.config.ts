import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@base-ui/react', 'clsx', 'tailwind-merge'],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Precomputed globe land data: stable between regenerations, so let
        // the edge/browser cache it instead of refetching on every visit.
        source: "/globe/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app https://va.vercel-scripts.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com https://*.googleusercontent.com; " +
              "font-src 'self'; " +
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://vitals.vercel-insights.com https://*.vercel.app https://va.vercel-scripts.com https://raw.githubusercontent.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/posto-banese',
        destination: '/posto-prona',
        permanent: true,
      },
      {
        source: '/banesa',
        destination: '/listings?type=shitje',
        permanent: true,
      },
      {
        source: '/qira',
        destination: '/listings?type=qira',
        permanent: true,
      },
      {
        source: '/shitje',
        destination: '/listings?type=shitje',
        permanent: true,
      },
      {
        source: '/cilesimet',
        destination: '/settings',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
