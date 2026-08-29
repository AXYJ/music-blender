import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "*.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "cdn-images.dzcdn.net",
      },
      {
        protocol: "https",
        hostname: "*.dzcdn.net",
      },
      {
        protocol: "https",
        hostname: "*.mzstatic.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "music-blender.xiao-web.com",
          },
        ],
        destination: "https://museek.xiao-web.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;