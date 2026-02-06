const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// 最简单的代理配置
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: {
    '^/api/(.*)': '/api/$1'  // 将 /api/... 转发到 http://localhost:8005/api/...
  }
}));

// 主页
app.get('/', (req, res) => {
  res.send('<h1>Frontend Server Running</h1><p>Visit <a href="/api/auth/login">API Test</a></p>');
});

app.listen(PORT, () => {
  console.log(`Test proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});