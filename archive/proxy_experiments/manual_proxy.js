const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// 解析JSON请求体
app.use(express.json());

// 完全手动配置的代理 - 确保路径正确
app.use('/api/', (req, res, next) => {
  console.log('Manual proxy intercepting:', req.method, req.url);
  
  // 创建代理中间件实例
  const proxy = createProxyMiddleware({
    target: 'http://localhost:8005',
    changeOrigin: true,
    pathRewrite: {
      '^/api/(.*)$': '/api/$1'  // /api/anything -> /api/anything (保持不变)
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log('-> Forwarding to backend:', proxyReq.method, proxyReq.path);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log('<- Response from backend:', proxyRes.statusCode);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
    }
  });
  
  proxy(req, res, next);
});

// 主页
app.get('/', (req, res) => {
  res.send('<h1>Manual Proxy Server Running</h1>');
});

app.listen(PORT, () => {
  console.log(`Manual proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});