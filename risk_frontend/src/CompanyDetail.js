import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';
import { useDateTimeFormat } from './utils/useDateTimeFormat';

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatDate, formatDateTime } = useDateTimeFormat();
  const idRef = useRef(id);
  idRef.current = id;
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newsSearching, setNewsSearching] = useState(false);
  const [companyNews, setCompanyNews] = useState([]);
  const [newsLoadedForId, setNewsLoadedForId] = useState(null);
  const [selectedCompanyNews, setSelectedCompanyNews] = useState(null);
  const [showCompanyNewsModal, setShowCompanyNewsModal] = useState(false);
  const [companyNewsModalView, setCompanyNewsModalView] = useState('summary');
  const [supplements, setSupplements] = useState([]);
  const [supplementText, setSupplementText] = useState('');
  const [supplementSending, setSupplementSending] = useState(false);
  const [supplementPanelOpen, setSupplementPanelOpen] = useState(true);
  const [listening, setListening] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);

  const fetchCompanyNews = useCallback(async () => {
    const currentId = id;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/news/rolling?limit=50&company_id=${currentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (String(currentId) === id) {
          setCompanyNews(Array.isArray(data) ? data : []);
          setNewsLoadedForId(currentId);
        }
      }
    } catch (e) {
      console.error(e);
      if (String(currentId) === id) setNewsLoadedForId(currentId);
    }
  }, [id]);

  const handleNewsSearch = async () => {
    setNewsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${id}/news-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCompanyNews();
        await fetchCompanyDetails(false);
        toast.success(data.message || '搜索完成');
      } else {
        toast.error(data.message || '搜索失败');
      }
    } catch (e) {
      toast.error('请求失败: ' + e.message);
    } finally {
      setNewsSearching(false);
    }
  };

  const handleClearCompanyNews = async () => {
    const confirmWord = window.prompt('确定清空本企业全部相关新闻？请输入「清空」以确认：');
    if (confirmWord !== '清空') {
      if (confirmWord !== null) toast.error('输入不匹配，已取消');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${id}/news`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setCompanyNews([]);
        setNewsLoadedForId(id);
        toast.success(data.message || '已清空');
      } else {
        toast.error(data.message || '清空失败');
      }
    } catch (e) {
      toast.error('请求失败: ' + e.message);
    }
  };

  const fetchCompanyDetails = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    const currentId = id;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${currentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // 仅当响应返回时当前页面仍是该企业时才更新，避免轮询/旧请求覆盖新企业（如添加企业后显示上一家的社会评价条数）
        if (String(data?.id) === String(idRef.current)) {
          setCompany(data);
        }
        return data;
      } else {
        const err = await res.json();
        if (String(idRef.current) === String(currentId)) setError(err.message || '获取失败');
      }
    } catch (e) {
      if (String(idRef.current) === String(currentId)) setError('获取企业详情失败: ' + e.message);
    } finally {
      if (showLoading && String(idRef.current) === String(currentId)) setLoading(false);
    }
  }, [id]);

  // 切换企业时立即清空旧数据，避免短暂显示上一家企业的社会评价/新闻；新建企业页相关新闻严格空白
  useEffect(() => {
    if (!id) return;
    setCompany(null);
    setCompanyNews([]);
    setNewsLoadedForId(null);
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCompanyDetails();
  }, [id, navigate, fetchCompanyDetails]);

  useEffect(() => {
    if (id) fetchCompanyNews();
  }, [id, fetchCompanyNews]);

  const fetchSupplements = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/companies/${id}/supplements`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSupplements(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchSupplements();
  }, [id, fetchSupplements]);

  const handleSupplementSubmit = async (e) => {
    e.preventDefault();
    const text = supplementText.trim();
    if (!text || supplementSending) return;
    setSupplementSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${id}/supplement-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (res.ok) {
        setSupplementText('');
        await fetchSupplements();
        await fetchCompanyDetails(false);
        toast.success(data.summary || '已归集');
      } else {
        toast.error(data.message || '提交失败');
      }
    } catch (e) {
      toast.error('请求失败: ' + e.message);
    } finally {
      setSupplementSending(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('当前浏览器不支持语音输入');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const t = e.results[e.results.length - 1][0].transcript;
      setSupplementText((prev) => (prev ? prev + ' ' + t : t));
    };
    rec.onerror = () => { setListening(false); toast.error('语音识别失败'); };
    rec.start();
  };

  // 采集中时轮询刷新，完成后自动更新并提示（三灯：工商、相关新闻、社会评价）；相关新闻完成后刷新新闻列表
  const wasRunning = useRef(false);
  useEffect(() => {
    const llm = company?.llm_status || '';
    const news = company?.news_status || '';
    const media = company?.media_status || '';
    const isRunning = llm === 'running' || news === 'running' || media === 'running';
    if (wasRunning.current && !isRunning) {
      wasRunning.current = false;
      const done = llm === 'success' || news === 'success' || media === 'success';
      const err = llm === 'error' || news === 'error' || media === 'error';
      if (done && !err) toast.success('自动化流程已更新');
      else if (err) toast.error('部分任务异常，请检查配置后重试');
      if (news === 'success') fetchCompanyNews();
    }
    if (isRunning) wasRunning.current = true;
    if (!isRunning) return;
    const t = setInterval(() => fetchCompanyDetails(false), 3000);
    return () => clearInterval(t);
  }, [company?.llm_status, company?.news_status, company?.media_status, fetchCompanyDetails, fetchCompanyNews, toast]);

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${id}/crawl`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.info(data.message || '爬取已启动，请等待…');
        let latest = await fetchCompanyDetails(false);
        const deadline = Date.now() + 5 * 60 * 1000;
        const poll = async () => {
          if (Date.now() > deadline) {
            setCrawling(false);
            toast.info('爬取超时，请稍后刷新查看');
            return;
          }
          const next = await fetchCompanyDetails(false);
          const ms = (next || latest)?.media_status;
          latest = next || latest;
          if (ms !== 'running' && ms !== 'pending') {
            setCrawling(false);
            if (ms === 'success') toast.success('社会评价爬取完成');
            else if (ms === 'error') toast.error('爬取未返回数据，请确认已扫码登录或上传 Cookie');
            return;
          }
          setTimeout(poll, 2500);
        };
        setTimeout(poll, 2500);
      } else {
        toast.error(data.message || '爬取失败');
        setCrawling(false);
      }
    } catch (e) {
      toast.error('请求失败: ' + e.message);
      setCrawling(false);
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setAddingLink(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: linkUrl.trim(), title: linkTitle.trim(), company_id: parseInt(id) })
      });
      const data = await res.json();
      if (res.ok) {
        setLinkUrl('');
        setLinkTitle('');
        toast.success(data.message || '链接已添加');
        setTimeout(() => fetchCompanyDetails(false), 2000);
      } else {
        toast.error(data.message || '添加失败');
      }
    } catch (e) {
      toast.error('请求失败: ' + e.message);
    } finally {
      setAddingLink(false);
    }
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', id);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || '文档已上传，正在分析归类');
        setTimeout(() => fetchCompanyDetails(false), 3000);
      } else {
        toast.error(data.message || '上传失败');
      }
    } catch (e) {
      toast.error('请求失败: ' + e.message);
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${id}/export`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('TXT 报告已下载');
    } catch (e) {
      toast.error('导出失败: ' + e.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${id}/export-excel`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || '导出失败');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel 报告已下载');
    } catch (e) {
      toast.error('导出失败: ' + e.message);
    }
  };

  if (loading && !company) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 theme-spin border-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">错误! </strong>
          <span className="block sm:inline">{error}</span>
          <button onClick={() => navigate(-1)} className="absolute top-2 right-2 text-red-600 hover:text-red-800">返回</button>
        </div>
      </div>
    );
  }

  const equity = company?.equity_structure ? (() => {
    try { return JSON.parse(company.equity_structure); } catch { return []; }
  })() : [];

  return (
    <div className="space-y-8">
      {/* 头部 */}
      <div className="theme-gradient-banner rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{company?.name}</h1>
            <div className="flex items-center gap-4">
              <p className="theme-text-banner-muted">企业风险详情</p>
              <div className="flex items-center gap-2" title="工商信息 → 相关新闻 → 社会评价">
                <span className="theme-text-banner-sub text-xs">工商信息</span>
                <div className={`w-2.5 h-2.5 rounded-full ${(company?.llm_status || 'pending') === 'running' ? 'bg-blue-400 animate-pulse' : (company?.llm_status || 'pending') === 'success' ? 'bg-green-400' : (company?.llm_status || 'pending') === 'error' ? 'bg-red-400' : 'bg-white/50'}`} />
                <span className="theme-text-banner-sub text-xs">相关新闻</span>
                <div className={`w-2.5 h-2.5 rounded-full ${(company?.news_status || 'pending') === 'running' ? 'bg-blue-400 animate-pulse' : (company?.news_status || 'pending') === 'success' ? 'bg-green-400' : (company?.news_status || 'pending') === 'error' ? 'bg-red-400' : 'bg-white/50'}`} />
                <span className="theme-text-banner-sub text-xs">社会评价</span>
                <div className={`w-2.5 h-2.5 rounded-full ${(company?.media_status || 'pending') === 'running' ? 'bg-blue-400 animate-pulse' : (company?.media_status || 'pending') === 'success' ? 'bg-green-400' : (company?.media_status || 'pending') === 'error' ? 'bg-red-400' : 'bg-white/50'}`} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCrawl}
              disabled={crawling}
              className="bg-white theme-link px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {crawling ? '爬取中...' : '重新爬取'}
            </button>
            <button
              onClick={handleExport}
              className="bg-white theme-link px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              导出 TXT
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-white theme-link px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              导出 Excel
            </button>
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`/api/companies/${id}/export-pdf`, { headers: { 'Authorization': `Bearer ${token}` } });
                  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || '导出失败'); }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `report_${id}.pdf`; a.click();
                  URL.revokeObjectURL(url);
                  toast.success('PDF 已下载');
                } catch (e) { toast.error('导出失败: ' + e.message); }
              }}
              className="bg-white theme-link px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              导出 PDF
            </button>
            <button onClick={() => navigate(-1)} className="bg-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/30 transition-colors">
              返回
            </button>
          </div>
        </div>
      </div>

      {/* 基本信息：添加企业后先清空，采集中只显示提示，搜集完再展示字段 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        {(() => {
          const llmStatus = company?.llm_status || 'pending';
          const isCollectingBasic = llmStatus === 'pending' || llmStatus === 'running';
          const fields = [
            ['法定代表人', company?.legal_representative],
            ['注册资本', company?.registered_capital],
            ['行业', company?.industry],
            ['经营状态', company?.business_status],
            ['成立日期', company?.established_date],
            ['注册地址', company?.registered_address],
          ];
          const isFilled = (v) => v && String(v).trim() && !['-', '无', '未知'].includes(String(v).trim());
          const filledCount = fields.filter(([, v]) => isFilled(v)).length + (isFilled(company?.business_scope) ? 1 : 0);
          const totalCount = 7;
          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">基本信息</h2>
                {isCollectingBasic ? (
                  <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    工商信息采集中…
                  </span>
                ) : (
                  <span className={`text-sm px-3 py-1 rounded-full ${filledCount >= 5 ? 'bg-green-100 text-green-700' : filledCount >= 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    已填写 {filledCount}/{totalCount} 项
                  </span>
                )}
              </div>
              {isCollectingBasic ? (
                <p className="text-gray-500 py-4">正在联网获取工商信息，完成后将自动填充本模块。</p>
              ) : (
                <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fields.map(([label, val]) => (
                  <div key={label} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-500 flex items-center gap-1.5">
                      {label}
                      {isFilled(val) && (
                        <span className="text-green-500" title="已填写">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        </span>
                      )}
                    </label>
                    <p className="text-gray-800 truncate" title={val || '-'}>{val || '-'}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  经营范围
                  {isFilled(company?.business_scope) && (
                    <span className="text-green-500" title="已填写">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </span>
                  )}
                </label>
                <p className="text-gray-800">{company?.business_scope || '-'}</p>
              </div>
              {equity.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-500 mb-4">股权结构</label>
                  <div className="space-y-4">
                    {[...equity]
                      .map(s => ({ ...s, _pct: parseFloat(String(s.ratio || 0).replace(/[^\d.]/g, '')) || 0 }))
                      .sort((a, b) => b._pct - a._pct)
                      .map((s, i) => {
                        const pct = s._pct;
                        const maxPct = Math.max(...equity.map(x => parseFloat(String(x.ratio || 0).replace(/[^\d.]/g, '')) || 0), 1);
                        const width = maxPct > 0 ? (pct / maxPct) * 100 : 0;
                        const isLargest = i === 0;
                        return (
                          <div key={`${s.name}-${i}`} className="group">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-800 truncate max-w-[60%]" title={s.name}>
                                {s.name}
                                {s.type && <span className="text-gray-500 font-normal ml-1">({s.type})</span>}
                              </span>
                              <span className={`font-semibold ${isLargest ? 'theme-link' : 'text-gray-600'}`}>{s.ratio}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isLargest ? 'theme-gradient-banner' : 'theme-bg-light'}`}
                                style={{ width: `${Math.max(width, 5)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* 风险与数据概览（替代原词云，更有决策价值） */}
      {company && String(company.id) === String(id) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">风险与数据概览</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-2xl font-bold text-gray-800">{company.risk_level || '未知'}</div>
              <div className="text-sm text-gray-500">企业风险等级</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-2xl font-bold theme-link">{companyNews.length}</div>
              <div className="text-sm text-gray-500">相关新闻条数</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-2xl font-bold theme-link">
                {(company?.media_status === 'pending' || company?.media_status === 'running')
                  ? 0
                  : (company?.media_reviews || []).length}
              </div>
              <div className="text-sm text-gray-500">社会评价条数</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-sm font-medium text-gray-800 truncate" title={company?.last_updated || ''}>
                {company?.last_updated ? formatDate(company.last_updated) : '—'}
              </div>
              <div className="text-sm text-gray-500">最近更新</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">数据来自工商信息、大模型相关新闻与社会评价爬取，便于快速把握企业风险与信息完整度</p>
        </div>
      )}

      {/* 社会评价：添加企业后先清空，采集中只显示提示，搜集完再展示或暂无 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">社会评价</h2>
        {!(company && String(company.id) === String(id)) ? (
          <p className="text-gray-500">加载中…</p>
        ) : (() => {
          const mediaStatus = company?.media_status || 'pending';
          const isCollectingMedia = mediaStatus === 'pending' || mediaStatus === 'running';
          const isMediaError = mediaStatus === 'error';
          if (isCollectingMedia) {
            return (
              <p className="text-gray-500 py-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full theme-bg-primary animate-pulse" />
                社会评价采集中… 完成后将自动填充本模块。
              </p>
            );
          }
          // 红灯（爬取失败）时不展示历史内容，避免「红灯却还有内容」的困惑
          if (isMediaError) {
            return (
              <p className="text-gray-500 py-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="本次爬取未成功" />
                本次爬取未成功，请检查 MediaCrawler 登录与配置后点击「重新爬取」。
              </p>
            );
          }
          return (
          <>
        {company?.social_evaluation && (
          <div className="mb-4 p-4 theme-bg-light rounded-lg">
            <p className="text-gray-800">{company.social_evaluation}</p>
          </div>
        )}
        {company?.media_reviews?.length > 0 ? (
          <div className="space-y-4">
            {company.media_reviews.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800">{r.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    r.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                    r.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {r.sentiment === 'positive' ? '正面' : r.sentiment === 'negative' ? '负面' : '中性'}
                  </span>
                </div>
                <p className="text-gray-600 mt-2 text-sm">{r.content}</p>
                <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                  <span>{r.platform}</span>
                  {r.source_url && (
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="theme-link hover:underline">查看原文</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">暂无社会评价记录，可点击「重新爬取」获取</p>
        )}
          </>
          );
        })()}
      </div>

      {/* 大模型搜索相关新闻：仅当当前加载的企业与 URL 一致时展示列表，避免新增/切换企业时短暂显示别家新闻 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold text-gray-800">相关新闻</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCompanyNews}
              className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              清空本企业相关新闻
            </button>
            <button
              onClick={handleNewsSearch}
              disabled={newsSearching}
              className="theme-btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {newsSearching ? '搜索中...' : '大模型搜索相关新闻'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">相关新闻按企业专属标签筛选，仅展示属于「{company?.name || '当前企业'}」的资讯；使用大模型联网搜索后写入并打上本企业标签</p>
        {!(company && String(company.id) === String(id)) ? (
          <p className="text-gray-500 dark:text-gray-400">加载中…</p>
        ) : String(newsLoadedForId) !== String(id) ? (
          <p className="text-gray-500 dark:text-gray-400">加载中…</p>
        ) : (() => {
          // 仅在本企业新闻已加载完成后展示；只展示当前企业的新闻（company_id、company_name 均匹配）
          const list = (companyNews || []).filter((n) => {
            if (String(n.company_id) !== String(id)) return false;
            if (company?.name && n.company_name && String(n.company_name).trim() !== '' && String(n.company_name) !== String(company.name)) return false;
            return true;
          });
          return list.length > 0 ? (
          <div className="space-y-3">
            {list.map((n) => {
              const timeStr = n.publish_date || (n.created_at ? formatDateTime(n.created_at) : '-');
              const sourceUrl = n.source_url || (typeof n.source === 'string' && n.source.startsWith('http') ? n.source : null);
              let rd = n.risk_dimensions;
              if (typeof rd === 'string') try { rd = JSON.parse(rd); } catch { rd = null; }
              const item = {
                id: n.id,
                title: n.title,
                content: n.content,
                company_name: company?.name,
                company_id: id,
                time: timeStr,
                category: n.category,
                risk_level: n.risk_level,
                risk_dimensions: rd,
                source_url: sourceUrl,
                source: n.source
              };
              return (
                <div
                  key={n.id}
                  onClick={() => { setSelectedCompanyNews(item); setCompanyNewsModalView('summary'); setShowCompanyNewsModal(true); }}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex-1 min-w-0">{n.title}</h3>
                    {(n.company_name || company?.name) && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium theme-bg-light theme-link" title="企业专属标签">
                        {n.company_name || company?.name}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">{n.content}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {n.category && <span>{n.category}</span>}
                    {n.risk_level && (
                      <span className={`px-2 py-0.5 rounded ${n.risk_level === '高' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : n.risk_level === '中' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                        {n.risk_level}
                      </span>
                    )}
                    {(() => {
                      let rd = n.risk_dimensions;
                      if (typeof rd === 'string') try { rd = JSON.parse(rd); } catch { rd = null; }
                      if (!rd || typeof rd !== 'object') return null;
                      const labels = { legal_risk: '法律', financial_risk: '财务', operational_risk: '经营', reputation_risk: '舆情' };
                      return (
                        <span className="flex flex-wrap gap-1">
                          {Object.entries(rd).map(([k, v]) => (v && labels[k]) ? (
                            <span key={k} className={`px-1.5 py-0.5 rounded text-xs ${v === '高' ? 'bg-red-50 text-red-600' : v === '中' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-600'}`} title={k}>{labels[k]}:{v}</span>
                          ) : null)}
                        </span>
                      );
                    })()}
                    {timeStr !== '-' && <span>{timeStr}</span>}
                    {n.source && <span>来源：{typeof n.source === 'string' && n.source.startsWith('http') ? '链接' : n.source}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
          <p className="text-gray-500 dark:text-gray-400">暂无相关新闻，点击上方按钮使用大模型联网搜索</p>
          );
        })()}
      </div>

      {/* 相关新闻详情弹窗（与最新企业资讯弹窗一致） */}
      {showCompanyNewsModal && selectedCompanyNews && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{companyNewsModalView === 'detail' ? '资讯详情' : '资讯摘要'}</h3>
              <button
                onClick={() => { setShowCompanyNewsModal(false); setCompanyNewsModalView('summary'); }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {companyNewsModalView === 'detail' ? (
              <>
                <button onClick={() => setCompanyNewsModalView('summary')} className="text-sm theme-link hover:underline mb-4">← 返回摘要</button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{selectedCompanyNews.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {selectedCompanyNews.company_name && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">{selectedCompanyNews.company_name}</span>}
                  <span>{selectedCompanyNews.time}</span>
                  {selectedCompanyNews.category && <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{selectedCompanyNews.category}</span>}
                  {selectedCompanyNews.risk_level && (
                    <span className={`px-2 py-1 text-xs rounded ${selectedCompanyNews.risk_level === '高' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : selectedCompanyNews.risk_level === '中' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>{selectedCompanyNews.risk_level}风险</span>
                  )}
                  {selectedCompanyNews.risk_dimensions && typeof selectedCompanyNews.risk_dimensions === 'object' && (
                    <span className="flex flex-wrap gap-1">
                      {Object.entries(selectedCompanyNews.risk_dimensions).map(([k, v]) => {
                        const labels = { legal_risk: '法律', financial_risk: '财务', operational_risk: '经营', reputation_risk: '舆情' };
                        return (v && labels[k]) ? <span key={k} className={`px-2 py-0.5 rounded text-xs ${v === '高' ? 'bg-red-100 text-red-700' : v === '中' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{labels[k]}:{v}</span> : null;
                      })}
                    </span>
                  )}
                </div>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-6">{selectedCompanyNews.content || '暂无详细内容'}</div>
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {selectedCompanyNews.company_id && (
                    <button onClick={() => setShowCompanyNewsModal(false)} className="inline-flex items-center gap-2 px-4 py-2 theme-btn-primary rounded-lg text-sm font-medium">查看企业详情（当前页）</button>
                  )}
                  {selectedCompanyNews.source_url && (
                    <a href={selectedCompanyNews.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">查看原文</a>
                  )}
                </div>
              </>
            ) : (
              <>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{selectedCompanyNews.title}</h4>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {selectedCompanyNews.company_name && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">{selectedCompanyNews.company_name}</span>}
                  <span>{selectedCompanyNews.time}</span>
                  {selectedCompanyNews.category && <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{selectedCompanyNews.category}</span>}
                  {selectedCompanyNews.risk_level && <span className={`px-2 py-1 text-xs rounded ${selectedCompanyNews.risk_level === '高' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : selectedCompanyNews.risk_level === '中' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>{selectedCompanyNews.risk_level}风险</span>}
                </div>
                <div className="prose prose-sm text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap leading-relaxed line-clamp-6">{selectedCompanyNews.content || '暂无详细内容'}</div>
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button onClick={() => setCompanyNewsModalView('detail')} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    查看资讯详情
                  </button>
                  {selectedCompanyNews.company_id && <button onClick={() => setShowCompanyNewsModal(false)} className="inline-flex items-center gap-2 px-4 py-2 theme-btn-primary rounded-lg text-sm font-medium">查看企业详情（当前页）</button>}
                  {selectedCompanyNews.source_url && (
                    <a href={selectedCompanyNews.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">查看原文</a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 尽调补充 / AI 助手 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <button
          type="button"
          onClick={() => setSupplementPanelOpen(!supplementPanelOpen)}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h2 className="text-xl font-bold text-gray-800">尽调补充 · AI 助手</h2>
          <span className="text-gray-500">{supplementPanelOpen ? '收起' : '展开'}</span>
        </button>
        {supplementPanelOpen && (
          <>
            <p className="text-sm text-gray-500 mb-4">把尽调中网上查不到的信息用文字或语音告诉 AI，将自动整理并归集到本企业档案。</p>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
              {supplements.length === 0 ? (
                <p className="text-gray-400 text-sm">暂无对话记录，在下方输入或语音补充</p>
              ) : (
                supplements.map((s) => (
                  <div key={s.id} className={`flex ${s.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${s.role === 'user' ? 'theme-bg-light theme-link' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      <div className="whitespace-pre-wrap">{s.content}</div>
                      {s.merged_fields && (() => {
                        try {
                          const o = typeof s.merged_fields === 'string' ? JSON.parse(s.merged_fields) : s.merged_fields;
                          if (o && typeof o === 'object' && Object.keys(o).length) {
                            return <div className="mt-2 text-xs text-gray-500">已归集字段：{Object.keys(o).join('、')}</div>;
                          }
                        } catch {}
                        return null;
                      })()}
                      <div className="text-xs text-gray-400 mt-1">{s.created_at ? formatDateTime(s.created_at) : ''}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSupplementSubmit} className="flex gap-2">
              <input
                type="text"
                value={supplementText}
                onChange={(e) => setSupplementText(e.target.value)}
                placeholder="输入尽调信息（如：法人实际控制人为某某，注册资本实缴约 500 万）"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={supplementSending}
              />
              <button
                type="button"
                onClick={startVoiceInput}
                disabled={listening || supplementSending}
                className={`p-2 rounded-lg ${listening ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                title="语音输入"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0V8a5 5 0 0110 0v6z" /></svg>
              </button>
              <button type="submit" disabled={supplementSending || !supplementText.trim()} className="theme-btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {supplementSending ? '归集中...' : '发送并归集'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* 问这家企业（RAG 式问答） */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">问这家企业</h2>
        <p className="text-sm text-gray-500 mb-4">基于企业基本信息、新闻与尽调补充，AI 将回答与该公司相关的问题</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const q = askQuestion.trim();
            if (!q || askLoading) return;
            setAskLoading(true);
            setAskAnswer('');
            try {
              const token = localStorage.getItem('token');
              const res = await fetch(`/api/companies/${id}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ question: q })
              });
              const data = await res.json();
              if (res.ok) setAskAnswer(data.answer || '');
              else toast.error(data.message || '回答失败');
            } catch (err) { toast.error('请求失败: ' + err.message); }
            setAskLoading(false);
          }}
          className="flex gap-2 mb-3"
        >
          <input
            type="text"
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            placeholder="例如：该公司主要风险点有哪些？"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={askLoading}
          />
          <button type="submit" disabled={askLoading || !askQuestion.trim()} className="theme-btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {askLoading ? '回答中…' : '提问'}
          </button>
        </form>
        {askAnswer && <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-800 text-sm whitespace-pre-wrap">{askAnswer}</div>}
      </div>

      {/* 上传文档 & 添加链接 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">文档与链接</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">添加链接</h3>
            <form onSubmit={handleAddLink} className="space-y-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="标题（可选）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button type="submit" disabled={addingLink} className="theme-btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {addingLink ? '添加中...' : '添加链接'}
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-1">链接将交由大模型分析并归类到本企业</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">上传文档</h3>
            <label className="inline-flex items-center px-4 py-2 theme-btn-primary rounded-lg text-sm cursor-pointer disabled:opacity-50">
              <input type="file" accept=".txt,.pdf" onChange={handleUploadDocument} disabled={uploadingDoc} className="hidden" />
              {uploadingDoc ? '上传中...' : '选择文件 (.txt .pdf)'}
            </label>
            <p className="text-xs text-gray-500 mt-1">文档将交由大模型分析，资讯会加入滚动新闻并量化到图表</p>
          </div>
        </div>
      </div>

      {/* 法律诉讼 / 股权变动 / 资金变动 */}
      {(company?.legal_cases || company?.equity_changes || company?.capital_changes) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">法律诉讼 / 股权与资金变动</h2>
          <div className="space-y-4">
            {company.legal_cases && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">法律诉讼</h3>
                <div className="space-y-3">
                  {(() => {
                    try {
                      let arr = [];
                      const raw = String(company.legal_cases).trim();
                      try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) arr = parsed;
                        else if (parsed && typeof parsed === 'object') arr = [parsed];
                      } catch {
                        // 拼接的多个 JSON 如 {...}{...}，转为 [{...},{...}]
                        const wrapped = '[' + raw.replace(/}\s*{/g, '},{') + ']';
                        try {
                          arr = JSON.parse(wrapped);
                          if (!Array.isArray(arr)) arr = [];
                        } catch {
                          const matches = raw.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                          if (matches) arr = matches.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
                        }
                      }
                      return arr.map((a, i) => {
                        if (!a || typeof a !== 'object') return <div key={i} className="py-2 text-gray-600">{String(a)}</div>;
                        const ct = a.case_type || a.案件类型 || '-';
                        const st = a.status || a.状态 || '-';
                        const court = a.court || a.法院 || '-';
                        const date = a.date || a.日期 || '-';
                        return (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              <span><span className="text-gray-500">案件类型：</span>{ct}</span>
                              <span><span className="text-gray-500">状态：</span><span className={st.includes('结案') ? 'text-green-600' : 'text-amber-600'}>{st}</span></span>
                              <span><span className="text-gray-500">法院：</span>{court}</span>
                              <span><span className="text-gray-500">日期：</span>{date}</span>
                            </div>
                          </div>
                        );
                      });
                    } catch { return <p className="text-gray-600">{company.legal_cases}</p>; }
                  })()}
                </div>
              </div>
            )}
            {company.equity_changes && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">股权变动</h3>
                <div className="text-sm text-gray-600">
                  {(() => {
                    try {
                      const arr = JSON.parse(company.equity_changes);
                      return Array.isArray(arr) ? arr.map((a, i) => <div key={i} className="py-2">{typeof a === 'object' ? `${a.date} ${a.change}: ${a.detail || JSON.stringify(a)}` : a}</div>) : company.equity_changes;
                    } catch { return company.equity_changes; }
                  })()}
                </div>
              </div>
            )}
            {company.capital_changes && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">资金变动</h3>
                <div className="text-sm text-gray-600">
                  {(() => {
                    try {
                      const arr = JSON.parse(company.capital_changes);
                      return Array.isArray(arr) ? arr.map((a, i) => <div key={i} className="py-2">{typeof a === 'object' ? `${a.date} ${a.change}: ${a.before || ''} → ${a.after || ''}` : a}</div>) : company.capital_changes;
                    } catch { return company.capital_changes; }
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 风险警报 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">风险警报</h2>
        {company?.alerts?.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {company.alerts.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex justify-between items-start">
                  <span className="font-medium">{a.alert_type}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    a.severity === '高' ? 'bg-red-100 text-red-800' :
                    a.severity === '中' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>{a.severity}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{a.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">暂无风险警报</p>
        )}
      </div>
    </div>
  );
};

export default CompanyDetail;
