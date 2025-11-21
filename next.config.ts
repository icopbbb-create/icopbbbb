import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      // Clerk profile images
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      // Supabase storage (if you're using it for companion/session icons)
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      // Allow all local/static icons in /public/icons
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "your-production-domain.com", // Replace with your live domain (e.g., eduvoiceagent.vercel.app)
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "bits-pilani-70",
  project: "saas-app",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
