/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Không bundle các package Node.js native vào server bundle
  serverExternalPackages: ["pdf-parse"],

  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // CORS cho Zalo Mini App
  async headers() {
    return [
      {
        source: "/api/miniapp/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,X-Zalo-MiniApp-Token" },
        ],
      },
    ];
  },

  // Rewrites cho file tĩnh và webhook oneCDC
  async rewrites() {
    return [
      {
        source: "/uploads/:filename*",
        destination: "/api/uploads/:filename*",
      },
      {
        source: "/webhook",
        destination: "/api/webhook/kiem-dich",
      },
    ];
  },
};

export default nextConfig;
