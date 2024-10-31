/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/ollama/:path*',
        destination: 'http://localhost:11434/api/:path*',
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        punycode: false,
        path: false,
      };
    }
    return config;
  },
  images: {
    domains: ['localhost'], // Add any other domains you need
  },
}

export default nextConfig;