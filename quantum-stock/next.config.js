const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/logs',
        destination: `${apiUrl}/api/logs`,
      },
      {
        source: '/api/manage/:path*',
        destination: `${apiUrl}/api/manage/:path*`,
      },
      {
        source: '/api/tasks/:path*',
        destination: `${apiUrl}/api/tasks/:path*`,
      },
      {
        source: '/api/query/:path*',
        destination: `${apiUrl}/api/query/:path*`,
      },
      {
        source: '/api/stats/:path*',
        destination: `${apiUrl}/api/stats/:path*`,
      },
      {
        source: '/api/users',
        destination: `${apiUrl}/api/users`,
      },
      {
        source: '/api/stock/:path*',
        destination: `${apiUrl}/api/stock/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
