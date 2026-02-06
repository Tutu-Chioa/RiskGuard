const express = require('express');
const http = require('http');

const app = express();
const PORT = 3004;
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8005;

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));

// 纯HTTP代理函数
function httpProxy(req, res) {
  console.log('Proxying request:', req.method, req.url);
  
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url,  // 使用原始URL路径
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
}

// 为所有以 /api 开头的路径使用代理
app.use('/api', (req, res, next) => {
  httpProxy(req, res);
});

// 为前端路由提供相同的应用程序入口
// 这对于单页应用程序(SPA)非常重要
app.get('*', (req, res) => {
  // 如果请求不是API请求，也不是静态资源，则提供主页面
  if (!req.path.startsWith('/api/') && 
      !req.path.includes('.') && 
      req.path !== '/favicon.ico' &&
      req.path !== '/robots.txt') {
    // 提供前端页面，让React Router处理客户端路由
    res.send(`<!DOCTYPE html>
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
    function App() {
      const [isLoggedIn, setIsLoggedIn] = React.useState(!!localStorage.getItem('token'));
      const [username, setUsername] = React.useState('');
      const [email, setEmail] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [confirmPassword, setConfirmPassword] = React.useState('');
      const [error, setError] = React.useState('');
      const [loading, setLoading] = React.useState(false);
      const [currentPage, setCurrentPage] = React.useState('login'); // login, dashboard, companies, risks, monitor, settings, profile

      React.useEffect(() => {
        // 检查当前路径并相应地设置页面状态
        const path = window.location.pathname;
        if (isLoggedIn) {
          if (path === '/dashboard') {
            setCurrentPage('dashboard');
          } else if (path === '/companies') {
            setCurrentPage('companies');
          } else if (path === '/risks') {
            setCurrentPage('risks');
          } else if (path === '/monitor') {
            setCurrentPage('monitor');
          } else if (path === '/settings') {
            setCurrentPage('settings');
          } else if (path === '/profile') {
            setCurrentPage('profile');
          } else if (path === '/') {
            setCurrentPage('dashboard');
          }
        } else if (path === '/register') {
          setCurrentPage('register');
        } else {
          setCurrentPage('login');
        }
      }, [isLoggedIn]);

      const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
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
            setIsLoggedIn(true);
            setCurrentPage('dashboard');
            window.history.pushState({}, '', '/dashboard');
          } else {
            setError(data.message || data.detail || '登录失败');
          }
        } catch (err) {
          console.error('Network error:', err);
          setError('网络错误，请稍后再试');
        } finally {
          setLoading(false);
        }
      };

      const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== confirmPassword) {
          setError('密码确认不匹配');
          setLoading(false);
          return;
        }

        try {
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
              setIsLoggedIn(true);
              setCurrentPage('dashboard');
              window.history.pushState({}, '', '/dashboard');
            } else {
              setError(loginData.detail || '登录失败');
            }
          } else {
            setError(data.detail || '注册失败');
          }
        } catch (err) {
          console.error('Network error:', err);
          setError('网络错误，请稍后再试');
        } finally {
          setLoading(false);
        }
      };

      const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setCurrentPage('login');
        window.history.pushState({}, '', '/');
      };

      const navigate = (page) => {
        setCurrentPage(page);
        window.history.pushState({}, '', page === 'dashboard' ? '/' : '/' + page);
      };

      // 页面组件
      const LoginPage = () => (
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
                欢迎回来，请登录您的账户
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
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
              
              <button
                type="submit"
                disabled={loading}
                className={"w-full py-3 px-4 rounded-lg text-white font-medium transition-colors " + (loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
                )}>
                {loading ? '处理中...' : '登录'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('register')}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                还没有账户？立即注册
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

      const RegisterPage = () => (
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
                创建新账户
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请输入您的邮箱"
                />
              </div>
              
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
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请再次输入密码"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={"w-full py-3 px-4 rounded-lg text-white font-medium transition-colors " + (loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
                )}>
                {loading ? '处理中...' : '注册'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('login')}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                已有账户？立即登录
              </button>
            </div>
          </div>
        </div>
      );

      const DashboardPage = () => (
        <div className="min-h-screen bg-gray-50">
          {/* 顶部横幅 - 仅在仪表板页面显示 */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6 shadow-lg">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">RiskGuard 仪表板</h1>
                <div className="text-right">
                  <div className="text-lg">{new Date().toLocaleString('zh-CN')}</div>
                  <div className="text-sm opacity-80">风险监测系统</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold">24</div>
                  <div className="text-sm opacity-80">总风险项</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold">6</div>
                  <div className="text-sm opacity-80">高危风险</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-sm opacity-80">中危风险</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold">18</div>
                  <div className="text-sm opacity-80">今日新增</div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">本周风险趋势</h2>
              <div className="h-64 flex items-end space-x-2 justify-center">
                {[20, 35, 28, 42, 30, 55, 40].map((value, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="w-10 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t"
                      style={{ height: value * 4 + 'px' }}
                    ></div>
                    <span className="text-xs mt-2">{['一', '二', '三', '四', '五', '六', '日'][index]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="font-semibold mb-3">最新风险事件</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>供应链中断风险</span>
                    <span className="text-red-500 text-sm">高危</span>
                  </li>
                  <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>数据泄露风险</span>
                    <span className="text-orange-500 text-sm">中危</span>
                  </li>
                  <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>合规性风险</span>
                    <span className="text-yellow-500 text-sm">低危</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="font-semibold mb-3">活跃监控任务</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>新闻监测</span>
                    <span className="text-green-500 text-sm">运行中</span>
                  </li>
                  <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>社交媒体监测</span>
                    <span className="text-green-500 text-sm">运行中</span>
                  </li>
                  <li className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>法规更新监测</span>
                    <span className="text-gray-500 text-sm">暂停</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );

      // 更多页面组件...
      const CompaniesPage = () => (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">企业管理</h1>
              <p className="text-gray-600">企业信息管理页面</p>
            </div>
          </div>
        </div>
      );

      const RisksPage = () => (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">风险监控</h1>
              <p className="text-gray-600">风险监测和分析页面</p>
            </div>
          </div>
        </div>
      );

      const MonitorPage = () => (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">实时监控</h1>
              <p className="text-gray-600">实时监控面板</p>
            </div>
          </div>
        </div>
      );

      const SettingsPage = () => (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">系统设置</h1>
              <p className="text-gray-600">系统配置和个性化设置</p>
            </div>
          </div>
        </div>
      );

      const ProfilePage = () => (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">个人中心</h1>
              <p className="text-gray-600">个人信息和账户设置</p>
            </div>
          </div>
        </div>
      );

      // 渲染当前页面
      const renderCurrentPage = () => {
        switch(currentPage) {
          case 'login':
            return <LoginPage />;
          case 'register':
            return <RegisterPage />;
          case 'dashboard':
            return <DashboardPage />;
          case 'companies':
            return <CompaniesPage />;
          case 'risks':
            return <RisksPage />;
          case 'monitor':
            return <MonitorPage />;
          case 'settings':
            return <SettingsPage />;
          case 'profile':
            return <ProfilePage />;
          default:
            return <DashboardPage />;
        }
      };

      // 渲染侧边栏导航
      const renderSidebar = () => {
        if (!isLoggedIn) return null;
        
        return (
          <div className="w-64 bg-white shadow-lg min-h-screen">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">RiskGuard</h2>
            </div>
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('dashboard')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      currentPage === 'dashboard' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                    仪表板
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('companies')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      currentPage === 'companies' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    企业管理
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('risks')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      currentPage === 'risks' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                    </svg>
                    风险监控
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('monitor')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      currentPage === 'monitor' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    实时监控
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('profile')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      currentPage === 'profile' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    个人中心
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('settings')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      currentPage === 'settings' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    系统设置
                  </button>
                </li>
                <li className="pt-4 mt-4 border-t">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    退出登录
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        );
      };

      return (
        <div className="flex">
          {isLoggedIn && renderSidebar()}
          <div className={isLoggedIn ? "flex-1" : ""}>
            {renderCurrentPage()}
          </div>
        </div>
      );
    }

    // 渲染应用
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  </script>
</body>
</html>`);
  } else {
    // 对于静态资源或其他请求，返回404或适当响应
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, () => {
  console.log('Final proxy server with SPA routing running on http://localhost:' + PORT);
  console.log('Proxy to backend API at http://' + BACKEND_HOST + ':' + BACKEND_PORT);
  console.log('Supports client-side routing for single-page application');
});