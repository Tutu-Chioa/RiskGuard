const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const PORT = 3004;
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8005;

// 中间件设置CSP头部以允许必要的外部资源
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));

// 为所有以 /api 开头的路径使用代理
app.use('/api', (req, res, next) => {
  // 重建完整的API路径
  const fullPath = req.baseUrl + req.path;  // /api + /auth/login = /api/auth/login
  console.log('Proxying request:', req.method, fullPath);
  
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: fullPath,  // 使用完整的路径
    method: req.method,
    headers: { ...req.headers }
  };
  
  // 移除可能导致问题的headers
  delete options.headers['host'];
  delete options.headers['content-length'];
  
  const proxyReq = http.request(options, (proxyRes) => {
    console.log('Backend responded with:', proxyRes.statusCode);
    
    // 设置响应头
    res.status(proxyRes.statusCode);
    for (let key in proxyRes.headers) {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, proxyRes.headers[key]);
      }
    }
    
    // 将响应流传输到客户端
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  });
  
  // 如果有请求体，发送过去
  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
});

// 为所有前端路由提供相同的HTML页面
app.get(/^(\/(overview|analytics|monitor|api-status|companies|settings|profile)?\/?)$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('Simple Proxy Server running on http://localhost:' + PORT);
  console.log('Proxy to backend API at http://' + BACKEND_HOST + ':' + BACKEND_PORT);
});