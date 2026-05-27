/** @type {import('next').NextConfig} */
const nextConfig = {
  // Không bundle các package Node.js native vào server bundle
  serverExternalPackages: ["pdf-parse"],

  experimental: {
    proxyClientMaxBodySize: "50mb",
    // after() API đã sẵn sàng mặc định từ Next.js 15+, không cần cấu hình thêm
  },
};

export default nextConfig;
