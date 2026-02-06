import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [linkStatus, setLinkStatus] = useState('');
  const [apiConfig, setApiConfig] = useState({
    apiKey: '',
    modelName: 'gpt-4',
    provider: 'openai'
  });
  const navigate = useNavigate();

  // 模拟公司列表
  const companies = [
    { id: '1', name: '北京智源科技有限公司' },
    { id: '2', name: '上海金融信息服务有限公司' },
    { id: '3', name: '深圳创新科技集团' },
    { id: '4', name: '广州互联网科技有限公司' },
  ];

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('请选择一个文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploadStatus('上传中...');
      
      const response = await fetch('http://localhost:8003/api/upload-document/', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        await response.json();
        setUploadStatus('文件上传成功！大模型正在分析内容...');
        setSelectedFile(null);
      } else {
        const errorData = await response.json();
        setUploadStatus('上传失败: ' + errorData.detail || '未知错误');
      }
    } catch (error) {
      setUploadStatus('上传失败: ' + error.message);
    }
  };

  const handleSubmitLink = async () => {
    if (!linkUrl || !companyId) {
      setLinkStatus('请填写链接和选择公司');
      return;
    }

    try {
      setLinkStatus('提交中...');
      
      const formData = new FormData();
      formData.append('url', linkUrl);
      formData.append('company_id', companyId);

      const response = await fetch('http://localhost:8003/api/submit-link/', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        await response.json();
        setLinkStatus('链接提交成功！大模型正在分析内容...');
        setLinkUrl('');
      } else {
        const errorData = await response.json();
        setLinkStatus('提交失败: ' + errorData.detail || '未知错误');
      }
    } catch (error) {
      setLinkStatus('提交失败: ' + error.message);
    }
  };

  const handleSaveApiConfig = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', 'current_user'); // 实际应用中应该是真实用户ID
      formData.append('provider', apiConfig.provider);
      formData.append('model_name', apiConfig.modelName);
      formData.append('api_key', apiConfig.apiKey);

      const response = await fetch('http://localhost:8003/api/configure-model/', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        await response.json();
        alert('API配置保存成功！');
      } else {
        const errorData = await response.json();
        alert('配置保存失败: ' + errorData.detail || '未知错误');
      }
    } catch (error) {
      alert('配置保存失败: ' + error.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 如果用户未登录，重定向到登录页面
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">企业风险监控平台</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 hidden sm:block">
                欢迎回来，{user.role === 'admin' ? '风控专家' : user.username}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/personal-center')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.573 1.066c-.94 1.543.826 3.31 2.37 2.37a1.724 1.724 0 002.572 1.065c.426 1.756.426 4.19 0 5.937a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 顶部横幅 */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold mb-4">智能风险信息补充平台</h1>
              <p className="text-purple-100 mb-6">上传文档或链接，利用AI大模型自动分析并补充企业风险信息</p>
            </div>
          </div>

          {/* API配置卡片 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">大模型API配置</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API密钥</label>
                <input
                  type="password"
                  value={apiConfig.apiKey}
                  onChange={(e) => setApiConfig({...apiConfig, apiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="输入API密钥"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={apiConfig.modelName}
                  onChange={(e) => setApiConfig({...apiConfig, modelName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="如: gpt-4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提供商</label>
                <select
                  value={apiConfig.provider}
                  onChange={(e) => setApiConfig({...apiConfig, provider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleSaveApiConfig}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
              >
                保存配置
              </button>
            </div>
          </div>

          {/* 文档上传卡片 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">上传文档进行分析</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">选择文档</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="mt-1 text-sm text-gray-500">支持 PDF, DOC, DOCX, TXT, HTML 等格式</p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile}
                  className={`px-6 py-2 rounded-lg transition-colors cursor-pointer ${
                    selectedFile 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  上传并分析
                </button>
              </div>
            </div>
            {uploadStatus && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                {uploadStatus}
              </div>
            )}
          </div>

          {/* 链接提交卡片 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">提交链接进行分析</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">链接地址</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com/article"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联企业</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">选择企业</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleSubmitLink}
                disabled={!linkUrl || !companyId}
                className={`px-6 py-2 rounded-lg transition-colors cursor-pointer ${
                  linkUrl && companyId
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                提交并分析
              </button>
            </div>
            {linkStatus && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                {linkStatus}
              </div>
            )}
          </div>

          {/* 功能说明 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">功能说明</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-purple-600 text-2xl mb-2">📄</div>
                <h3 className="font-semibold text-gray-800 mb-1">文档分析</h3>
                <p className="text-sm text-gray-600">上传企业相关的文档，AI模型将自动提取关键信息并评估风险</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-blue-600 text-2xl mb-2">🔗</div>
                <h3 className="font-semibold text-gray-800 mb-1">链接分析</h3>
                <p className="text-sm text-gray-600">提交新闻、社交媒体等外部链接，AI将分析内容并判断对企业的影响</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-green-600 text-2xl mb-2">🤖</div>
                <h3 className="font-semibold text-gray-800 mb-1">智能处理</h3>
                <p className="text-sm text-gray-600">自动判断信息类型（正面/负面），归类风险类别并更新企业风险评分</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;