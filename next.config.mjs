/** @type {import('next').NextConfig} */
const nextConfig = {
  // Không bundle các package Node.js native vào server bundle
  serverExternalPackages: ["pdf-parse"],

  experimental: {
    proxyClientMaxBodySize: "50mb",
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
};

export default nextConfig;
