const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3006;

// 为后端API创建简单代理
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  // 不进行路径重写，让请求直接通过
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

// 简单的健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

app.listen(PORT, () => {
  console.log(`Simple test proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});