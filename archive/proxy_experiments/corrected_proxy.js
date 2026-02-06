const express = require('express');
const http = require('http');

const app = express();
const PORT = 3004;

// 解析JSON请求体
app.use(express.json());

// 记录所有请求
app.use((req, res, next) => {
  console.log('Request received:', req.method, req.url);
  next();
});

// 为API请求创建代理处理器 - 修正路径处理
app.use('/api', (req, res) => {
  console.log('Proxying API request - original:', req.method, req.originalUrl, 'processed:', req.method, req.url);
  
  // 由于Express截取了/api前缀，我们需要把它加回去
  // req.url 是 /auth/login，但我们需要 /api/auth/login 发送到后端
  const backendPath = '/api' + req.url;
  
  // 构建后端请求选项
  const options = {
    hostname: 'localhost',
    port: 8005,
    path: backendPath, // 加回 /api 前缀
    method: req.method,
    headers: {
      ...req.headers,
      // 确保Host头部正确
      'host': 'localhost:8005',
      // 删除可能引起混淆的代理相关头部
      'content-length': req.headers['content-length']
    }
  };
  
  console.log('Proxying to backend:', options.method, 'http://localhost:8005' + backendPath);
  
  // 创建到后端的HTTP请求
  const proxyReq = http.request(options, (proxyRes) => {
    console.log('Backend response:', proxyRes.statusCode);
    
    // 将后端响应头复制到前端响应
    // 避免某些可能导致冲突的头部
    const headersToSend = {...proxyRes.headers};
    delete headersToSend.connection; // 删除hop-by-hop headers
    delete headersToSend['transfer-encoding'];
    
    res.writeHead(proxyRes.statusCode, headersToSend);
    
    // 将后端响应数据流传输到前端
    proxyRes.pipe(res, {
      end: true
    });
  });
  
  // 错误处理
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  });
  
  // 将前端请求数据传输到后端
  req.pipe(proxyReq, {
    end: true
  });
});

// 主页
app.get('/', (req, res) => {
  res.send('Corrected proxy server is running');
});

app.listen(PORT, () => {
  console.log(`Corrected proxy server running on http://localhost:${PORT}`);
  console.log('Forwarding /api requests to http://localhost:8005 with /api prefix');
});