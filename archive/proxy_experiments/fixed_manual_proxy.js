const express = require('express');
const http = require('http');
const { parse } = require('url');

const app = express();
const PORT = 3004;

// 不预先解析JSON，让代理处理
app.use('/api', (req, res) => {
  console.log('Proxying request:', req.method, req.url);
  
  // 收集请求体数据
  let body = [];
  req.on('data', chunk => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    
    // 解析请求URL
    const parsedUrl = parse(req.url, true);
    const targetUrl = 'http://localhost:8005' + parsedUrl.pathname + (parsedUrl.query ? '?' + parsedUrl.query : '');
    
    // 准备请求选项
    const options = {
      method: req.method,
      hostname: 'localhost',
      port: 8005,
      path: parsedUrl.pathname + (parsedUrl.query ? '?' + parsedUrl.query : ''),
      headers: { ...req.headers }
    };
    
    // 删除可能导致问题的头部
    delete options.headers['host'];
    delete options.headers['content-length'];
    
    // 创建代理请求
    const proxyReq = http.request(targetUrl, options, (proxyRes) => {
      // 设置响应头
      Object.keys(proxyRes.headers).forEach(key => {
        if (key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, proxyRes.headers[key]);
        }
      });
      
      // 设置状态码
      res.status(proxyRes.statusCode);
      
      // 管道响应数据
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error');
    });
    
    // 发送请求体数据
    if (body) {
      proxyReq.setHeader('Content-Length', Buffer.byteLength(body));
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

// 为主页提供JSON解析
app.use(express.json());

// 主页
app.get('/', (req, res) => {
  res.send('<h1>Frontend Server Running</h1>');
});

app.listen(PORT, () => {
  console.log(`Fixed manual proxy server running on http://localhost:${PORT}`);
  console.log('Proxy to backend API at http://localhost:8005');
});