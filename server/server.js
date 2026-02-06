const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3004;

// 为后端API创建代理（Express 挂载 /api 后，转发时 path 会去掉 /api，需补回）
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/', // /auth/login -> /api/auth/login
  },
}));

// 提供前端静态文件（server 在 server/ 下，risk_frontend 在项目根）
const buildPath = path.join(__dirname, '..', 'risk_frontend', 'build');
app.use(express.static(buildPath));

// 处理SPA路由
app.get(/^(\/[^?]*)?(\\?.*)?$/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});