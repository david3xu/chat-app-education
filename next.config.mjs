/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/ollama',
        destination: 'http://localhost:11434/api/generate',
      },
      {
        source: '/api/answer',
        destination: 'http://localhost:11434/api/generate',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        punycode: false,
      };
    }
    return config;
  },
}

export default nextConfig;