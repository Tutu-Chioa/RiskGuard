import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { SettingsProvider } from './SettingsContext';
import { ToastProvider } from './ToastContext';
import { useDateTimeFormat } from './utils/useDateTimeFormat';
import { useTranslation } from './i18n';
import MainContent from './MainContent';
import RightPanel from './RightPanel';
import UserDashboard from './UserDashboard';
import LoginPage from './LoginPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import PersonalCenter from './PersonalCenter';
import CompanyDetail from './CompanyDetail';
import CompanyManagement from './CompanyManagement';
import SettingsPage from './SettingsPage';
import AdminPage from './AdminPage';
import ErrorBoundary from './ErrorBoundary';
import UploadCenter from './UploadCenter';
import CompanyCompare from './CompanyCompare';
import TaskStatus from './TaskStatus';

// 企业详情页包装：按 id 作为 key 强制 remount，避免切换/新建企业时社会评价、相关新闻等残留上一家数据
const CompanyDetailPage = () => {
  const { id } = useParams();
  return <CompanyDetail key={id} />;
};

// 受保护的路由组件
const ProtectedRoute = ({ children, allowedRoles = ['admin', 'user'] }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 theme-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole = role || 'user';
  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// 未授权页面
const UnauthorizedPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="bg-white p-8 rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">访问被拒绝</h2>
      <p className="text-gray-600 mb-4">您没有权限访问此页面</p>
      <a href="/login" className="theme-link font-medium">返回登录</a>
    </div>
  </div>
);

