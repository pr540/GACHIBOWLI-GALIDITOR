import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Workspace packages ship TypeScript source rather than a build step.
  transpilePackages: ["@splitbills/core"],
  typedRoutes: true,
  // Baseline browser hardening. The API already sends secureHeaders, CORS
  // allowlist, CSRF origin check, and requires a session on every route.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default config;
