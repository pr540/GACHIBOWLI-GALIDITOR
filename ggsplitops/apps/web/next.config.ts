import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Workspace packages ship TypeScript source rather than a build step.
  transpilePackages: ["@splitbills/core"],
  typedRoutes: true,
};

export default config;
