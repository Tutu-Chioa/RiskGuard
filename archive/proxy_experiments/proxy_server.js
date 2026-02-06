const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3004;

// 为后端API创建代理
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // 移除/api前缀，因为我们后端不需要
  },
}));

// 提供前端静态文件
app.use(express.static(path.join(__dirname, 'risk_frontend/build')));

// 处理SPA路由
app.get(/^(\/[^?]*)?(\\?.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'risk_frontend/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});