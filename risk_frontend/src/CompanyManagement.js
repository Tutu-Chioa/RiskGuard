import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';
import { useDateTimeFormat } from './utils/useDateTimeFormat';

const CompanyManagement = () => {
  const toast = useToast();
  const { formatDate } = useDateTimeFormat();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiskLevel, setFilterRiskLevel] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [sortBy, setSortBy] = useState('last_updated');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [batchImportText, setBatchImportText] = useState('');
  const [batchImportLoading, setBatchImportLoading] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    industry: '',
    legal_representative: '',
    registered_capital: '',
    business_status: '',
    registered_address: '',
    business_scope: ''
  });
  const navigate = useNavigate();

  const fetchCompanies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (filterRiskLevel) params.set('risk_level', filterRiskLevel);
      if (filterIndustry) params.set('industry', filterIndustry);
      if (sortBy) params.set('sort', sortBy);
      if (favoritesOnly) params.set('favorite_only', '1');
      const url = '/api/companies' + (params.toString() ? '?' + params.toString() : '');
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setCompanies(list);
      }
    } catch (error) {
      console.error('获取企业列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterRiskLevel, filterIndustry, sortBy, favoritesOnly]);

  const fetchIndustries = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch('/api/companies/industries', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const list = await r.json();
        setIndustries(Array.isArray(list) ? list : []);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchCompanies();
    const onFocus = () => fetchCompanies();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCompanies]);
  useEffect(() => { fetchIndustries(); }, [fetchIndustries]);

  const toggleFavorite = async (companyId, e) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/companies/${companyId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || (data.is_favorite ? '已收藏' : '已取消收藏'));
        fetchCompanies();
      } else toast.error(data.message || '操作失败');
    } catch (err) {
      toast.error('网络错误');
    }
  };

  // 添加企业
  const handleAddCompany = async (e) => {
    e.preventDefault();
    if (!newCompany.name) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCompany.name,
          industry: newCompany.industry || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newId = data?.id;
        setNewCompany({ name: '', industry: '', legal_representative: '', registered_capital: '', business_status: '', registered_address: '', business_scope: '' });
        setShowAddModal(false);
        toast.success('企业添加成功！正在跳转到该企业详情页');
        await fetchCompanies();
        if (newId) navigate(`/company/${newId}`);
      } else {
        const errorData = await response.json();
        toast.error(`添加失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      toast.error(`网络错误: ${error.message}`);
    }
  };

  // 更新企业
  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!editingCompany) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/companies/${editingCompany.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingCompany)
      });

      if (response.ok) {
        setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...editingCompany } : c));
        setEditingCompany(null);
        setShowEditModal(false);
        toast.success('企业更新成功！');
      } else {
        const errorData = await response.json();
        toast.error(`更新失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      toast.error(`网络错误: ${error.message}`);
    }
  };

  // 批量导入：解析文本或文件为 { name, industry? }[]，最多 100 条
  const parseBatchInput = (text) => {
    const lines = text.trim().split(/\n/).map(l => l.trim()).filter(Boolean);
    const companies = [];
    for (const line of lines) {
      const parts = line.split(/[,，\t]/).map(p => p.trim()).filter(Boolean);
      companies.push({ name: parts[0] || line, industry: parts[1] || '' });
    }
    return companies.slice(0, 100);
  };

  const handleBatchImport = async (e) => {
    e.preventDefault();
    const list = parseBatchInput(batchImportText);
    if (list.length === 0) {
      toast.error('请至少输入一行企业名称（每行一个，或 名称,行业）');
      return;
    }
    if (list.length > 100) {
      toast.error('最多支持 100 条，已截断');
    }
    setBatchImportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/companies/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ companies: list })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `成功导入 ${list.length} 家企业`);
        setBatchImportText('');
        setShowBatchImportModal(false);
        fetchCompanies();
      } else {
        toast.error(data.message || '批量导入失败');
      }
    } catch (err) {
      toast.error('网络错误: ' + (err.message || ''));
    } finally {
      setBatchImportLoading(false);
    }
  };

  const handleBatchImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      let text = reader.result;
      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text);
          const arr = Array.isArray(json) ? json : (json.companies || []);
          const list = arr.slice(0, 100).map(c => ({ name: c.name || String(c), industry: c.industry || '' }));
          setBatchImportText(list.map(c => c.industry ? `${c.name}, ${c.industry}` : c.name).join('\n'));
        } catch (_) {
          toast.error('JSON 格式无效');
          return;
        }
      } else {
        setBatchImportText(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 删除企业（二次确认：需输入「删除」）
  const handleDeleteCompany = async (id, name) => {
    const confirmWord = window.prompt(`为确认删除，请输入「删除」以删除企业 "${name}"：`);
    if (confirmWord !== '删除') {
      if (confirmWord !== null) toast.error('输入不匹配，已取消');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCompanies(prev => prev.filter(c => c.id !== id));
        toast.success('企业删除成功');
      } else {
        const errorData = await response.json();
        toast.error(`删除失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      toast.error(`网络错误: ${error.message}`);
    }
  };

  const list = Array.isArray(companies) ? companies : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">企业监控管理</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">管理您的企业监控列表</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBatchImportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              批量导入
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 theme-btn-primary rounded-lg font-medium shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              添加企业
            </button>
          </div>
        </div>

        {/* 筛选与排序 */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">视图：</span>
            <button
              type="button"
              onClick={() => setFavoritesOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!favoritesOnly ? 'theme-btn-primary' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setFavoritesOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${favoritesOnly ? 'theme-btn-primary' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              我的收藏
            </button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索企业名称或法定代表人"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 theme-ring bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <svg className="absolute left-2.5 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <select
              value={filterRiskLevel}
              onChange={(e) => setFilterRiskLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">全部风险</option>
              <option value="低">低</option>
              <option value="中">中</option>
              <option value="高">高</option>
              <option value="未知">未知</option>
            </select>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[120px]"
            >
              <option value="">全部行业</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="last_updated">最近更新</option>
              <option value="last_updated_asc">最早更新</option>
              <option value="name">名称 A-Z</option>
              <option value="name_desc">名称 Z-A</option>
              <option value="risk_level">风险从高到低</option>
            </select>
          </div>
        </div>

        {/* 企业列表 */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 theme-spin border-transparent"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">企业名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">风险</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">法定代表人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">注册资本</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">经营状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">更新时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                {list.length > 0 ? (
                  list.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(company.id, e)}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          title={company.is_favorite ? '取消收藏' : '收藏'}
                        >
                          {company.is_favorite ? (
                            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1" title="工商信息 → 相关新闻 → 社会评价">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(company.llm_status || 'pending') === 'running' ? 'bg-blue-500 animate-pulse' : (company.llm_status || 'pending') === 'success' ? 'bg-green-500' : (company.llm_status || 'pending') === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(company.news_status || 'pending') === 'running' ? 'bg-blue-500 animate-pulse' : (company.news_status || 'pending') === 'success' ? 'bg-green-500' : (company.news_status || 'pending') === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(company.media_status || 'pending') === 'running' ? 'bg-blue-500 animate-pulse' : (company.media_status || 'pending') === 'success' ? 'bg-green-500' : (company.media_status || 'pending') === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          </div>
                          <button type="button" onClick={() => navigate(`/company/${company.id}`)} className="text-sm font-medium theme-link hover:underline text-left">
                            {company.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          company.risk_level === '高' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          company.risk_level === '中' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          company.risk_level === '低' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}>{company.risk_level || '未知'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{company.legal_representative || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{company.registered_capital || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          company.business_status === '存续' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          company.business_status === '注销' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          company.business_status === '吊销' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {company.business_status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(company.last_updated || company.timestamp || company.created_at)
                          ? formatDate(company.last_updated || company.timestamp || company.created_at)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingCompany({
                              id: company.id,
                              name: company.name,
                              industry: company.industry || '',
                              legal_representative: company.legal_representative || '',
                              registered_capital: company.registered_capital || '',
                              business_status: company.business_status || '',
                              registered_address: company.registered_address || '',
                              business_scope: company.business_scope || '',
                              tags: company.tags || '',
                              supplement_notes: company.supplement_notes || ''
                            });
                            setShowEditModal(true);
                          }}
                          className="theme-link mr-3"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => navigate(`/company/${company.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          查看详情
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      没有找到相关企业
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 添加企业弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">添加企业</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">企业名称 *</label>
                <input type="text" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="请输入企业全称" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">行业</label>
                <input type="text" value={newCompany.industry} onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="如：科技、金融" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
                <button type="submit" className="flex-1 px-4 py-2 theme-btn-primary rounded-lg">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 批量导入弹窗 */}
      {showBatchImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">批量导入企业</h2>
              <button type="button" onClick={() => { setShowBatchImportModal(false); setBatchImportText(''); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleBatchImport} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">每行一个企业，格式：<strong>企业名称</strong> 或 <strong>企业名称, 行业</strong>。也可上传 CSV/JSON 文件（JSON 需含 name 或 companies 数组）。最多 100 条。</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">粘贴列表或上传文件</label>
                <textarea value={batchImportText} onChange={(e) => setBatchImportText(e.target.value)} rows={10} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm" placeholder="北京某某科技有限公司&#10;上海某某网络有限公司, 互联网" />
                <input type="file" accept=".txt,.csv,.json" className="mt-2 text-sm text-gray-600 dark:text-gray-400" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBatchImportFile(f); e.target.value = ''; }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowBatchImportModal(false); setBatchImportText(''); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
                <button type="submit" disabled={batchImportLoading} className="flex-1 px-4 py-2 theme-btn-primary rounded-lg disabled:opacity-50">
                  {batchImportLoading ? '导入中…' : '导入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑企业弹窗 */}
      {showEditModal && editingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">编辑企业</h2>
              <button type="button" onClick={() => { setShowEditModal(false); setEditingCompany(null); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateCompany} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">企业名称 *</label>
                  <input type="text" value={editingCompany.name} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">行业</label>
                  <input type="text" value={editingCompany.industry} onChange={(e) => setEditingCompany({ ...editingCompany, industry: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">法定代表人</label>
                  <input type="text" value={editingCompany.legal_representative} onChange={(e) => setEditingCompany({ ...editingCompany, legal_representative: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">注册资本</label>
                  <input type="text" value={editingCompany.registered_capital} onChange={(e) => setEditingCompany({ ...editingCompany, registered_capital: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">经营状态</label>
                  <select value={editingCompany.business_status} onChange={(e) => setEditingCompany({ ...editingCompany, business_status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <option value="">请选择</option>
                    <option value="存续">存续</option>
                    <option value="注销">注销</option>
                    <option value="吊销">吊销</option>
                    <option value="迁入">迁入</option>
                    <option value="迁出">迁出</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">注册地址</label>
                <input type="text" value={editingCompany.registered_address} onChange={(e) => setEditingCompany({ ...editingCompany, registered_address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">经营范围</label>
                <textarea rows={3} value={editingCompany.business_scope} onChange={(e) => setEditingCompany({ ...editingCompany, business_scope: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签</label>
                  <input type="text" value={editingCompany.tags ?? ''} onChange={(e) => setEditingCompany({ ...editingCompany, tags: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="逗号分隔，如：重点, 供应商" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">补充备注</label>
                  <input type="text" value={editingCompany.supplement_notes ?? ''} onChange={(e) => setEditingCompany({ ...editingCompany, supplement_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="可选" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingCompany(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">取消</button>
                <button type="submit" className="flex-1 px-4 py-2 theme-btn-primary rounded-lg">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;