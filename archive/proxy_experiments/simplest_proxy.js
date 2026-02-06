const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// 解析JSON请求体
app.use(express.json());

// 最简单的代理配置 - 不做路径重写
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: false,  // 不更改源
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log('PROXY REQUEST ->', proxyReq.method, proxyReq.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('PROXY RESPONSE <-', proxyRes.statusCode);
  },
  onError: (err, req, res) => {
    console.error('PROXY ERROR:', err);
  }
}));

// 主页
app.get('/', (req, res) => {
  res.send('<h1>Simplest Proxy Server Running</h1>');
});

app.listen(PORT, () => {
  console.log(`Simplest proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});