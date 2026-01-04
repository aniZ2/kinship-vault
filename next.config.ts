import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external image domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "www.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "kv-images-worker.anitaivlove.workers.dev",
      },
    ],
  },
};

export default nextConfig;
