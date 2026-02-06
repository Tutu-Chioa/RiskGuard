const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

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

// 为所有前端路由提供相同的HTML页面
app.get(/^(\/(overview|analytics|monitor|api-status|companies|settings|profile)?\/?)$/, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RiskGuard Dashboard</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { height: 100vh; }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: all 0.3s ease;
    }
    .card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 30px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 30px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    
    input:checked + .slider:before {
      transform: translateX(30px);
    }
    
    .glass-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 16px;
    }
    
    .marquee {
      overflow: hidden;
      position: relative;
      height: 200px;
    }
    
    .marquee-content {
      animation: marqueeAnimation 20s linear infinite;
    }
    
    @keyframes marqueeAnimation {
      0% {
        transform: translateY(0);
      }
      100% {
        transform: translateY(-100%);
      }
    }
    
    /* Dark theme styles */
    .dark-theme {
      background-color: #1a202c !important;
      color: #e2e8f0;
    }
    
    .dark-theme .card {
      background: #2d3748;
      color: #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
    }
    
    .dark-theme .card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
    }
    
    .dark-theme .border-gray-200 {
      border-color: #4a5568;
    }
    
    .dark-theme .bg-gray-50 {
      background-color: #2d3748;
    }
    
    .dark-theme .bg-white {
      background-color: #2d3748;
    }
    
    .dark-theme .text-gray-800 {
      color: #e2e8f0;
    }
    
    .dark-theme .text-gray-700 {
      color: #cbd5e0;
    }
    
    .dark-theme .text-gray-600 {
      color: #a0aec0;
    }
    
    .dark-theme .text-gray-500 {
      color: #718096;
    }
    
    .dark-theme .hover\\:bg-gray-100:hover {
      background-color: #4a5568;
    }
    
    .dark-theme .hover\\:bg-gray-50:hover {
      background-color: #4a5568;
    }
    
    .dark-theme input {
      background-color: #4a5568;
      border-color: #718096;
      color: #fff;
    }
    
    .dark-theme select {
      background-color: #4a5568;
      border-color: #718096;
      color: #fff;
    }
    
    /* Theme colors */
    .theme-purple { --primary-color: 102, 126, 234; --secondary-color: 118, 75, 162; }
    .theme-blue { --primary-color: 59, 130, 246; --secondary-color: 37, 99, 235; }
    .theme-green { --primary-color: 16, 185, 129; --secondary-color: 5, 150, 105; }
    .theme-red { --primary-color: 239, 68, 68; --secondary-color: 220, 38, 38; }
    .theme-indigo { --primary-color: 99, 102, 241; --secondary-color: 79, 70, 229; }
    
    .theme-purple .bg-gradient-to-r.from-purple-600.to-indigo-700 {
      background: linear-gradient(90deg, rgb(var(--primary-color)) 0%, rgb(var(--secondary-color)) 100%);
    }
    
    .theme-blue .bg-gradient-to-r.from-purple-600.to-indigo-700 {
      background: linear-gradient(90deg, rgb(var(--primary-color)) 0%, rgb(var(--secondary-color)) 100%);
    }
    
    .theme-green .bg-gradient-to-r.from-purple-600.to-indigo-700 {
      background: linear-gradient(90deg, rgb(var(--primary-color)) 0%, rgb(var(--secondary-color)) 100%);
    }
    
    .theme-red .bg-gradient-to-r.from-purple-600.to-indigo-700 {
      background: linear-gradient(90deg, rgb(var(--primary-color)) 0%, rgb(var(--secondary-color)) 100%);
    }
    
    .theme-indigo .bg-gradient-to-r.from-purple-600.to-indigo-700 {
      background: linear-gradient(90deg, rgb(var(--primary-color)) 0%, rgb(var(--secondary-color)) 100%);
    }
  </style>
