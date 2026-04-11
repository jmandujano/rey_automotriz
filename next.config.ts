import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for server components that rely on Prisma
  experimental: {
    /*
     * Allow Next.js to treat Prisma Client as an external package when bundling.
     * Note: In Next.js v15 the option name changed from
     * `serverComponentsExternalPackages` to `serverExternalPackages`.  Using
     * the new key prevents the "Unrecognized key" warning during `npm run dev`.
     */
    //serverExternalPackages: ["@prisma/client"],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
