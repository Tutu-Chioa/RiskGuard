import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const UploadCenter = () => {
  useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetch('/api/companies', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));
    fetch('/api/links', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setLinks(Array.isArray(data) ? data : []))
      .catch(() => setLinks([]));
  }, [navigate]);

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setAddingLink(true);
    try {
      const token = localStorage.getItem('token');
      const body = { url: linkUrl.trim(), title: linkTitle.trim() };
      if (selectedCompany) body.company_id = parseInt(selectedCompany);
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setLinkUrl('');
        setLinkTitle('');
        toast.success(data.message || '链接已添加');
        fetch('/api/links', { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : [])
          .then(d => setLinks(Array.isArray(d) ? d : []));
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
      if (selectedCompany) formData.append('company_id', selectedCompany);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || '文档已上传，正在分析归类');
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

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">上传资料</h1>
        <p className="text-gray-600 mt-2">上传文档或添加链接，大模型将自动分析并归类到相关企业。资讯会加入滚动新闻，量化数据会展示在图表中。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 添加链接 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">添加链接</h2>
          <form onSubmit={handleAddLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">链接 URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题（可选）</label>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="链接标题"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">指定企业（可选，不选则由大模型自动归类）</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring focus:border-transparent"
              >
                <option value="">自动归类</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={addingLink} className="theme-btn-primary px-6 py-2 rounded-lg disabled:opacity-50">
              {addingLink ? '添加中...' : '添加链接'}
            </button>
          </form>
        </div>

        {/* 上传文档 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">上传文档</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">指定企业（可选）</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring focus:border-transparent"
              >
                <option value="">自动归类</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <label className="inline-flex items-center px-6 py-3 theme-btn-primary rounded-lg cursor-pointer disabled:opacity-50">
              <input type="file" accept=".txt,.pdf" onChange={handleUploadDocument} disabled={uploadingDoc} className="hidden" />
              {uploadingDoc ? '上传中...' : '选择文件 (.txt .pdf)'}
            </label>
            <p className="text-sm text-gray-500">支持 txt、pdf，大模型将自动分析内容并归类到企业</p>
          </div>
        </div>
      </div>

      {/* 最近添加的链接 */}
      {links.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">最近添加的链接</h2>
          <ul className="divide-y divide-gray-200">
            {links.slice(0, 10).map(l => (
              <li key={l.id} className="py-3 flex justify-between items-start">
                <div>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="theme-link hover:underline">{l.title || l.url}</a>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    l.status === 'analyzed' ? 'bg-green-100 text-green-700' :
                    l.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{l.status}</span>
                </div>
                {l.company_id ? (
                  <button onClick={() => navigate(`/company/${l.company_id}`)} className="text-sm text-gray-500 theme-link hover:opacity-90">
                    查看企业
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">待归类</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UploadCenter;
