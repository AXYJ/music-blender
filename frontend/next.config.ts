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