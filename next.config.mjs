/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Rewrite /uploads sang API route vì Next.js không phục vụ file động thêm vào public ở production
  async rewrites() {
    return [
      {
        source: "/uploads/:filename*",
        destination: "/api/uploads/:filename*",
      },
    ];
  },
};

export default nextConfig;