// 侧边栏组件（支持移动端抽屉：sidebarMobileOpen + onMobileClose）
function Sidebar({ sidebarMobileOpen, onMobileClose }) {
  const { user, role, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [statusData, setStatusData] = useState({ services: [] });
  const [statusLoading, setStatusLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!showStatusPanel) return;
    setStatusLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/system-status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { services: [] })
      .then(d => { setStatusData(d); setStatusLoading(false); })
      .catch(() => { setStatusLoading(false); });
  }, [showStatusPanel]);

  // 按使用频率/重要性排序：首页 → 企业管理 → 风险警报(admin) → 企业对比 → 任务状态 → 上传资料 → 数据分析 → 系统设置；文案来自 i18n
  const getMenuItems = () => {
    const menuItems = [
      { path: "/", labelKey: "nav.home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
      { path: "/company-management", labelKey: "nav.company", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    ];
    if (role === 'admin') {
      menuItems.push(
        { path: "/alerts", labelKey: "nav.alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
        { path: "/admin", labelKey: "nav.admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" }
      );
    }
    menuItems.push(
      { path: "/company-compare", labelKey: "nav.compare", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
      { path: "/task-status", labelKey: "nav.tasks", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
      { path: "/upload-center", labelKey: "nav.upload", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
      { path: "/analytics", labelKey: "nav.analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
      { path: "/settings", labelKey: "nav.settings", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z" }
    );
    return menuItems;
  };

  const menuItems = getMenuItems();

  // 检查当前路径是否匹配菜单项
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/40 z-30 transition-opacity ${sidebarMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <div className={`relative flex flex-col h-full bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 transition-all duration-300
        fixed lg:relative inset-y-0 left-0 z-40 w-64 ${isExpanded ? 'lg:w-64' : 'lg:w-24'}
        ${sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo 区域：可点击回首页；收起时图标与箭头横向排列，通过侧栏宽度容纳 */}
        <div className="h-14 sm:h-16 flex flex-row items-center border-b border-gray-200 dark:border-gray-700 shrink-0 px-2 sm:px-3">
          <Link
            to="/"
            onClick={() => onMobileClose && onMobileClose()}
            className="flex items-center flex-1 min-w-0 rounded-lg hover:opacity-90 transition-opacity"
            title="返回首页概览"
          >
            <div className="w-8 h-8 theme-gradient-banner rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            {isExpanded && <span className="ml-2 sm:ml-3 text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate">RiskGuard</span>}
          </Link>
          <button 
            onClick={() => (sidebarMobileOpen && onMobileClose ? onMobileClose() : setIsExpanded(!isExpanded))}
            className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 p-1.5 sm:p-1 flex-shrink-0"
            aria-label={sidebarMobileOpen ? '关闭菜单' : isExpanded ? '收起' : '展开'}
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0" style={{ transform: isExpanded ? 'none' : 'rotate(180deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onMobileClose && onMobileClose()}
              style={{ paddingTop: 'var(--density-spacing, 0.5rem)', paddingBottom: 'var(--density-spacing, 0.5rem)' }}
              className={`flex items-center px-3 text-sm font-medium rounded-lg transition-colors group ${
                isActive(item.path)
                  ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border-r-2 border-[var(--primary-color)]'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <svg className={`w-5 h-5 ${isActive(item.path) ? '' : 'text-gray-500 dark:text-gray-400 group-hover:opacity-80'}`} style={isActive(item.path) ? { color: 'var(--primary-color)' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
              </svg>
              {isExpanded && <span className={`ml-3 ${isActive(item.path) ? 'font-medium' : ''}`} style={isActive(item.path) ? { color: 'var(--primary-color)' } : {}}>{t(item.labelKey)}</span>}
            </Link>
          ))}
        </nav>

        {/* 系统状态按钮 */}
        <div className="px-2 py-2">
          <div
            onClick={() => setShowStatusPanel(!showStatusPanel)}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
              showStatusPanel 
                ? 'bg-[var(--primary-color)]/10 border-r-2 border-[var(--primary-color)]' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            style={showStatusPanel ? { color: 'var(--primary-color)' } : {}}
          >
            <svg className={`w-5 h-5 ${showStatusPanel ? '' : 'text-gray-500 dark:text-gray-400'}`} style={showStatusPanel ? { color: 'var(--primary-color)' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            {isExpanded && <span className={`ml-3 ${showStatusPanel ? 'font-medium' : ''}`} style={showStatusPanel ? { color: 'var(--primary-color)' } : {}}>{t('nav.status')}</span>}
          </div>
        </div>

        {/* 用户信息区域 - 点击头像跳转个人中心 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate('/personal-center')}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--primary-color)] text-white text-xs font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)]"
              title="个人中心"
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </button>
            {isExpanded && (
              <div className="ml-2 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.username || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{user?.role || 'user'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            {isExpanded && <span className="ml-3">{t('nav.logout')}</span>}
          </button>
        </div>
      </div>

      {/* 系统状态面板 - 真实检测 */}
      {showStatusPanel && (
        <div className={`absolute top-0 left-0 h-full bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 z-10 w-72 sm:w-80 overflow-y-auto max-w-[85vw] ${isExpanded ? 'lg:left-64' : 'lg:left-24'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">系统状态监控</h2>
            <button onClick={() => setShowStatusPanel(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div className="p-2">
            <div className="rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 theme-link" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                系统状态
              </h3>
              {statusLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-2 theme-spin border-transparent rounded-full"></div></div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(statusData.services || []).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center min-w-0">
                          <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${
                            s.status === 'online' ? 'bg-green-500' : s.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.endpoint}</div>
                            {s.message && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.message}</div>}
                          </div>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${
                          s.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                          s.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        }`}>
                          {s.status === 'online' ? '正常' : s.status === 'warning' ? '警告' : '异常'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                    <p>提示：大模型需在系统设置中配置 API，并开启「联网搜索」；媒体爬虫需设置 MEDIACRAWLER_PATH。</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 顶部导航栏组件（时间、搜索占位符随系统日期/时间格式与语言设置）
function TopNavbar({ onOpenSidebar }) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { formatDateTime } = useDateTimeFormat();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setShowDropdown(true);
    const token = localStorage.getItem('token');
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { companies: [], news: [] })
      .then(d => { setSearchResults(d); setSearching(false); })
      .catch(() => { setSearchResults({ companies: [], news: [] }); setSearching(false); });
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  const formattedTime = formatDateTime(currentTime);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenSidebar && onOpenSidebar()}
          className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="打开菜单"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 max-w-lg relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={handleSearchBlur}
              onFocus={() => searchResults && setShowDropdown(true)}
              placeholder={t('common.searchPlaceholder')}
              className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 theme-ring bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button type="submit" disabled={searching} className="absolute right-2 top-1/2 transform -translate-y-1/2 theme-btn-primary p-1.5 rounded-md disabled:opacity-50">
              {searching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </form>
          {showDropdown && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              {(searchResults.companies?.length || searchResults.news?.length) ? (
                <>
                  {searchResults.companies?.length > 0 && (
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">企业</div>
                      {searchResults.companies.map((c) => (
                        <div key={c.id} onClick={() => { navigate(`/company/${c.id}`); setShowDropdown(false); }} className="px-3 py-2 theme-bg-light-hover rounded cursor-pointer flex justify-between">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${c.risk_level === '高' ? 'bg-red-100' : c.risk_level === '中' ? 'bg-yellow-100' : 'bg-green-100'}`}>{c.risk_level || '-'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.news?.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">资讯</div>
                      {searchResults.news.map((n) => (
                        <div key={n.id} onClick={() => { if (n.company_id) navigate(`/company/${n.company_id}`); setShowDropdown(false); }} className="px-3 py-2 theme-bg-light-hover rounded cursor-pointer">
                          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">{n.title}</div>
                          {n.company_name && <div className="text-xs text-gray-500 dark:text-gray-400">{n.company_name}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{t('common.noResults')}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-6 ml-2 sm:ml-6 flex-shrink-0">
          <span className="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base hidden sm:inline">
            {formattedTime}
          </span>
          <button 
            onClick={() => navigate('/personal-center')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={t('common.personalCenter')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// 快速访问组件
const QuickAccess = () => {
  const navigate = useNavigate();
  
  const quickActions = [
    { 
      name: '添加企业', 
      icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', 
      action: () => navigate('/company-management'),
      color: 'theme-bg-primary'
    },
    { 
      name: '风险警报', 
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z', 
      action: () => navigate('/alerts'),
      color: 'bg-red-500'
    },
    { 
      name: '数据分析', 
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', 
      action: () => navigate('/analytics'),
      color: 'bg-blue-500'
    },
    { 
      name: '个人中心', 
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.573 1.066c-.94 1.543.826 3.31 2.37 2.37a1.724 1.724 0 002.572 1.065c.426 1.756.426 4.19 0 5.937a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 
      action: () => navigate('/personal-center'),
      color: 'bg-green-500'
    }
  ];

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`flex flex-col items-end space-y-3 mb-2 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {quickActions.slice().reverse().map((action, index) => (
          <button
            key={action.name}
            onClick={() => {
              action.action();
              setIsOpen(false);
            }}
            className="flex items-center space-x-2 bg-white shadow-lg rounded-full px-4 py-2 hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            style={{ transitionDelay: isOpen ? `${index * 50}ms` : '0ms' }}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${action.color}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={action.icon}></path>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{action.name}</span>
          </button>
        ))}
      </div>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 theme-gradient-banner rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transform hover:scale-110 transition-all duration-200"
      >
        <svg 
          className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M12 6v6m0 0v6m0-6h6m-6 0H6"}></path>
        </svg>
      </button>
    </div>
  );
};

// 主应用组件
const AppContent = () => {
  const { user, login } = useAuth();
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* 左侧导航栏 - 仅在用户登录时显示；移动端为抽屉 */}
      {user && (
        <Sidebar
          sidebarMobileOpen={sidebarMobileOpen}
          onMobileClose={() => setSidebarMobileOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 顶部导航栏 - 仅在用户登录时显示 */}
        {user && <TopNavbar onOpenSidebar={() => setSidebarMobileOpen(true)} />}

        {/* 主内容区和右侧信息面板 */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className={`flex-1 overflow-y-auto min-h-0 ${user ? 'p-4 sm:p-6' : ''}`}>
            <ErrorBoundary>
            <Routes>
              <Route 
                path="/login" 
                element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />} 
              />
              <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
              <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <MainContent user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route path="/monitoring" element={<Navigate to="/task-status" replace />} />
              <Route 
                path="/alerts" 
                element={
                  <ProtectedRoute>
                    <MainContent user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <MainContent user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/user-dashboard" 
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/personal-center" 
                element={
                  <ProtectedRoute>
                    <PersonalCenter />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/company-management" 
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <CompanyManagement />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/company/:id" 
                element={
                  <ProtectedRoute>
                    <CompanyDetailPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/company-compare" 
                element={
                  <ProtectedRoute>
                    <CompanyCompare />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/task-status" 
                element={
                  <ProtectedRoute>
                    <TaskStatus />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/upload-center" 
                element={
                  <ProtectedRoute>
                    <UploadCenter />
                  </ProtectedRoute>
                } 
              />
              <Route path="/add-company" element={<Navigate to="/company-management" replace />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />
            </Routes>
            </ErrorBoundary>
          </div>
          {/* 右侧面板：支持收起/展开，与左侧边栏一致 */}
          {user && (
            <div className={`flex flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${rightPanelExpanded ? 'w-80' : 'w-14'}`}>
              {rightPanelExpanded ? (
                <>
                  <div className="w-8 flex-shrink-0 flex flex-col items-center py-2 border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <button
                      type="button"
                      onClick={() => setRightPanelExpanded(false)}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                      title="收起右侧面板"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0 overflow-y-auto">
                    <RightPanel />
                  </div>
                </>
              ) : (
                <div className="w-14 h-full flex flex-col items-center py-4">
                  <button
                    type="button"
                    onClick={() => setRightPanelExpanded(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    title="展开右侧面板"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 快速访问按钮 - 仅在用户登录时显示 */}
      {user && <QuickAccess />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;