const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// 解析JSON请求体
app.use(express.json());

// 为后端API创建代理 - 使用标准配置
const apiProxy = createProxyMiddleware('/api', {
  target: 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: {
    '^/api/(.*)': '/api/$1'  // 保持路径不变
  },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log('Outgoing request:', proxyReq.method, proxyReq.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Incoming response:', proxyRes.statusCode);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
  }
});

app.use('/api', apiProxy);

// 处理主页
app.get('/', (req, res) => {
  res.send('Known working proxy server is running');
});

app.listen(PORT, () => {
  console.log('Known working proxy server running on http://localhost:' + PORT);
  console.log('Proxy to backend API at http://localhost:8005');
});