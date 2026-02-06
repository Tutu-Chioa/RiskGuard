const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// 解析JSON请求体
app.use(express.json());

// API代理 - 使用最简单的配置
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: {
    '^/api/(.*)': '/api/$1',  // 将 /api/anything 映射到 /api/anything
  },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log('PROXY REQUEST:', proxyReq.method, proxyReq.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('PROXY RESPONSE:', proxyRes.statusCode);
  },
  onError: (err, req, res) => {
    console.error('PROXY ERROR:', err);
  }
});

// 为所有以 /api 开头的请求使用代理
app.use('/api', apiProxy);

// 主页
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>RiskGuard</title></head>
    <body>
      <h1>RiskGuard System is Running</h1>
      <p>Frontend server running on port 3004</p>
      <p>API requests to /api/* will be forwarded to backend on port 8005</p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Minimal proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});