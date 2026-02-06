const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// 解析JSON请求体
app.use(express.json());

// 为后端API创建代理 - 修复路径重写问题
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: {
    '^/api/': '/api/',  // 修正路径重写规则
    '^/api': '/api'     // 保持现有规则
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url, '->', 'http://localhost:8005' + req.url);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Received response:', proxyRes.statusCode, 'for', req.url);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err, 'for', req.url);
    res.status(500).send('Proxy error');
  }
}));

// 处理主页
app.get('/', (req, res) => {
  console.log('Serving main page');
  // 返回登录页面
  res.send(`
<!DOCTYPE html>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ri ng-purple-500 focus:border-transparent"
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
                <strong>提示：</strong> 测试账户: test / password
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
</html>
  `);
});

// 处理仪表板页面
app.get('/dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RiskGuard Dashboard</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background-color: #f5f7fa;
    }
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 250px;
      background: white;
      box-shadow: 2px 0 5px rgba(0,0,0,0.05);
      padding: 1.5rem 1rem;
    }
    .main-content {
      flex: 1;
      padding: 1.5rem;
    }
    .header {
      background: white;
      padding: 1rem;
      margin-bottom: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .nav-link {
      display: block;
      padding: 0.75rem;
      margin: 0.25rem 0;
      text-decoration: none;
      color: #333;
      border-radius: 5px;
    }
    .nav-link:hover, .nav-link.active {
      background: #667eea;
      color: white;
    }
  </style>
</head>
<body>
  <div class="dashboard-layout">
    <div class="sidebar">
      <h3>RiskGuard</h3>
      <a href="/dashboard" class="nav-link active">总览</a>
      <a href="#" class="nav-link">企业管理</a>
      <a href="#" class="nav-link">监控面板</a>
      <a href="#" class="nav-link">预警信息</a>
      <a href="#" class="nav-link">API状态</a>
      <a href="#" class="nav-link">系统设置</a>
    </div>
    <div class="main-content">
      <div class="header">
        <h1>风险监控仪表板</h1>
        <p>实时监控企业风险信息</p>
      </div>
      <div id="dashboard-content">
        <h2>欢迎使用 RiskGuard 风险监控平台</h2>
        <p>系统正在运行中...</p>
      </div>
    </div>
  </div>

  <script>
    // 检查认证状态
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
    }
    
    // 从API获取数据的示例
    async function fetchData() {
      try {
        const response = await fetch('/api/companies', {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          document.getElementById('dashboard-content').innerHTML = '<h3>企业数量: ' + data.length + '</h3>';
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    
    fetchData();
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('Fixed proxy server running on http://localhost:' + PORT);
  console.log('Proxy to backend API at http://localhost:8005');
  console.log('Fixed path rewriting for API endpoints');
});