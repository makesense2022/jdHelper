/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 重定向根路径到简历助手页面，避免404问题
  async redirects() {
    return [
      {
        source: '/error',
        destination: '/',
        permanent: false,
      },
    ];
  },
  // 防止与其他应用的资源请求冲突
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 
