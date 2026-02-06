const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// 解析请求体，但对API路由不解析，让代理处理
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  // 保留原始路径，不进行重写
  pathRewrite: {
    '^/api/(.*)$': '/api/$1'  // 确保正则表达式正确
  },
  // 确保正确传递内容
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying:', req.method, req.url, '-> http://localhost:8005' + req.url);
    // 确保内容类型正确传递
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Response:', proxyRes.statusCode, 'for', req.url);
  }
}));

// 主页
app.get('/', (req, res) => {
  res.send('<h1>Frontend Server Running</h1>');
});

app.listen(PORT, () => {
  console.log(`Updated proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});