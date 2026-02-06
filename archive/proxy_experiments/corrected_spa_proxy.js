const express = require('express');
const http = require('http');

const app = express();
const PORT = 3004;
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8005;

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

// 为前端的所有路由提供主页面 - 使用Express 5兼容语法
app.get(/^(\/[^.]*)$/, (req, res) => {
  // 提供React应用的入口页面，让客户端路由处理
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RiskGuard Dashboard - Login</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    function LoginPage() {
      const [isLogin, setIsLogin] = React.useState(true);
      const [username, setUsername] = React.useState('');
      const [email, setEmail] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [confirmPassword, setConfirmPassword] = React.useState('');
      const [error, setError] = React.useState('');
      const [loading, setLoading] = React.useState(false);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
          if (isLogin) {
            // 登录请求
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
              // 存储令牌
              localStorage.setItem('token', data.token);
              alert('登录成功！');
              // 修复路由问题 - 重定向到仪表板
              window.location.href = '/dashboard';
            } else {
              setError(data.message || data.detail || '登录失败');
            }
          } else {
            // 注册请求
            if (password !== confirmPassword) {
              setError('密码确认不匹配');
              setLoading(false);
              return;
            }

            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                username, 
                email,
                password
              }),
            });

            const data = await response.json();

            if (response.ok) {
              // 注册成功，自动登录
              const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
              });

              const loginData = await loginResponse.json();

              if (loginResponse.ok) {
                localStorage.setItem('token', loginData.token);
                alert('注册成功！');
                window.location.href = '/dashboard';
              } else {
                setError(loginData.detail || '登录失败');
              }
            } else {
              setError(data.detail || '注册失败');
            }
          }
        } catch (err) {
          console.error('Network error:', err);
          setError('网络错误，请稍后再试');
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">RiskGuard</h1>
              <p className="text-gray-600">
                {isLogin ? '欢迎回来，请登录您的账户' : '创建新账户'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!isLogin}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="请输入您的邮箱"
                  />
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请输入用户名"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请输入密码"
                />
              </div>
              
              {!isLogin && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="请再次输入密码"
                  />
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className={"w-full py-3 px-4 rounded-lg text-white font-medium transition-colors " + (loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
                )}>
                {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                {isLogin ? '还没有账户？立即注册' : '已有账户？立即登录'}
              </button>
            </div>

            {/* 提示信息 */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>提示：</strong> 测试账户: admin / admin123
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 渲染登录页面
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(<LoginPage />);
  </script>
</body>
</html>`;
  res.send(html);
});

app.listen(PORT, () => {
  console.log('Corrected SPA proxy server running on http://localhost:' + PORT);
  console.log('Proxy to backend API at http://' + BACKEND_HOST + ':' + BACKEND_PORT);
  console.log('Properly reconstructs API paths and supports SPA routing');
});