
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 配置basePath（如果部署到GitHub Pages的子路径）
  // basePath: '/quantum-stock',
  // 环境变量配置
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  // 配置代理，将API请求转发到后端服务器
  async rewrites() {
    return [
      {
        source: '/api/auth/login',
        destination: 'http://localhost:8000/api/auth/login',
      },
      {
        source: '/api/auth/logout',
        destination: 'http://localhost:8000/api/auth/logout',
      },
      {
        source: '/api/auth/me',
        destination: 'http://localhost:8000/api/auth/me',
      },
      {
        source: '/api/tasks/update_daily',
        destination: 'http://localhost:8000/api/tasks/update_daily',
      },
      {
        source: '/api/tasks/select_stock',
        destination: 'http://localhost:8000/api/tasks/select_stock',
      },
      {
        source: '/api/tasks/update_names',
        destination: 'http://localhost:8000/api/tasks/update_names',
      },
      {
        source: '/api/query/stock_selected',
        destination: 'http://localhost:8000/api/query/stock_selected',
      },
      {
        source: '/api/status/db',
        destination: 'http://localhost:8000/api/status/db',
      },
      {
        source: '/api/logs',
        destination: 'http://localhost:8000/api/logs',
      },
      {
        source: '/api/manage/execute_dates',
        destination: 'http://localhost:8000/api/manage/execute_dates',
      },
      {
        source: '/api/manage/execute_times',
        destination: 'http://localhost:8000/api/manage/execute_times',
      },
      {
        source: '/api/manage/stock_selected',
        destination: 'http://localhost:8000/api/manage/stock_selected',
      },
      {
        source: '/api/stats/overview',
        destination: 'http://localhost:8000/api/stats/overview',
      },
      {
        source: '/api/logs',
        destination: 'http://localhost:8000/api/logs',
      },
      {
        source: '/api/logs/filters',
        destination: 'http://localhost:8000/api/logs/filters',
      },
      {
        source: '/api/logs/list',
        destination: 'http://localhost:8000/api/logs/list',
      },
      {
        source: '/api/users',
        destination: 'http://localhost:8000/api/users',
      },
      {
        source: '/api/users/password',
        destination: 'http://localhost:8000/api/users/password',
      },
      {
        source: '/api/users/:username',
        destination: 'http://localhost:8000/api/users/:username',
      },
      {
        source: '/api/process/terminate',
        destination: 'http://localhost:8000/api/process/terminate',
      },
      {
        source: '/api/stock/toggle_favorite',
        destination: 'http://localhost:8000/api/stock/toggle_favorite',
      },
      {
        source: '/api/stock/toggle_observation',
        destination: 'http://localhost:8000/api/stock/toggle_observation',
      },
      {
        source: '/api/stock/favorite_list',
        destination: 'http://localhost:8000/api/stock/favorite_list',
      },
      {
        source: '/api/stock/observation_list',
        destination: 'http://localhost:8000/api/stock/observation_list',
      },
    ];
  },
};

module.exports = nextConfig;