</head>
<body class="bg-gray-50">
  <div id="root"></div>
  <script>
    // 延迟初始化认证状态，确保DOM完全加载
    let globalAuthState = {
      isAuthenticated: false,
      token: null,
      user: null
    };

    // 从localStorage初始化状态
    function initAuthState() {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          globalAuthState.isAuthenticated = true;
          globalAuthState.token = storedToken;
          globalAuthState.user = JSON.parse(storedUser);
        } catch (e) {
          console.error('Failed to parse user data:', e);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    
    // 在DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', initAuthState);
    // 如果DOM已经加载完成，直接初始化
    if (document.readyState === 'loading') {
      // 正在加载中，DOMContentLoaded事件会处理
    } else {
      // DOM已经加载完成，立即初始化
      initAuthState();
    }

    // 保存认证状态到本地存储
    function saveAuthState(token, user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      globalAuthState.isAuthenticated = true;
      globalAuthState.token = token;
      globalAuthState.user = user;
    }

    // 清除认证状态
    function clearAuthState() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      globalAuthState.isAuthenticated = false;
      globalAuthState.token = null;
      globalAuthState.user = null;
    }

    // 验证令牌
    async function validateToken(token) {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        return response.ok;
      } catch (err) {
        console.error('Token validation error:', err);
        return false;
      }
    }
  </script>
  <script type="text/babel">
    // 创建认证上下文
    const AuthContext = React.createContext();

    // 认证提供者组件
    function AuthProvider({ children }) {
      const [authState, setAuthState] = React.useState(globalAuthState);

      const login = (token, user) => {
        saveAuthState(token, user);
        setAuthState({
          isAuthenticated: true,
          token: token,
          user: user
        });
      };

      const logout = () => {
        clearAuthState();
        setAuthState({
          isAuthenticated: false,
          token: null,
          user: null
        });
        // 重定向到登录页
        window.location.href = '/';
      };

      const value = {
        ...authState,
        login,
        logout
      };

      return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    }

    function useAuth() {
      return React.useContext(AuthContext);
    }

    // 主题上下文
    const ThemeContext = React.createContext();

    function ThemeProvider({ children }) {
      const [darkMode, setDarkMode] = React.useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === 'true' ? true : false;
      });
      
      const [theme, setTheme] = React.useState(() => {
        return localStorage.getItem('theme') || 'purple';
      });

      React.useEffect(() => {
        localStorage.setItem('darkMode', darkMode);
        if (darkMode) {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
      }, [darkMode]);

      React.useEffect(() => {
        localStorage.setItem('theme', theme);
        document.body.className = document.body.className.replace(/\\btheme-\\w+\\b/g, '');
        document.body.classList.add('theme-' + theme);
      }, [theme]);

      const toggleDarkMode = () => {
        setDarkMode(!darkMode);
      };

      const changeTheme = (newTheme) => {
        setTheme(newTheme);
      };

      return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode, theme, changeTheme }}>
          {children}
        </ThemeContext.Provider>
      );
    }

    function useTheme() {
      return React.useContext(ThemeContext);
    }

    // 获取当前页面类型
    function getCurrentPageType() {
      const path = window.location.pathname;
      if (path === '/' || path === '/overview') return 'overview';
      if (path === '/analytics') return 'analytics';
      if (path === '/monitor') return 'monitor';
      if (path === '/api-status') return 'api-status';
      if (path === '/companies') return 'companies';
      if (path === '/settings') return 'settings';
      if (path === '/profile') return 'profile';
      return 'login'; // 默认情况
    }

    // 导航函数
    function navigateTo(path) {
      window.history.pushState({}, '', path);
      // 强制触发React组件更新
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    // 主应用组件
    function App() {
      return (
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      );
    }

    function AppContent() {
      const { isAuthenticated, logout, login } = useAuth();
      const { darkMode } = useTheme();
      const [currentPage, setCurrentPage] = React.useState(getCurrentPageType());
      const [isLoading, setIsLoading] = React.useState(true);

      // 仅在组件首次挂载时设置初始状态
      React.useEffect(() => {
        // 更新全局状态
        globalAuthState.isAuthenticated = isAuthenticated;
        globalAuthState.token = isAuthenticated ? localStorage.getItem('token') : null;
        globalAuthState.user = isAuthenticated ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        
        // 延迟设置加载完成，确保状态完全同步
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }, [isAuthenticated]);

      // 监听URL变化
      React.useEffect(() => {
        const handlePopState = () => {
          const newPage = getCurrentPageType();
          setCurrentPage(newPage);
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
          window.removeEventListener('popstate', handlePopState);
        };
      }, []);

      // 如果还在加载中，显示加载状态
      if (isLoading) {
        return (
          <div className={`min-h-screen ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} flex items-center justify-center`}>
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mt-2`}>Loading...</p>
            </div>
          </div>
        );
      }

      // 根据当前页面渲染内容
      switch(getCurrentPageType()) {
        case 'overview':
          return <OverviewPage logout={logout} />;
        case 'analytics':
          return <AnalyticsPage logout={logout} />;
        case 'monitor':
          return <MonitorPage logout={logout} />;
        case 'api-status':
          return <ApiStatusPage logout={logout} />;
        case 'companies':
          return <CompaniesPage logout={logout} />;
        case 'settings':
          return <SettingsPage logout={logout} />;
        case 'profile':
          return <ProfilePage logout={logout} login={login} />;
        default:
          return <LoginPage login={login} />;
      }
    }

    // 登录页面组件
    function LoginPage({ login }) {
      const [username, setUsername] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [email, setEmail] = React.useState('');
      const [confirmPassword, setConfirmPassword] = React.useState('');
      const [isLogin, setIsLogin] = React.useState(true);
      const [error, setError] = React.useState('');
      const [loading, setLoading] = React.useState(false);

      // 检查是否有有效的认证信息
      React.useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        // 如果已经有有效认证信息，直接跳转到仪表板
        if (token && user) {
          try {
            const parsedUser = JSON.parse(user);
            if (parsedUser && parsedUser.username) {
              // 验证令牌有效性
              fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer ' + token
                }
              })
              .then(response => {
                if (response.ok) {
                  // 令牌有效，直接跳转到仪表板
                  navigateTo('/overview');
                } else {
                  // 令牌无效，清除本地存储
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                }
              })
              .catch(err => {
                console.error('Token verification failed:', err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
              });
            }
          } catch (e) {
            // 解析失败，清除本地存储
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      }, []);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
          let response, data;
          
          if (isLogin) {
            // 登录请求
            response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ username, password }),
            });
            data = await response.json();

            if (response.ok) {
              login(data.token, data.user);
              navigateTo('/overview');
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

            response = await fetch('/api/auth/register', {
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
            data = await response.json();

            if (response.ok) {
              // 注册成功后自动登录
              const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
              });
              const loginData = await loginResponse.json();

              if (loginResponse.ok) {
                login(loginData.token, loginData.user);
                navigateTo('/overview');
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="card p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <i className="fas fa-shield-alt text-white text-xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">RiskGuard</h1>
              <p className="text-gray-600">
                {isLogin ? '欢迎回来，请登录您的账户' : '创建新账户'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 bg-red-500 text-red-700 rounded-lg text-sm border border-red-200">
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
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="请输入您的邮箱"
                  />
                </div>
              ))}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
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
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
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
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="请再次输入密码"
                  />
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className={"w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-300 transform hover:scale-[1.02] " + (loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-lg'
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
                className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
              >
                {isLogin ? '还没有账户？立即注册' : '已有账户？立即登录'}
              </button>
            </div>

            {/* 提示信息 */}
            <div className="mt-8 p-4 bg-blue-50 bg-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>提示：</strong> 测试账户: admin / admin123
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 通用布局组件
    function Layout({ children, title, logout, currentPage }) {
      const { user } = useAuth();
      const { darkMode } = useTheme();
      const [sidebarOpen, setSidebarOpen] = React.useState(true);
      const [searchQuery, setSearchQuery] = React.useState('');

      const isActive = (page) => currentPage === page;

      const handleSearch = (e) => {
        e.preventDefault();
        console.log('搜索:', searchQuery);
        // 这里可以实现搜索功能
      };

      return (
        <div className={\`flex h-screen \${darkMode ? 'bg-gray-800' : 'bg-gray-50'}\`}>
          {/* 侧边栏 */}
          <div className={\`card \${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col\`}>
            <div className="p-4 border-b border-gray-200 flex items-center">
              {sidebarOpen && (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center text-white">
                    <i className="fas fa-shield-alt text-sm"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 ml-3">RiskGuard</h2>
                </div>
              )}
              {!sidebarOpen && (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center text-white mx-auto">
                  <i className="fas fa-shield-alt text-sm"></i>
                </div>
              )}
            </div>
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                <li>
                  <a 
                    href="/overview" 
                    onClick={(e) => { e.preventDefault(); navigateTo('/overview'); }} 
                    className={\`\${isActive('overview') ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'} flex items-center px-4 py-3 rounded-lg transition-colors\`}>
                    <i className="fas fa-chart-line text-lg mr-3"></i>
                    {sidebarOpen && <span>总览</span>}
                  </a>
                </li>
                <li>
                  <a 
                    href="/analytics" 
                    onClick={(e) => { e.preventDefault(); navigateTo('/analytics'); }} 
                    className={\`\${isActive('analytics') ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'} flex items-center px-4 py-3 rounded-lg transition-colors\`}>
                    <i className="fas fa-chart-bar text-lg mr-3"></i>
                    {sidebarOpen && <span>数据分析</span>}
                  </a>
                </li>
                <li>
                  <a 
                    href="/monitor" 
                    onClick={(e) => { e.preventDefault(); navigateTo('/monitor'); }} 
                    className={\`\${isActive('monitor') ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'} flex items-center px-4 py-3 rounded-lg transition-colors\`}>
                    <i className="fas fa-eye text-lg mr-3"></i>
                    {sidebarOpen && <span>监控</span>}
                  </a>
                </li>
                <li>
                  <a 
                    href="/api-status" 
                    onClick={(e) => { e.preventDefault(); navigateTo('/api-status'); }} 
                    className={\`\${isActive('api-status') ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'} flex items-center px-4 py-3 rounded-lg transition-colors\`}>
                    <i className="fas fa-plug text-lg mr-3"></i>
                    {sidebarOpen && <span>API状态</span>}
                  </a>
                </li>
                <li>
                  <a 
                    href="/companies" 
                    onClick={(e) => { e.preventDefault(); navigateTo('/companies'); }} 
                    className={\`\${isActive('companies') ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'} flex items-center px-4 py-3 rounded-lg transition-colors\`}>
                    <i className="fas fa-building text-lg mr-3"></i>
                    {sidebarOpen && <span>企业管理</span>}
                  </a>
                </li>
                <li>
                  <a 
                    href="/settings" 
                    onClick={(e) => { e.preventDefault(); navigateTo('/settings'); }} 
                    className={\`\${isActive('settings') ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'} flex items-center px-4 py-3 rounded-lg transition-colors\`}>
                    <i className="fas fa-cog text-lg mr-3"></i>
                    {sidebarOpen && <span>系统设置</span>}
                  </a>
                </li>
              </ul>
            </nav>
            
            {/* 左下角用户信息 - 点击进入个人中心 */}
            <div className="p-4 border-t border-gray-200">
              <div 
                className="flex items-center cursor-pointer hover:bg-gray-100 rounded p-2 transition-colors"
                onClick={() => navigateTo('/profile')}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {sidebarOpen && (
                  <div className="ml-3">
                    <p className="text-gray-800 text-sm font-medium">{user?.username || 'Guest'}</p>
                    <p className="text-gray-500 text-xs">{user?.role || 'User'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 主内容区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部横幅 - 只在总览页面显示 */}
            {currentPage === 'overview' && (
              <header className="card p-6 shadow">
                <div className="flex items-center justify-between px-6">
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">欢迎回来，{user?.username || '用户'}！</h1>
                    <p className="text-gray-600 text-sm">{new Date().toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <form onSubmit={handleSearch} className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索..."
                        className="pl-10 pr-12 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      />
                      <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                      <button 
                        type="submit"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 text-white p-1 rounded hover:bg-purple-700"
                      >
                        <i className="fas fa-paper-plane text-xs"></i>
                      </button>
                    </form>
                    <button 
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                    >
                      <i className="fas fa-bars text-lg"></i>
                    </button>
                  </div>
                </div>
              </header>
            )}

            {/* 对于非总览页面，使用标准头部 */}
            {currentPage !== 'overview' && (
              <header className="card p-4 shadow">
                <div className="flex items-center justify-between px-6">
                  <h1 className="text-xl font-bold text-gray-800 capitalize">
                    {currentPage === 'analytics' ? '数据分析' : 
                     currentPage === 'monitor' ? '实时监控' : 
                     currentPage === 'api-status' ? 'API状态' : 
                     currentPage === 'companies' ? '企业管理' : 
                     currentPage === 'settings' ? '系统设置' : 
                     currentPage === 'profile' ? '个人中心' : '页面'}
                  </h1>
                  <div className="flex items-center space-x-4">
                    <form onSubmit={handleSearch} className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索..."
                        className="pl-10 pr-12 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      />
                      <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                      <button 
                        type="submit"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 text-white p-1 rounded hover:bg-purple-700"
                      >
                        <i className="fas fa-paper-plane text-xs"></i>
                      </button>
                    </form>
                    <button 
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                    >
                      <i className="fas fa-bars text-lg"></i>
                    </button>
                  </div>
                </div>
              </header>
            )}

            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      );
    }

    // 总览页面组件
    function OverviewPage({ logout }) {
      const [riskEvents, setRiskEvents] = React.useState([
        { id: 1, title: '供应链中断风险', severity: 'high', time: '2分钟前' },
        { id: 2, title: '数据泄露风险', severity: 'medium', time: '5分钟前' },
        { id: 3, title: '合规性风险', severity: 'low', time: '10分钟前' },
        { id: 4, title: '市场波动风险', severity: 'medium', time: '15分钟前' },
        { id: 5, title: '政策变化风险', severity: 'low', time: '20分钟前' },
        { id: 6, title: '技术更新风险', severity: 'low', time: '25分钟前' },
        { id: 7, title: '人员流失风险', severity: 'medium', time: '30分钟前' },
        { id: 8, title: '财务流动性风险', severity: 'high', time: '35分钟前' },
      ]);
      
      const [monitoringTasks, setMonitoringTasks] = React.useState([
        { id: 1, name: '新闻监测', status: 'running' },
        { id: 2, name: '社交媒体监测', status: 'running' },
        { id: 3, name: '法规更新监测', status: 'paused' },
      ]);

      const getSeverityColor = (severity) => {
        switch(severity) {
          case 'high': return 'bg-red-100 text-red-800 border border-red-200';
          case 'medium': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
          case 'low': return 'bg-green-100 text-green-800 border border-green-200';
          default: return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
      };

      const getStatusColor = (status) => {
        switch(status) {
          case 'running': return 'bg-green-100 text-green-800 border border-green-200';
          case 'paused': return 'bg-gray-100 text-gray-800 border border-gray-200';
          case 'warning': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
          default: return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
      };

      const getStatusText = (status) => {
        switch(status) {
          case 'running': return '运行中';
          case 'paused': return '暂停';
          case 'warning': return '警告';
          default: return '未知';
        }
      };

      const toggleTaskStatus = (taskId) => {
        setMonitoringTasks(tasks => 
          tasks.map(task => 
            task.id === taskId 
              ? { ...task, status: task.status === 'running' ? 'paused' : 'running' } 
              : task
          )
        );
      };

      return (
        <Layout title="RiskGuard - 总览" logout={logout} currentPage="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="card p-6 border border-gray-200">
              <div className="text-3xl font-bold text-purple-600">24</div>
              <div className="text-gray-600">总风险项</div>
            </div>
            <div className="card p-6 border border-gray-200">
              <div className="text-3xl font-bold text-red-500">6</div>
              <div className="text-gray-600">高危风险</div>
            </div>
            <div className="card p-6 border border-gray-200">
              <div className="text-3xl font-bold text-yellow-500">12</div>
              <div className="text-gray-600">中危风险</div>
            </div>
            <div className="card p-6 border border-gray-200">
              <div className="text-3xl font-bold text-blue-500">18</div>
              <div className="text-gray-600">今日新增</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 card p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">本周风险趋势</h2>
              <div className="h-64 flex items-end space-x-2 justify-center">
                {[20, 35, 28, 42, 30, 55, 40].map((value, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="w-8 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t"
                      style={{ height: value * 4 + 'px' }}
                    ></div>
                    <span className="text-xs mt-2 text-gray-600">{['一', '二', '三', '四', '五', '六', '日'][index]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <i className="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>
                最新风险事件
              </h3>
              <div className="marquee">
                <div className="marquee-content space-y-3">
                  {riskEvents.concat(riskEvents).map((event, index) => (
                    <div key={\`\${event.id}-\${index}\`} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <span className="text-gray-700">{event.title}</span>
                      <div className="flex items-center">
                        <span className={'px-2 py-1 text-xs rounded ' + getSeverityColor(event.severity)}>
                          {event.severity === 'high' ? '高危' : event.severity === 'medium' ? '中危' : '低危'}
                        </span>
                        <span className="text-gray-500 text-xs ml-2">{event.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">活跃监控任务</h3>
                <button 
                  className="text-sm text-purple-600 hover:text-purple-800"
                  onClick={() => console.log('管理监控任务')}
                >
                  管理
                </button>
              </div>
              <ul className="space-y-3">
                {monitoringTasks.map((task) => (
                  <li key={task.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span className="text-gray-700">{task.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={'px-2 py-1 text-xs rounded ' + getStatusColor(task.status)}>
                        {getStatusText(task.status)}
                      </span>
                      <button 
                        onClick={() => toggleTaskStatus(task.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {task.status === 'running' ? <i className="fas fa-pause"></i> : <i className="fas fa-play"></i>}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">风险分布</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-gray-700 flex-1">高风险</span>
                  <span className="font-medium">25%</span>
                </div>
                <div className="pt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{width: '25%'}}></div>
                  </div>
                </div>
                
                <div className="flex items-center pt-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-gray-700 flex-1">中风险</span>
                  <span className="font-medium">50%</span>
                </div>
                <div className="pt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{width: '50%'}}></div>
                  </div>
                </div>
                
                <div className="flex items-center pt-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-700 flex-1">低风险</span>
                  <span className="font-medium">25%</span>
                </div>
                <div className="pt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '25%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">系统健康度</h3>
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-green-500">98%</div>
                <p className="text-gray-600 mt-2">系统运行良好</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">响应时间</span>
                    <span className="font-medium">125ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">可用性</span>
                    <span className="font-medium">99.99%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">错误率</span>
                    <span className="font-medium">0.02%</span>
                  </div>
                </div>
                <button 
                  className="mt-4 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-all"
                  onClick={() => console.log('查看详情')}
                >
                  查看详情
                </button>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // 数据分析页面组件
    function AnalyticsPage({ logout }) {
      const [selectedPeriod, setSelectedPeriod] = React.useState('week');
      const [chartType, setChartType] = React.useState('bar');

      const generateReport = () => {
        console.log('生成分析报告');
        // 这里可以实现报告生成功能
      };

      const exportReport = () => {
        console.log('导出报告');
        // 这里可以实现报告导出功能
      };

      return (
        <Layout title="RiskGuard - 数据分析" logout={logout} currentPage="analytics">
          <div className="card p-6 border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">数据分析面板</h2>
              <div className="flex space-x-3">
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                >
                  <option value="day">今日</option>
                  <option value="week">本周</option>
                  <option value="month">本月</option>
                  <option value="quarter">本季度</option>
                </select>
                <select 
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                >
                  <option value="bar">柱状图</option>
                  <option value="line">折线图</option>
                  <option value="pie">饼图</option>
                </select>
              </div>
            </div>
            <p className="text-gray-600">高级数据分析和可视化图表。</p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">风险分布图</h3>
                <div className="h-48 bg-gradient-to-r from-purple-50 to-indigo-50 rounded flex items-center justify-center">
                  <p className="text-gray-600">图表显示区域</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">趋势分析</h3>
                <div className="h-48 bg-gradient-to-r from-purple-50 to-indigo-50 rounded flex items-center justify-center">
                  <p className="text-gray-600">趋势图表区域</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-4 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">数据统计</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>数据量</span>
                  <span className="font-medium">1.2M</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>处理速度</span>
                  <span className="font-medium">15K/s</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>准确率</span>
                  <span className="font-medium">98.5%</span>
                </div>
              </div>
            </div>
            
            <div className="card p-4 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">最近分析</h3>
              <ul className="space-y-2">
                <li className="text-gray-600 text-sm">• 市场风险分析 (2小时前)</li>
                <li className="text-gray-600 text-sm">• 信用风险评估 (1天前)</li>
                <li className="text-gray-600 text-sm">• 合规性检查 (3天前)</li>
              </ul>
            </div>
            
            <div className="card p-4 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">操作面板</h3>
              <div className="space-y-2">
                <button 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-2 px-4 rounded hover:from-purple-700 hover:to-indigo-800 transition-all"
                  onClick={generateReport}
                >
                  新建分析
                </button>
                <button 
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition-all"
                  onClick={exportReport}
                >
                  导出报告
                </button>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // 监控页面组件
    function MonitorPage({ logout }) {
      const [activeTab, setActiveTab] = React.useState('tasks');
      const [alerts, setAlerts] = React.useState([
        { id: 1, title: '供应链中断风险增加', level: 'high', time: '5分钟前', acknowledged: false },
        { id: 2, title: '合规性指标异常', level: 'medium', time: '12分钟前', acknowledged: false },
        { id: 3, title: '市场波动超出阈值', level: 'medium', time: '18分钟前', acknowledged: true },
      ]);

      const acknowledgeAlert = (alertId) => {
        setAlerts(alerts => 
          alerts.map(alert => 
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          )
        );
      };

      const getLevelColor = (level) => {
        switch(level) {
          case 'high': return 'border-l-4 border-red-500 bg-red-50';
          case 'medium': return 'border-l-4 border-yellow-500 bg-yellow-50';
          case 'low': return 'border-l-4 border-blue-500 bg-blue-50';
          default: return 'border-l-4 border-gray-500 bg-gray-50';
        }
      };

      return (
        <Layout title="RiskGuard - 监控" logout={logout} currentPage="monitor">
          <div className="card p-6 border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">实时监控面板</h2>
              <div className="flex space-x-2">
                <button 
                  className={\`px-4 py-2 rounded-lg \${activeTab === 'tasks' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}\`}
                  onClick={() => setActiveTab('tasks')}
                >
                  监控任务
                </button>
                <button 
                  className={\`px-4 py-2 rounded-lg \${activeTab === 'alerts' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}\`}
                  onClick={() => setActiveTab('alerts')}
                >
                  最新警报
                </button>
              </div>
            </div>
            <p className="text-gray-600">实时监测各类风险指标和动态。</p>
            
            <div className="mt-6">
              {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-2">监控任务状态</h3>
                    <ul className="space-y-2">
                      <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">新闻监测 <span className="text-green-600">运行中</span></li>
                      <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">社交媒体监测 <span className="text-green-600">运行中</span></li>
                      <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">法规更新监测 <span className="text-gray-500">暂停</span></li>
                      <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">市场数据监测 <span className="text-green-600">运行中</span></li>
                    </ul>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-2">性能指标</h3>
                    <ul className="space-y-2">
                      <li className="flex justify-between text-gray-600">
                        <span>数据处理速度</span>
                        <span>15K/s</span>
                      </li>
                      <li className="flex justify-between text-gray-600">
                        <span>平均响应时间</span>
                        <span>125ms</span>
                      </li>
                      <li className="flex justify-between text-gray-600">
                        <span>系统可用性</span>
                        <span>99.99%</span>
                      </li>
                      <li className="flex justify-between text-gray-600">
                        <span>错误率</span>
                        <span>0.02%</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              
              {activeTab === 'alerts' && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">最新警报</h3>
                  <ul className="space-y-2">
                    {alerts.map(alert => (
                      <li 
                        key={alert.id} 
                        className={\`\${getLevelColor(alert.level)} p-3 rounded flex justify-between items-center \${alert.acknowledged ? 'opacity-60' : ''}\`}
                      >
                        <div>
                          <div className="font-medium text-gray-800">{alert.title}</div>
                          <div className="text-xs text-gray-500">{alert.time}</div>
                        </div>
                        {!alert.acknowledged && (
                          <button 
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            确认
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-4 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">系统健康度</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">98%</div>
                <p className="text-gray-600 text-sm">良好</p>
              </div>
            </div>
            
            <div className="card p-4 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">响应时间</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">125ms</div>
                <p className="text-gray-600 text-sm">快速</p>
              </div>
            </div>
            
            <div className="card p-4 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">数据吞吐量</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">2.4TB</div>
                <p className="text-gray-600 text-sm">今日累计</p>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // API状态页面组件
    function ApiStatusPage({ logout }) {
      const [refreshing, setRefreshing] = React.useState(false);
      
      const refreshStatus = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
        console.log('刷新API状态');
      };

      return (
        <Layout title="RiskGuard - API状态" logout={logout} currentPage="api-status">
          <div className="card p-6 border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">API服务状态</h2>
              <button 
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-all flex items-center"
                onClick={refreshStatus}
                disabled={refreshing}
              >
                <i className={'fas fa-sync-alt mr-2 ' + (refreshing ? 'animate-spin' : '')}></i>
                {refreshing ? '刷新中...' : '刷新状态'}
              </button>
            </div>
            <p className="text-gray-600">监控后端API服务的健康状况和性能指标。</p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">服务状态</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">
                    身份验证服务
                    <span className="text-green-600"><i className="fas fa-check-circle"></i> 正常</span>
                  </li>
                  <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">
                    数据库连接
                    <span className="text-green-600"><i className="fas fa-check-circle"></i> 正常</span>
                  </li>
                  <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">
                    缓存服务
                    <span className="text-green-600"><i className="fas fa-check-circle"></i> 正常</span>
                  </li>
                  <li className="flex justify-between p-2 border-b border-gray-200 text-gray-600">
                    消息队列
                    <span className="text-green-600"><i className="fas fa-check-circle"></i> 正常</span>
                  </li>
                </ul>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">性能指标</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between text-gray-600">
                    <span>请求速率</span>
                    <span>1,248 请求/分钟</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>平均响应时间</span>
                    <span>125 ms</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>错误率</span>
                    <span>0.02%</span>
                  </li>
                  <li className="flex justify-between text-gray-600">
                    <span>可用性</span>
                    <span>99.99%</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="card p-6 border border-gray-200">
            <h3 className="font-medium text-gray-800 mb-4">API端点监控</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-gray-600">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2">端点</th>
                    <th className="text-left py-2">方法</th>
                    <th className="text-left py-2">状态</th>
                    <th className="text-left py-2">响应时间</th>
                    <th className="text-left py-2">健康度</th>
                    <th className="text-left py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2">/api/auth/login</td>
                    <td className="py-2">POST</td>
                    <td className="py-2 text-green-600">正常</td>
                    <td className="py-2">85ms</td>
                    <td className="py-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '98%'}}></div>
                      </div>
                    </td>
                    <td className="py-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <i className="fas fa-chart-line"></i>
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2">/api/risk/data</td>
                    <td className="py-2">GET</td>
                    <td className="py-2 text-green-600">正常</td>
                    <td className="py-2">120ms</td>
                    <td className="py-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '95%'}}></div>
                      </div>
                    </td>
                    <td className="py-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <i className="fas fa-chart-line"></i>
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2">/api/company/list</td>
                    <td className="py-2">GET</td>
                    <td className="py-2 text-green-600">正常</td>
                    <td className="py-2">95ms</td>
                    <td className="py-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '97%}}></div>
                      </div>
                    </td>
                    <td className="py-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <i className="fas fa-chart-line"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Layout>
      );
    }

    // 企业管理页面组件
    function CompaniesPage({ logout }) {
      const [companies, setCompanies] = React.useState([
        { id: 1, name: '科技有限公司', status: 'active', riskLevel: 'low', contact: '张经理' },
        { id: 2, name: '制造集团', status: 'watch', riskLevel: 'medium', contact: '李总监' },
        { id: 3, name: '贸易公司', status: 'high-risk', riskLevel: 'high', contact: '王总裁' },
        { id: 4, name: '金融控股', status: 'active', riskLevel: 'low', contact: '赵董事' },
      ]);
      
      const [searchTerm, setSearchTerm] = React.useState('');
      const [showAddModal, setShowAddModal] = React.useState(false);

      const filteredCompanies = companies.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.contact.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const getStatusText = (status) => {
        switch(status) {
          case 'active': return '正常运营';
          case 'watch': return '关注中';
          case 'high-risk': return '高风险';
          default: return '未知';
        }
      };

      const getStatusColor = (status) => {
        switch(status) {
          case 'active': return 'bg-green-100 text-green-800 border border-green-200';
          case 'watch': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
          case 'high-risk': return 'bg-red-100 text-red-800 border border-red-200';
          default: return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
      };

      const getRiskColor = (riskLevel) => {
        switch(riskLevel) {
          case 'low': return 'bg-green-100 text-green-800 border border-green-200';
          case 'medium': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
          case 'high': return 'bg-red-100 text-red-800 border border-red-200';
          default: return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
      };

      const deleteCompany = (companyId) => {
        setCompanies(companies => companies.filter(c => c.id !== companyId));
      };

      const openAddModal = () => {
        setShowAddModal(true);
      };

      const closeAddModal = () => {
        setShowAddModal(false);
      };

      return (
        <Layout title="RiskGuard - 企业管理" logout={logout} currentPage="companies">
          <div className="card p-6 border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">企业信息管理</h2>
              <button 
                className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-2 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all flex items-center"
                onClick={openAddModal}
              >
                <i className="fas fa-plus mr-2"></i>添加企业
              </button>
            </div>
            <p className="text-gray-600">管理企业信息，进行增删改查操作。</p>
            
            <div className="mt-6 flex justify-between items-center">
              <div className="relative w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索企业..."
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500"
                />
                <i className="fas fa-search absolute right-3 top-2.5 text-gray-400"></i>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-6 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-4">企业列表</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-gray-600">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2">企业名称</th>
                      <th className="text-left py-2">联系人</th>
                      <th className="text-left py-2">状态</th>
                      <th className="text-left py-2">风险等级</th>
                      <th className="text-left py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 font-medium">{company.name}</td>
                        <td className="py-3">{company.contact}</td>
                        <td className="py-3">
                          <span className={'px-2 py-1 text-xs rounded ' + getStatusColor(company.status)}>
                            {getStatusText(company.status)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={'px-2 py-1 text-xs rounded ' + getRiskColor(company.riskLevel)}>
                            {company.riskLevel === 'low' ? '低风险' : company.riskLevel === 'medium' ? '中风险' : '高风险'}
                          </span>
                        </td>
                        <td className="py-3">
                          <button className="text-blue-600 hover:text-blue-800 mr-3" onClick={() => console.log('编辑企业', company.id)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="text-red-600 hover:text-red-800" onClick={() => deleteCompany(company.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="card p-6 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-4">操作面板</h3>
              <div className="space-y-4">
                <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all flex items-center justify-center">
                  <i className="fas fa-file-export mr-2"></i>导出报表
                </button>
                <button className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-all flex items-center justify-center">
                  <i className="fas fa-sync-alt mr-2"></i>刷新数据
                </button>
                <button className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-all flex items-center justify-center">
                  <i className="fas fa-filter mr-2"></i>筛选条件
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">批量操作</h4>
                <div className="space-y-2">
                  <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-200 transition-all">
                    批量删除
                  </button>
                  <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-200 transition-all">
                    批量更新
                  </button>
                  <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-200 transition-all">
                    导出选中
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 添加企业模态框 */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="card p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新企业</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">企业名称</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      placeholder="输入企业名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      placeholder="输入联系人姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900">
                      <option value="active">正常运营</option>
                      <option value="watch">关注中</option>
                      <option value="high-risk">高风险</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
                    <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900">
                      <option value="low">低风险</option>
                      <option value="medium">中风险</option>
                      <option value="high">高风险</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button 
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-all"
                    onClick={closeAddModal}
                  >
                    取消
                  </button>
                  <button 
                    className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all"
                    onClick={() => {
                      // 添加企业逻辑
                      closeAddModal();
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}
        </Layout>
      );
    }

    // 系统设置页面组件
    function SettingsPage({ logout }) {
      const { darkMode, toggleDarkMode, theme, changeTheme } = useTheme();
      const [settings, setSettings] = React.useState({
        notifications: true,
        autoRefresh: true,
        backupEnabled: false,
        apiLogging: true,
        fontSize: 'medium',
        autoSave: true
      });

      const [activeTab, setActiveTab] = React.useState('appearance');

      const toggleSetting = (key) => {
        setSettings(prev => ({
          ...prev,
          [key]: !prev[key]
        }));
      };

      const updateSetting = (key, value) => {
        setSettings(prev => ({
          ...prev,
          [key]: value
        }));
      };

      const saveSettings = () => {
        console.log('保存设置:', settings);
        // 这里可以调用API保存设置
      };

      return (
        <Layout title="RiskGuard - 系统设置" logout={logout} currentPage="settings">
          <div className="card p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">系统配置</h2>
              <button 
                className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-2 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all"
                onClick={saveSettings}
              >
                <i className="fas fa-save mr-2"></i>保存设置
              </button>
            </div>
            
            {/* 设置选项卡 */}
            <div className="flex border-b border-gray-200 mb-6">
              <button 
                className={\`px-4 py-2 font-medium \${activeTab === 'appearance' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}\`}
                onClick={() => setActiveTab('appearance')}
              >
                外观设置
              </button>
              <button 
                className={\`px-4 py-2 font-medium \${activeTab === 'notifications' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}\`}
                onClick={() => setActiveTab('notifications')}
              >
                通知设置
              </button>
              <button 
                className={\`px-4 py-2 font-medium \${activeTab === 'system' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}\`}
                onClick={() => setActiveTab('system')}
              >
                系统设置
              </button>
            </div>
            
            <div className="space-y-8">
              {activeTab === 'appearance' && (
                <>
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="font-medium text-lg text-gray-800 mb-4 flex items-center">
                      <i className="fas fa-palette mr-3 text-purple-600"></i>外观设置
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-gray-700">深色模式</label>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={darkMode} 
                              onChange={toggleDarkMode} 
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                        <p className="text-gray-500 text-sm">切换深色/浅色主题</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-gray-700">字体大小</label>
                          <select 
                            value={settings.fontSize}
                            onChange={(e) => updateSetting('fontSize', e.target.value)}
                            className="bg-white text-gray-900 px-3 py-1 rounded border border-gray-300"
                          >
                            <option value="small">小号</option>
                            <option value="medium">标准</option>
                            <option value="large">大号</option>
                            <option value="extra-large">超大号</option>
                          </select>
                        </div>
                        <p className="text-gray-500 text-sm">调整界面字体大小</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-gray-700">主题颜色</label>
                          <select 
                            value={theme}
                            onChange={(e) => changeTheme(e.target.value)}
                            className="bg-white text-gray-900 px-3 py-1 rounded border border-gray-300"
                          >
                            <option value="purple">紫色主题</option>
                            <option value="blue">蓝色主题</option>
                            <option value="green">绿色主题</option>
                            <option value="red">红色主题</option>
                            <option value="indigo">靛青色主题</option>
                          </select>
                        </div>
                        <p className="text-gray-500 text-sm">选择不同的主题颜色</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {activeTab === 'notifications' && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="font-medium text-lg text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-bell mr-3 text-purple-600"></i>通知设置
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-gray-700 block">高风险警报</label>
                          <p className="text-gray-500 text-sm">接收高风险事件的通知</p>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={settings.notifications} 
                            onChange={() => toggleSetting('notifications')} 
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-gray-700 block">每日摘要报告</label>
                          <p className="text-gray-500 text-sm">每天接收风险摘要邮件</p>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={settings.autoRefresh} 
                            onChange={() => toggleSetting('autoRefresh')} 
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-gray-700 block">系统维护通知</label>
                          <p className="text-gray-500 text-sm">接收系统更新和维护信息</p>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={settings.apiLogging} 
                            onChange={() => toggleSetting('apiLogging')} 
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'system' && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="font-medium text-lg text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-cogs mr-3 text-purple-600"></i>系统功能
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-gray-700 block">自动保存</label>
                          <p className="text-gray-500 text-sm">自动保存您的设置和偏好</p>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={settings.autoSave} 
                            onChange={() => toggleSetting('autoSave')} 
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-gray-700 block">自动刷新数据</label>
                          <p className="text-gray-500 text-sm">定期自动更新显示的数据</p>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={settings.autoRefresh} 
                            onChange={() => toggleSetting('autoRefresh')} 
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-gray-700 block">启用数据备份</label>
                          <p className="text-gray-500 text-sm">定期备份系统数据</p>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={settings.backupEnabled} 
                            onChange={() => toggleSetting('backupEnabled')} 
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Layout>
      );
    }

    // 个人中心页面组件
    function ProfilePage({ logout, login }) {
      const { user } = useAuth();
      const [localUser, setLocalUser] = React.useState({
        username: user?.username || 'admin',
        email: 'admin@example.com',
        phone: '+86 138****8888',
        department: '风险管理部',
        role: user?.role || '管理员',
        avatar: null
      });

      const [editing, setEditing] = React.useState(false);
      const [formData, setFormData] = React.useState({...localUser});
      const [activeTab, setActiveTab] = React.useState('profile');

      const handleEditToggle = async () => {
        if (editing) {
          // 保存更改
          try {
            // 更新全局用户信息
            const updatedUser = {
              ...user,
              username: formData.username,
              role: formData.role
            };
            
            // 保存到本地存储
            const token = localStorage.getItem('token');
            if (token) {
              // 这里通常会调用API更新用户信息
              console.log('更新用户信息:', formData);
              
              // 更新全局状态
              globalAuthState.user = updatedUser;
              
              // 更新本地状态
              setLocalUser({...formData});
              
              // 如果用户名改变，需要更新全局用户对象
              if (user.username !== formData.username) {
                // 更新本地存储中的用户名
                const userData = JSON.parse(localStorage.getItem('user'));
                userData.username = formData.username;
                localStorage.setItem('user', JSON.stringify(userData));
                
                // 更新全局用户对象
                globalAuthState.user.username = formData.username;
              }
            }
          } catch (error) {
            console.error('更新用户信息失败:', error);
          }
        }
        setEditing(!editing);
      };

      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      };

      const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setFormData(prev => ({
              ...prev,
              avatar: e.target.result
            }));
          };
          reader.readAsDataURL(file);
        }
      };

      const changePassword = async () => {
        // 这里实现密码更改逻辑
        console.log('更改密码:', { newPassword: formData.newPassword, confirmPassword: formData.confirmPassword });
      };

      return (
        <Layout title="RiskGuard - 个人中心" logout={logout} currentPage="profile">
          <div className="card p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">个人中心</h2>
            
            {/* 选项卡导航 */}
            <div className="flex border-b border-gray-200 mb-6">
              <button 
                className={\`px-4 py-2 font-medium \${activeTab === 'profile' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}\`}
                onClick={() => setActiveTab('profile')}
              >
                个人信息
              </button>
              <button 
                className={\`px-4 py-2 font-medium \${activeTab === 'security' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}\`}
                onClick={() => setActiveTab('security')}
              >
                安全设置
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 头像区域 */}
              <div className="lg:col-span-1">
                <div className="card p-6 border border-gray-200 text-center">
                  <div className="relative mx-auto w-32 h-32 mb-4">
                    {formData.avatar ? (
                      <img 
                        src={formData.avatar} 
                        alt="头像" 
                        className="w-full h-full rounded-full object-cover border-4 border-purple-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-purple-200">
                        {formData.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {editing && (
                      <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-2 cursor-pointer">
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          <i className="fas fa-camera text-white"></i>
                          <input 
                            id="avatar-upload"
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleAvatarChange}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800">{formData.username}</h3>
                  <p className="text-gray-600">{formData.role}</p>
                  
                  {editing ? (
                    <button 
                      className="mt-4 bg-gradient-to-r from-green-600 to-teal-700 text-white py-2 px-6 rounded-lg hover:from-green-700 hover:to-teal-800 transition-all"
                      onClick={handleEditToggle}
                    >
                      保存更改
                    </button>
                  ) : (
                    <button 
                      className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-2 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all"
                      onClick={handleEditToggle}
                    >
                      编辑资料
                    </button>
                  )}
                </div>
              </div>
              
              {/* 信息表单 */}
              <div className="lg:col-span-2">
                {activeTab === 'profile' && (
                  <div className="card p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">用户名</label>
                        {editing ? (
                          <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          />
                        ) : (
                          <p className="text-gray-800">{localUser.username}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">角色</label>
                        {editing ? (
                          <input
                            type="text"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          />
                        ) : (
                          <p className="text-gray-800">{localUser.role}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">邮箱</label>
                        {editing ? (
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          />
                        ) : (
                          <p className="text-gray-800">{localUser.email}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">手机号</label>
                        {editing ? (
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          />
                        ) : (
                          <p className="text-gray-800">{localUser.phone}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">部门</label>
                        {editing ? (
                          <input
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          />
                        ) : (
                          <p className="text-gray-800">{localUser.department}</p>
                        )}
                      </div>
                    </div>
                    
                    {editing && (
                      <div className="mt-6 flex space-x-4">
                        <button 
                          className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-2 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all"
                          onClick={handleEditToggle}
                        >
                          保存更改
                        </button>
                        <button 
                          className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-300 transition-all"
                          onClick={() => {
                            setFormData({...localUser});
                            setEditing(false);
                          }}
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'security' && (
                  <div className="card p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">安全设置</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">当前密码</label>
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword || ''}
                          onChange={handleChange}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          placeholder="输入当前密码"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">新密码</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword || ''}
                          onChange={handleChange}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          placeholder="输入新密码"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">确认新密码</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword || ''}
                          onChange={handleChange}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          placeholder="再次输入新密码"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <button 
                        className="bg-gradient-to-r from-blue-600 to-cyan-700 text-white py-2 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-800 transition-all"
                        onClick={changePassword}
                      >
                        <i className="fas fa-key mr-2"></i>修改密码
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="card p-6 border border-gray-200 mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">账户操作</h3>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      className="bg-gradient-to-r from-red-600 to-orange-700 text-white py-2 px-6 rounded-lg hover:from-red-700 hover:to-orange-800 transition-all"
                      onClick={logout}
                    >
                      <i className="fas fa-sign-out-alt mr-2"></i>退出登录
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // 渲染应用
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    
    // 延迟渲染应用，确保所有初始化完成
    setTimeout(() => {
      root.render(<App />);
    }, 100);
  </script>
</body>
</html>`;
  res.send(html);
});

// 主页路由
app.get('/', (req, res) => {
  res.redirect('/overview');
});

app.listen(PORT, () => {
  console.log('Static Server with Proxy running on http://localhost:' + PORT);
  console.log('Proxy to backend API at http://' + BACKEND_HOST + ':' + BACKEND_PORT);
  console.log('Features: Username sync, search submit button, dark mode, theme switching');
});