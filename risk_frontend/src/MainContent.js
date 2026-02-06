import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { getTheme } from './themePresets';
import { useDateTimeFormat } from './utils/useDateTimeFormat';
import { useTranslation } from './i18n';

// 根据数值占比返回柱状图颜色：低→绿、中→黄、高→红（与背景对比明显）
function getBarColorByValue(count, max) {
  if (!max || max === 0) return '#94a3b8';
  const ratio = count / max;
  if (ratio <= 1 / 3) return '#22c55e';
  if (ratio <= 2 / 3) return '#eab308';
  return '#dc2626';
}

// 横轴日期短格式：2025-02-01 -> 2/1；无 date 时用 label（一二…日）
function formatAxisDate(item) {
  if (!item || !item.date) return item?.label || '';
  const s = String(item.date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [, m, d] = s.split('-');
    return `${Number(m)}/${Number(d)}`;
  }
  return s;
}

function BannerTrendChart({ data }) {
  const maxCount = Math.max(1, ...(data || []).map((d) => d.count || 0));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 20 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(_, i) => formatAxisDate(data[i])}
          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.85)' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
          tickLine={{ stroke: 'rgba(255,255,255,0.4)' }}
        />
        <YAxis hide domain={[0, maxCount <= 0 ? 'auto' : Math.max(1, Math.ceil(maxCount * 1.1))]} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.75)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
          }}
          formatter={(v) => [v, '条']}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
        />
        <Bar dataKey="count" name="资讯数" radius={[4, 4, 0, 0]} barSize={24}>
          {(data || []).map((entry, i) => (
            <Cell key={i} fill={getBarColorByValue(entry.count || 0, maxCount)} />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="count"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'rgba(255,255,255,0.95)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#fff', stroke: 'rgba(255,255,255,0.6)', strokeWidth: 2 }}
          isAnimationActive
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const MainContent = ({ user }) => {
  const auth = useAuth();
  const { settings } = useSettings();
  const theme = getTheme(settings.themeColor);
  const { formatDate } = useDateTimeFormat();
  const { t } = useTranslation();
  const effectiveUser = user || auth.user;
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [trend, setTrend] = useState([]);
  const [riskDistribution, setRiskDistribution] = useState({ 低: 0, 中: 0, 高: 0, 未知: 0 });
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [riskIndicators, setRiskIndicators] = useState([]);
  const [riskCardMenu, setRiskCardMenu] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // 根据当前路径设置选中的标签
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/dashboard')) {
      setSelectedTab('dashboard');
    } else if (path.startsWith('/monitoring')) {
      setSelectedTab('monitoring');
    } else if (path.startsWith('/alerts')) {
      setSelectedTab('alerts');
    } else if (path.startsWith('/analytics')) {
      setSelectedTab('analytics');
    } else if (path.startsWith('/settings')) {
      setSelectedTab('settings');
    } else if (path.startsWith('/company')) {
      setSelectedTab('company-detail');
    }
  }, [location]);

  const loadData = React.useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const [dRes, cRes, tRes, rRes, riskDistRes, catDistRes, alertsRes] = await Promise.all([
        fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/companies', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/trend', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/risk-indicators', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/risk-distribution', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/category-distribution', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/alerts', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (dRes.ok) setDashboard(await dRes.json());
      if (cRes.ok) {
        const data = await cRes.json();
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setCompanies(list);
      }
      if (tRes.ok) { const t = await tRes.json(); setTrend(t.trend || []); }
      if (rRes.ok) setRiskIndicators(await rRes.json());
      if (riskDistRes.ok) setRiskDistribution(await riskDistRes.json());
      if (catDistRes.ok) { const c = await catDistRes.json(); setCategoryDistribution(Array.isArray(c) ? c : []); }
      if (alertsRes.ok) { const a = await alertsRes.json(); setAlerts(Array.isArray(a) ? a : []); }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 60000);
    return () => clearInterval(t);
  }, [loadData]);

  useEffect(() => {
    if (location.pathname.startsWith('/monitoring') || location.pathname === '/') {
      loadData();
    }
  }, [location.pathname, loadData]);

  const levelValue = { '低': 25, '中': 55, '高': 85 };
  const icons = ['📊', '⚖️', '📰', '⚠️'];
  const riskCards = riskIndicators.length > 0
    ? riskIndicators.slice(0, 4).map((r, i) => ({ id: r.id, title: r.name, progress: r.level + '风险', icon: icons[i] || '📋', value: levelValue[r.level] || 50, change: r.change }))
    : [];

  // 图表用：企业风险分布（语义色：高/中/低/未知，与主题协调）
  const riskDistTotal = (riskDistribution['高'] || 0) + (riskDistribution['中'] || 0) + (riskDistribution['低'] || 0) + (riskDistribution['未知'] || 0);
  const riskDistChartData = [
    { name: '高', value: riskDistribution['高'] || 0, color: '#dc2626' },
    { name: '中', value: riskDistribution['中'] || 0, color: '#d97706' },
    { name: '低', value: riskDistribution['低'] || 0, color: '#059669' },
    { name: '未知', value: riskDistribution['未知'] || 0, color: '#64748b' },
  ].filter(d => d.value > 0);

  // 图表通用：Tooltip 样式（圆角、阴影、与深色模式兼容）
  const chartTooltipStyle = {
    backgroundColor: 'var(--chart-tooltip-bg, #fff)',
    border: '1px solid var(--chart-tooltip-border, #e5e7eb)',
    borderRadius: '10px',
    padding: '12px 16px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    fontSize: '13px',
  };

  // 预设资讯分类（与后端 LLM 约定一致），固定顺序与颜色
  const PRESET_CATEGORIES = ['法律', '财务', '经营', '舆情', '其他'];
  const categoryCountMap = {};
  categoryDistribution.forEach((item) => {
    const name = item.category && PRESET_CATEGORIES.includes(item.category) ? item.category : '其他';
    categoryCountMap[name] = (categoryCountMap[name] || 0) + (item.count ?? 0);
  });
  const categoryDistTotal = PRESET_CATEGORIES.reduce((s, c) => s + (categoryCountMap[c] || 0), 0);
  // 资讯分类分布饼图数据：仅含数量>0 的分类，颜色与右侧图例一一对应
  const categoryChartData = PRESET_CATEGORIES.map((name, i) => ({
    name,
    value: categoryCountMap[name] || 0,
    color: theme.chartColors[i % theme.chartColors.length],
  })).filter(d => d.value > 0);

  // 风险指标柱状图数据（用于数据分析页）
  const riskIndicatorBarData = riskIndicators.slice(0, 8).map(r => ({
    name: r.name,
    数量: levelValue[r.level] ?? 50,
    等级: r.level,
  }));

  const pendingCompanies = companies.length ? companies.slice(0, 6).map(c => {
    const infoDone = (c.crawl_status === 'crawled' || (c.llm_status || '') === 'success');
    const newsStatus = c.news_status || 'pending';
    const ms = c.media_status || 'pending';
    let status = infoDone ? '信息搜集完成' : (c.llm_status === 'running' ? '采集中' : '待搜集');
    if (infoDone) {
      if (newsStatus === 'success') status += ' · 相关新闻已就绪';
      else if (newsStatus === 'running') status += ' · 相关新闻采集中';
      else if (newsStatus === 'error') status += ' · 相关新闻异常';
      if (ms === 'success') status += ' · 社会评价正常';
      else if (ms === 'error') status += ' · 爬虫异常';
      else if (ms === 'running') status += ' · 社会评价采集中';
    }
    return {
      id: c.id,
      name: c.name,
      lastUpdated: c.last_updated ? formatDate(c.last_updated) : '-',
      status,
      tag: c.risk_level || '未知',
      llm_status: c.llm_status || 'pending',
      news_status: c.news_status || 'pending',
      media_status: c.media_status || 'pending',
      is_favorite: !!c.is_favorite
    };
  }) : [];

  const myCompanies = companies.length ? companies.slice(0, 6).map(c => ({
    id: c.id,
    name: c.name,
    owner: c.industry || '-',
    tag: c.risk_level || '未知'
  })) : [];

  const handleViewCompany = (companyId) => {
    navigate(`/company/${companyId}`);
  };

  const handleToggleFavorite = async (companyId, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${companyId}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await res.json();
      if (res.ok) loadData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col" style={{ gap: 'var(--density-spacing, 1rem)' }}>
      {selectedTab === 'dashboard' && (
        <>
          {/* 顶部横幅：使用主题渐变 */}
          <div className="theme-gradient-banner rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">企业风险总览</h1>
                <p className="theme-text-banner-muted mb-4">实时监控企业风险，智能预警潜在威胁</p>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>欢迎回来，{effectiveUser?.username || '用户'}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>监控企业 {dashboard?.company_count ?? companies?.length ?? 0} 家</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>今日资讯 {dashboard?.news_today ?? 0} 条</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="text-right">
                  <div className="text-2xl font-bold">{dashboard?.company_count ?? 0}家</div>
                  <div className="theme-text-banner-sub text-sm">今日新增资讯 {dashboard?.news_today ?? 0} 条</div>
                </div>
              </div>
            </div>
            
            {/* 近7天资讯趋势：柱状图（数值+随值变色）+ 折线图（趋势），横轴日期 */}
            <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-sm font-medium theme-text-banner-muted mb-3">近7天资讯趋势</div>
              <div className="h-28">
                <BannerTrendChart
                  data={trend.length > 0 ? trend : [
                    { date: '', count: 0, label: '一' }, { date: '', count: 0, label: '二' }, { date: '', count: 0, label: '三' },
                    { date: '', count: 0, label: '四' }, { date: '', count: 0, label: '五' }, { date: '', count: 0, label: '六' }, { date: '', count: 0, label: '日' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* 风险分布 & 资讯分类分布（真实数据图表） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">企业风险分布</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">统计自 {riskDistTotal} 家企业</p>
              {riskDistTotal > 0 ? (
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:w-1/2 h-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          stroke="var(--chart-pie-stroke, #fff)"
                          strokeWidth={2}
                        >
                          {riskDistChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [v, '家']} contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 space-y-2 min-w-0">
                    {['高', '中', '低', '未知'].map((level) => {
                      const n = riskDistribution[level] ?? 0;
                      const total = riskDistTotal || 1;
                      const pct = Math.round((n / total) * 100);
                      const barColor = level === '高' ? '#dc2626' : level === '中' ? '#d97706' : level === '低' ? '#059669' : '#64748b';
                      return (
                        <div key={level} className="flex items-center gap-2 min-w-0">
                          <span className="w-10 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">{level}</span>
                          <div className="flex-1 min-w-0 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, minWidth: n ? '4px' : 0, backgroundColor: barColor }} />
                          </div>
                          <span className="text-sm text-gray-500 shrink-0 w-14 text-right">{n} 家</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 py-8 text-center">暂无企业数据，请先添加企业</p>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">资讯分类分布</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">统计自企业相关新闻（company_news）</p>
              {categoryDistTotal > 0 ? (
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:w-1/2 h-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          stroke="var(--chart-pie-stroke, #fff)"
                          strokeWidth={2}
                        >
                          {categoryChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [v, '条']} contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 space-y-2 min-w-0 flex-shrink">
                    {PRESET_CATEGORIES.map((name) => {
                      const n = categoryCountMap[name] ?? 0;
                      const total = categoryDistTotal || 1;
                      const pct = Math.round((n / total) * 100);
                      const barColor = theme.chartColors[PRESET_CATEGORIES.indexOf(name) % theme.chartColors.length];
                      return (
                        <div key={name} className="flex items-center gap-2 min-w-0">
                          <span className="w-12 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
                          <div className="flex-1 min-w-0 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, minWidth: n ? '4px' : 0, backgroundColor: barColor }} />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-14 text-right">{n} 条</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 py-8 text-center">暂无资讯分类数据，请先为企业执行「大模型搜索相关新闻」</p>
              )}
            </div>
          </div>

          {/* 风险指标总览（基于近30天企业相关新闻分类与风险等级聚合） */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">风险指标总览</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">由企业相关新闻的分类与风险等级自动量化</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {riskCards.length === 0 ? (
                <div className="col-span-full md:col-span-2 lg:col-span-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-gray-500 dark:text-gray-400">暂无风险指标数据</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">请先添加企业并完成「大模型搜索相关新闻」，系统将根据新闻分类与风险等级自动生成指标</p>
                </div>
              ) : riskCards.map(card => (
                <div key={card.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-default">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg">{card.icon}</div>
                    <div className="relative">
                      <button onClick={() => setRiskCardMenu(riskCardMenu === card.id ? null : card.id)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 p-1 rounded">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {riskCardMenu === card.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setRiskCardMenu(null)} />
                        <div className="absolute right-0 top-6 z-20 mt-1 w-36 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1">
                          <button onClick={() => { navigate('/analytics'); setRiskCardMenu(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">查看详情</button>
                          <button onClick={() => { loadData(); setRiskCardMenu(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">刷新数据</button>
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{card.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.progress}</p>
                  {card.change && <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">变化 {card.change}</p>}
                  {!card.change && <div className="mb-3" />}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        card.value < 30 ? 'bg-green-500' : 
                        card.value < 60 ? 'bg-yellow-500' : 
                        card.value < 80 ? 'bg-orange-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${card.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 待处理企业 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">待处理企业</h2>
              {pendingCompanies.length > 0 && (
                <button 
                  onClick={() => navigate('/alerts')}
                  className="theme-link font-medium cursor-pointer"
                >
                  查看全部
                </button>
              )}
            </div>
            {pendingCompanies.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl py-12 px-4 text-center border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-2">暂无待处理企业</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">请先在<button type="button" onClick={() => navigate('/company-management')} className="theme-link cursor-pointer mx-1">企业管理</button>中添加企业</p>
              </div>
            ) : (
            <div className="flex space-x-4 overflow-x-auto pb-4 -mx-2 px-2">
              {pendingCompanies.map(company => (
                <div key={company.id} className="flex-shrink-0 w-72 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="relative">
                    <div className="w-full h-40 theme-bg-light flex flex-col items-center justify-center gap-2">
                      <span className="text-gray-600 dark:text-gray-300 text-sm truncate max-w-full px-2">{company.name}</span>
                      {/* 状态指示灯：工商信息 → 相关新闻 → 社会评价 */}
                      <div className="flex items-center gap-1.5" title="工商信息 → 相关新闻 → 社会评价">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${company.llm_status === 'running' ? 'bg-blue-500 animate-pulse' : company.llm_status === 'success' ? 'bg-green-500' : company.llm_status === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${(company.news_status || 'pending') === 'running' ? 'bg-blue-500 animate-pulse' : (company.news_status || 'pending') === 'success' ? 'bg-green-500' : (company.news_status || 'pending') === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${company.media_status === 'running' ? 'bg-blue-500 animate-pulse' : company.media_status === 'success' ? 'bg-green-500' : company.media_status === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      </div>
                    </div>
                    <button onClick={(e) => handleToggleFavorite(company.id, e)} className="absolute top-3 right-3 bg-white dark:bg-gray-700 rounded-full p-1.5 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600">
                      <svg className={`h-5 w-5 ${company.is_favorite ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-400'}`} fill={company.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {company.lastUpdated}
                    </div>
                  </div>
                  <div className="p-4">
                    <span className={`inline-block text-xs px-2 py-1 rounded mb-2 ${
                      company.tag.includes('重点') ? 'theme-bg-light theme-link' :
                      company.tag.includes('法律') ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{company.tag}</span>
                    <h3 className="font-semibold text-gray-800 mb-1">{company.name}</h3>
                    <p className="text-sm text-gray-500">状态: {company.status}</p>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* 我的企业 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">我的企业</h2>
              {myCompanies.length > 0 && (
                <button 
                  onClick={() => navigate('/monitoring')}
                  className="theme-link font-medium cursor-pointer"
                >
                  查看全部
                </button>
              )}
            </div>
            {myCompanies.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl py-12 px-4 text-center border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-2">暂无企业</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">请先在<button type="button" onClick={() => navigate('/company-management')} className="theme-link cursor-pointer mx-1">企业管理</button>中添加企业</p>
              </div>
            ) : (
            <div className="space-y-4">
              {myCompanies.map(company => (
                <div key={company.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center">
                  <div className="w-10 h-10 rounded-full mr-4 theme-gradient-banner flex items-center justify-center">
                    <span className="text-xs font-medium text-white">{company.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className={`inline-block text-xs px-2 py-1 rounded mr-3 ${
                        company.tag.includes('重点') ? 'theme-bg-light theme-link' :
                        company.tag.includes('法律') ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{company.tag}</span>
                      <p className="text-sm text-gray-500">{company.owner}</p>
                    </div>
                    <h3 className="font-semibold text-gray-800 mt-1">{company.name}</h3>
                  </div>
                  <button 
                    onClick={() => handleViewCompany(company.id)}
                    className="theme-link cursor-pointer"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            )}
          </div>
        </>
      )}

      {selectedTab === 'monitoring' && (
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">企业监控</h1>
            <p className="text-gray-600 mt-2">实时监控您关注的企业，及时发现风险</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">监控企业列表</h2>
              <button 
                onClick={() => navigate('/company-management')}
                className="theme-btn-primary px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                添加企业
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">企业名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最新风险评分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">监控状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后更新</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {companies.length > 0 ? companies.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1" title="工商信息 → 相关新闻 → 社会评价">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(c.llm_status || 'pending') === 'running' ? 'bg-blue-500 animate-pulse' : (c.llm_status || 'pending') === 'success' ? 'bg-green-500' : (c.llm_status || 'pending') === 'error' ? 'bg-red-500' : 'bg-gray-300'}`} />
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(c.news_status || 'pending') === 'running' ? 'bg-blue-500 animate-pulse' : (c.news_status || 'pending') === 'success' ? 'bg-green-500' : (c.news_status || 'pending') === 'error' ? 'bg-red-500' : 'bg-gray-300'}`} />
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(c.media_status || 'pending') === 'running' ? 'bg-blue-500 animate-pulse' : (c.media_status || 'pending') === 'success' ? 'bg-green-500' : (c.media_status || 'pending') === 'error' ? 'bg-red-500' : 'bg-gray-300'}`} />
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-200">{c.risk_level || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const newsStatus = c.news_status || 'pending';
                          const ms = c.media_status || 'pending';
                          const infoDone = (c.crawl_status === 'crawled' || (c.llm_status || '') === 'success');
                          let label = infoDone ? '信息搜集完成' : (c.llm_status === 'running' ? '采集中' : '待搜集');
                          if (infoDone) {
                            if ((newsStatus || 'pending') === 'success') label += ' · 相关新闻就绪';
                            else if (newsStatus === 'running') label += ' · 相关新闻采集中';
                            else if (newsStatus === 'error') label += ' · 相关新闻异常';
                            if (ms === 'success') label += ' · 社会评价正常';
                            else if (ms === 'error') label += ' · 爬虫异常';
                            else if (ms === 'running') label += ' · 社会评价采集中';
                          }
                          const isError = ms === 'error' || (c.llm_status || '') === 'error' || newsStatus === 'error';
                          const isSuccess = infoDone && ms === 'success';
                          const style = isError ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : isSuccess ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : infoDone ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                          return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>{label}</span>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {c.last_updated ? formatDate(c.last_updated) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => navigate(`/company/${c.id}`)} className="theme-link cursor-pointer">
                          查看详情
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        暂无企业，请点击「添加企业」添加
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'alerts' && (
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">风险警报</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">实时接收企业风险警报，快速响应威胁</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alerts.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">暂无风险警报</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">当企业风险等级升高或出现高风险相关新闻时，系统将自动在此展示警报</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isHigh = (alert.severity || alert.alert_type || '').toString().includes('高') || (alert.severity || '') === 'high';
                const isMid = (alert.severity || alert.alert_type || '').toString().includes('中') || (alert.severity || '') === 'medium';
                const iconBg = isHigh ? 'bg-red-100 dark:bg-red-900/30' : isMid ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-blue-100 dark:bg-blue-900/30';
                const iconColor = isHigh ? 'text-red-600 dark:text-red-400' : isMid ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400';
                const title = isHigh ? '高风险警报' : isMid ? '中风险警报' : '信息提示';
                const timeStr = alert.timestamp ? (() => { const d = new Date(alert.timestamp); const n = Date.now() - d.getTime(); if (n < 3600000) return `${Math.floor(n/60000)}${t('alerts.relativeTime')}`; if (n < 86400000) return `${Math.floor(n/3600000)}${t('alerts.hoursAgo')}`; return formatDate(d); })() : '—';
                return (
                  <div key={alert.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
                    <div className="flex items-center mb-4">
                      <div className={`${iconBg} p-2 rounded-lg mr-4`}>
                        <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{alert.description || `${alert.company_name || '企业'} - ${alert.alert_type || alert.severity || '风险'}`}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{timeStr}</span>
                      {alert.company_id && (
                        <button onClick={() => handleViewCompany(alert.company_id)} className="theme-link text-sm font-medium cursor-pointer">
                          {isHigh || isMid ? '处理警报' : '查看详情'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedTab === 'analytics' && (
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">数据分析</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">基于企业、相关新闻与风险指标的真实数据量化展示</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">企业风险分布</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">按企业 risk_level 统计，共 {riskDistTotal} 家</p>
              {riskDistChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        stroke="var(--chart-pie-stroke, #fff)"
                        strokeWidth={2}
                        label={({ name, value }) => `${name}: ${value}家`}
                        labelLine={{ stroke: 'var(--chart-label-line, #94a3b8)', strokeWidth: 1 }}
                      >
                        {riskDistChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, '家']} contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400">暂无企业数据，请先添加企业</p>
                </div>
              )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">资讯分类分布</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">企业相关新闻 category 聚合</p>
              {categoryChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        stroke="var(--chart-pie-stroke, #fff)"
                        strokeWidth={2}
                        label={({ name, value }) => `${name} ${value}条`}
                        labelLine={{ stroke: 'var(--chart-label-line, #94a3b8)', strokeWidth: 1 }}
                      >
                        {categoryChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, '条']} contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400">暂无资讯数据，请先执行「大模型搜索相关新闻」</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">近7天资讯趋势</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">每日新增企业相关新闻数量</p>
              {(trend.length > 0 && trend.some(t => (t.count || 0) > 0)) ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" className="opacity-60" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--chart-tick, #6b7280)' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--chart-tick, #6b7280)' }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [v, '条']} labelFormatter={(_, p) => p?.[0]?.payload?.date || ''} contentStyle={chartTooltipStyle} />
                      <Line type="monotone" dataKey="count" name="资讯数" stroke={theme.lineChartStroke} strokeWidth={2} dot={{ r: 4, fill: theme.lineChartStroke }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400">暂无近7天资讯数据</p>
                </div>
              )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">风险指标量化</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">近30天新闻按分类与风险等级聚合（数值对应低/中/高）</p>
              {riskIndicatorBarData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskIndicatorBarData} layout="vertical" margin={{ top: 8, right: 24, left: 60, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" className="opacity-60" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--chart-tick, #6b7280)' }} />
                      <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }} />
                      <Tooltip formatter={(v) => [v, '风险值']} contentStyle={chartTooltipStyle} />
                      <Bar dataKey="数量" name="风险值" radius={[0, 4, 4, 0]}>
                        {riskIndicatorBarData.map((_, i) => (
                          <Cell key={i} fill={theme.chartColors[i % theme.chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400">暂无风险指标数据</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">风险指标进度（与首页一致）</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">由企业相关新闻分类与风险等级自动生成</p>
            <div className="max-w-2xl space-y-4">
              {riskCards.length > 0 ? riskCards.map(card => (
                <div key={card.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{card.title}</span>
                    <span className="text-gray-500 dark:text-gray-400">{card.progress} {card.change ? `· 变化 ${card.change}` : ''}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${card.value < 30 ? 'bg-green-500' : card.value < 60 ? 'bg-yellow-500' : card.value < 80 ? 'bg-orange-500' : 'bg-red-500'}`}
                      style={{ width: `${card.value}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 dark:text-gray-400">暂无风险指标数据，请先添加企业并完成相关新闻搜索</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'settings' && (
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">系统设置</h1>
            <p className="text-gray-600 mt-2">配置您的系统偏好和通知选项</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">用户设置</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring focus:border-transparent"
                  defaultValue={user?.username || ''}
                  placeholder="输入您的姓名"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring focus:border-transparent"
                  defaultValue={user?.email || ''}
                  placeholder="输入您的邮箱"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">警报阈值</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring focus:border-transparent">
                  <option>高风险 (80分以上)</option>
                  <option>中高风险 (60分以上)</option>
                  <option>中风险 (40分以上)</option>
                </select>
              </div>
              
              <div className="pt-4">
                <button className="theme-btn-primary px-6 py-2 rounded-lg transition-colors cursor-pointer">
                  保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainContent;