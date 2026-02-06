const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3007;

// 解析JSON请求体
app.use(express.json());

// 调试中间件 - 记录所有请求
app.use((req, res, next) => {
  console.log('All requests:', req.method, req.url);
  next();
});

// 记录API请求
app.use('/api', (req, res, next) => {
  console.log('API requests received:', req.method, req.url);
  next();
});

// 为后端API创建代理
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: {
    '^/(.*)': '/api/$1'  // 将 /anything 转换为 /api/anything
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url, '->', proxyReq.method, proxyReq.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Received response:', proxyRes.statusCode, 'for', req.url);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err, 'for', req.url);
  }
}));

// 简单的主页
app.get('/', (req, res) => {
  res.send('Debug proxy server is running');
});

app.listen(PORT, () => {
  console.log(`Debug proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});