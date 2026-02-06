import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDateTimeFormat } from './utils/useDateTimeFormat';
import { useTranslation } from './i18n';

const RightPanel = () => {
  const { formatDate, formatDateTime } = useDateTimeFormat();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [newsItems, setNewsItems] = useState([]);
  const [policyNews, setPolicyNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardSummary, setDashboardSummary] = useState({ company_count: 0, news_today: 0, high_risk: 0 });
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [collapsedNews, setCollapsedNews] = useState(false);
  const [collapsedPolicy, setCollapsedPolicy] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [allModalTab, setAllModalTab] = useState('news');
  const [newsModalView, setNewsModalView] = useState('summary');
  const [selectedPolicyItem, setSelectedPolicyItem] = useState(null);

  // 风险速览数据
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {}),
      fetch('/api/dashboard/risk-distribution', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {})
    ]).then(([dash, dist]) => {
      setDashboardSummary({
        company_count: dash.company_count ?? 0,
        news_today: dash.news_today ?? 0,
        high_risk: (dist && dist['高']) ? dist['高'] : 0
      });
    }).catch(() => {});
  }, []);

  // 从API获取数据（进入企业详情页时先清空列表再拉取，新建企业页严格空白）
  useEffect(() => {
    const match = location.pathname.match(/^\/company\/(\d+)$/);
    const companyId = match ? match[1] : null;
    if (companyId) setNewsItems([]);
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          // 添加模拟数据用于演示
          setNewsItems([
            { 
              id: 1, 
              title: '某科技公司因数据泄露面临重大法律风险', 
              time: '2分钟前', 
              category: '法律',
              content: '根据最新报道，某知名科技公司因数据泄露事件面临重大法律风险。该公司未能及时保护用户隐私数据，导致大量敏感信息外泄。目前监管部门已介入调查，可能面临数百万美元的罚款。此事件提醒所有企业在数字化转型过程中必须加强数据安全防护措施。'
            },
            { 
              id: 2, 
              title: '新兴行业监管政策更新，多家企业需调整合规策略', 
              time: '15分钟前', 
              category: '监管',
              content: '新兴行业的监管政策迎来重大更新，多家相关企业需紧急调整合规策略。新政策涵盖了数据处理、消费者保护、反垄断等多个方面。专家建议企业应尽快评估新政策对业务的影响，并制定相应的合规计划。预计未来几个月内，行业将迎来一波合规调整潮。'
            },
            { 
              id: 3, 
              title: '金融行业信用风险指数上升至警戒水平', 
              time: '32分钟前', 
              category: '金融',
              content: '最新发布的金融行业信用风险指数已上升至警戒水平，引发业界关注。受经济环境变化和市场波动影响，多个金融机构的信贷质量出现下滑。分析师指出，银行等金融机构应加强对贷款组合的风险管理，提前做好应对准备。'
            },
            { 
              id: 4, 
              title: '供应链风险评估显示多个关键节点存在隐患', 
              time: '1小时前', 
              category: '运营',
              content: '一项全面的供应链风险评估显示，多个关键节点存在潜在隐患。这些隐患主要包括单一供应商依赖、地理集中度高、应急响应能力不足等问题。专家建议企业应建立多元化的供应网络，提高供应链韧性，并制定详细的应急预案。'
            },
            { 
              id: 5, 
              title: '国际制裁影响扩大，跨境业务企业面临新挑战', 
              time: '2小时前', 
              category: '国际',
              content: '随着国际制裁范围的进一步扩大，从事跨境业务的企业面临新的挑战。受影响的企业需要重新评估其国际业务布局，调整供应链结构，并确保遵守各司法管辖区的法律法规。企业应密切关注政策变化，及时调整战略方向。'
            }
          ]);
          
          setPolicyNews([]);
          setLoading(false);
          return;
        }
        
        // 获取企业资讯：若当前在某个企业详情页则只拉该企业，否则拉全部（添加企业后详情页右侧也应为空）
        const match = location.pathname.match(/^\/company\/(\d+)$/);
        const companyId = match ? match[1] : null;
        const newsUrl = companyId ? `/api/news/rolling?limit=30&company_id=${companyId}` : '/api/news/rolling?limit=30';
        const newsResponse = await fetch(newsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          const sorted = [...(Array.isArray(newsData) ? newsData : [])].sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
          });
          setNewsItems(sorted);
        } else {
          console.error('Failed to fetch news:', newsResponse.status);
          // 添加模拟数据作为备用
          setNewsItems([
            { 
              id: 1, 
              title: '某科技公司因数据泄露面临重大法律风险', 
              time: '2分钟前', 
              category: '法律',
              content: '根据最新报道，某知名科技公司因数据泄露事件面临重大法律风险。该公司未能及时保护用户隐私数据，导致大量敏感信息外泄。目前监管部门已介入调查，可能面临数百万美元的罚款。此事件提醒所有企业在数字化转型过程中必须加强数据安全防护措施。'
            },
            { 
              id: 2, 
              title: '新兴行业监管政策更新，多家企业需调整合规策略', 
              time: '15分钟前', 
              category: '监管',
              content: '新兴行业的监管政策迎来重大更新，多家相关企业需紧急调整合规策略。新政策涵盖了数据处理、消费者保护、反垄断等多个方面。专家建议企业应尽快评估新政策对业务的影响，并制定相应的合规计划。预计未来几个月内，行业将迎来一波合规调整潮。'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // 添加模拟数据作为备用
        setNewsItems([
          { 
            id: 1, 
            title: '某科技公司因数据泄露面临重大法律风险', 
            time: '2分钟前', 
            category: '法律',
            content: '根据最新报道，某知名科技公司因数据泄露事件面临重大法律风险。该公司未能及时保护用户隐私数据，导致大量敏感信息外泄。目前监管部门已介入调查，可能面临数百万美元的罚款。此事件提醒所有企业在数字化转型过程中必须加强数据安全防护措施。'
          }
        ]);
        
        setPolicyNews([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [location.pathname]);

  const fetchPolicyNews = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const r = await fetch('/api/macro-policy-news', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const list = await r.json();
        setPolicyNews(Array.isArray(list) ? list : []);
      }
    } catch {
      setPolicyNews([]);
    }
  };

  useEffect(() => {
    fetchPolicyNews();
    const t = setInterval(fetchPolicyNews, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // 处理新闻项目点击
  const handleNewsItemClick = (newsItem) => {
    setSelectedNews(newsItem);
    setNewsModalView('summary');
    setShowNewsModal(true);
  };
  const openNewsDetailView = () => setNewsModalView('detail');
  const closeAllModalAndOpenNews = (newsItem) => {
    setShowAllModal(false);
    handleNewsItemClick(newsItem);
  };
  return (
    <div className="p-4 space-y-5 max-w-full overflow-hidden" style={{ writingMode: 'horizontal-tb', textAlign: 'left' }}>
      {/* {t('panel.latestNews')}弹窗 */}
      {showNewsModal && selectedNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{newsModalView === 'detail' ? t('news.detail') : t('news.summary')}</h3>
              <button 
                onClick={() => { setShowNewsModal(false); setNewsModalView('summary'); }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {newsModalView === 'detail' ? (
              <>
                <button onClick={() => setNewsModalView('summary')} className="text-sm theme-link hover:underline mb-4">← {t('news.backSummary')}</button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{selectedNews.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {selectedNews.company_name && (
                    <span className="px-2 py-1 theme-bg-light theme-link rounded">{selectedNews.company_name}</span>
                  )}
                  <span>{selectedNews.created_at ? formatDateTime(selectedNews.created_at) : selectedNews.time}</span>
                  {selectedNews.category && <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{selectedNews.category}</span>}
                  {selectedNews.risk_level && (
                    <span className={`px-2 py-1 text-xs rounded ${selectedNews.risk_level === '高' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : selectedNews.risk_level === '中' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                      {selectedNews.risk_level}风险
                    </span>
                  )}
                </div>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-6">
                  {selectedNews.content || '暂无详细内容'}
                </div>
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {selectedNews.company_id && (
                    <button onClick={() => { navigate(`/company/${selectedNews.company_id}`); setShowNewsModal(false); }} className="inline-flex items-center gap-2 px-4 py-2 theme-btn-primary rounded-lg text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {t('news.viewCompany')}
                    </button>
                  )}
                  {selectedNews.source_url && (
                    <a href={selectedNews.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      {t('news.viewSource')}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{selectedNews.title}</h4>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {selectedNews.company_name && (
                    <span className="px-2 py-1 theme-bg-light theme-link rounded">{selectedNews.company_name}</span>
                  )}
                  <span>{selectedNews.created_at ? formatDateTime(selectedNews.created_at) : selectedNews.time}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${selectedNews.category === '法律' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : selectedNews.category === '监管' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : selectedNews.category === '金融' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : selectedNews.category === '运营' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : selectedNews.category === '国际' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : selectedNews.category === '环保' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {selectedNews.category || '其他'}
                  </span>
                  {selectedNews.risk_level && (
                    <span className={`px-2 py-1 text-xs rounded ${selectedNews.risk_level === '高' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : selectedNews.risk_level === '中' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                      {selectedNews.risk_level}风险
                    </span>
                  )}
                </div>
                <div className="prose prose-sm text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap leading-relaxed line-clamp-6">
                  {selectedNews.content || '暂无详细内容'}
                </div>
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button onClick={openNewsDetailView} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    {t('news.viewDetail')}
                  </button>
                  {selectedNews.company_id && (
                    <button onClick={() => { navigate(`/company/${selectedNews.company_id}`); setShowNewsModal(false); }} className="inline-flex items-center gap-2 px-4 py-2 theme-btn-primary rounded-lg text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {t('news.viewCompany')}
                    </button>
                  )}
                  {selectedNews.source_url && (
                    <a href={selectedNews.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      {t('news.viewSource')}
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 宏观政策摘要弹窗 */}
      {showPolicyModal && selectedPolicyItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('policy.title')}</h3>
              <button 
                onClick={() => { setShowPolicyModal(false); setSelectedPolicyItem(null); }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{selectedPolicyItem.title}</h4>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              {selectedPolicyItem.dimension && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{selectedPolicyItem.dimension}</span>
              )}
              {selectedPolicyItem.source && <span>{selectedPolicyItem.source}</span>}
              {selectedPolicyItem.created_at && <span>{t('policy.updatedAt')} {formatDateTime(selectedPolicyItem.created_at)}</span>}
            </div>
            <div className="prose prose-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedPolicyItem.content || '暂无内容'}</div>
          </div>
        </div>
      )}

      {/* 居中弹窗：全部{t('panel.latestNews')} / 市场风险洞察 */}
      {showAllModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                <button
                  onClick={() => setAllModalTab('news')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${allModalTab === 'news' ? 'bg-white dark:bg-gray-600 theme-link shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  {t('panel.latestNews')}
                </button>
                <button
                  onClick={() => setAllModalTab('policy')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${allModalTab === 'policy' ? 'bg-white dark:bg-gray-600 theme-link shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  {t('panel.policy')}
                </button>
              </div>
              <button onClick={() => setShowAllModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {allModalTab === 'news' ? (
                <div className="space-y-3">
                  {newsItems.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('panel.noNews')}</p>
                  ) : (
                    newsItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => closeAllModalAndOpenNews(item)}
                        className="border-l-4 pl-4 py-3 pr-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors rounded-r-lg theme-border-l"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-gray-800 dark:text-gray-100 text-sm leading-tight flex-1 min-w-0">{item.title}</h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.created_at ? formatDateTime(item.created_at) : item.time}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {item.company_name && <span className="text-xs theme-link font-medium">[{item.company_name}]</span>}
                          {item.category && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{item.category}</span>}
                          {item.risk_level && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600">{item.risk_level}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {policyNews.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('panel.noPolicy')}，{t('panel.noPolicyHint')}</p>
                  ) : (
                    policyNews.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => { setShowAllModal(false); setSelectedPolicyItem(item); setShowPolicyModal(true); }}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <h4 className="font-medium text-gray-800 dark:text-gray-100 text-sm mb-1">{item.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {item.dimension && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{item.dimension}</span>}
                          {item.created_at && <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(item.created_at)}</span>}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-4 whitespace-pre-wrap">{item.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 风险速览 - 最上方 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-3">{t('panel.riskOverview')}</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="text-lg font-bold theme-link">{dashboardSummary.company_count}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('panel.monitored')}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{dashboardSummary.news_today}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('panel.todayNews')}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">{dashboardSummary.high_risk}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('panel.highRisk')}</div>
          </div>
        </div>
      </div>

      {/* 最新企业资讯 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{t('panel.latestNews')}</h3>
          <button 
            onClick={() => setCollapsedNews(!collapsedNews)}
            className="flex-shrink-0 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
          >
            <svg 
              className={`h-4 w-4 transition-transform ${collapsedNews ? '' : 'rotate-180'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {!collapsedNews && (
          <>
            {loading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 theme-spin mx-auto border-transparent"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-72 overflow-y-auto overflow-x-hidden">
                  {newsItems.slice(0, 4).map((item) => (
                    <div 
                      key={item.id} 
                      className="border-l-2 pl-3 py-2.5 pr-2 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors theme-border-l"
                      onClick={() => handleNewsItemClick(item)}
                    >
                      {/* 第一行：仅标题，占满整行 */}
                      <h4 className="font-medium text-gray-800 dark:text-gray-100 text-sm leading-snug text-left break-words" style={{ wordBreak: 'break-word' }}>
                        {item.title}
                      </h4>
                      {/* 第二行：左侧公司名+分类+风险，右侧仅日期（年月日） */}
                      <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {item.company_name && (
                            <span className="theme-link font-medium shrink-0">[{item.company_name}]</span>
                          )}
                          {item.category && (
                            <span className={`inline-block px-1.5 py-0.5 rounded-full shrink-0 ${
                              item.category === '法律' ? 'theme-bg-light theme-link text-gray-700 dark:text-gray-300' : 
                              item.category === '监管' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 
                              item.category === '金融' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
                              item.category === '运营' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 
                              item.category === '国际' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 
                              item.category === '环保' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 
                              'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {item.category || '其他'}
                            </span>
                          )}
                          {item.risk_level && (
                            <span className={`px-1.5 py-0.5 rounded shrink-0 ${item.risk_level === '高' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : item.risk_level === '中' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                              {item.risk_level}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                          {item.created_at ? formatDate(item.created_at) : (item.time || '—')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  className="w-full mt-4 py-2 text-center text-sm theme-link font-medium border border-dashed rounded-lg theme-bg-light-hover transition-colors theme-border-selected"
                  onClick={() => { setAllModalTab('news'); setShowAllModal(true); }}
                >
                  {t('panel.viewAll')}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* 最新政策与市场环境：自动定时更新，每条单独展示 - 最下方 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{t('panel.policy')}</h3>
          <button 
            onClick={() => setCollapsedPolicy(!collapsedPolicy)}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
          >
            <svg 
              className={`h-4 w-4 transition-transform ${collapsedPolicy ? '' : 'rotate-180'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {!collapsedPolicy && (
          <>
            {policyNews.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                <p>{t('panel.noPolicy')}</p>
                <p className="mt-1">{t('panel.noPolicyHint')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {policyNews.slice(0, 5).map((item) => (
                    <div 
                      key={item.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedPolicyItem(item); setShowPolicyModal(true); }}
                    >
                      <h4 className="font-medium text-gray-800 dark:text-gray-100 text-sm mb-1 line-clamp-2">{item.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {item.dimension && <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{item.dimension}</span>}
                        {item.created_at && <span>{formatDateTime(item.created_at)}</span>}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1 whitespace-pre-wrap break-words text-left">{item.content}</p>
                    </div>
                  ))}
                </div>
                <button 
                  className="w-full mt-4 py-2 text-center text-sm theme-link font-medium border border-dashed rounded-lg theme-bg-light-hover transition-colors theme-border-selected"
                  onClick={() => { setAllModalTab('policy'); setShowAllModal(true); }}
                >
                  {t('panel.viewAll')}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RightPanel;