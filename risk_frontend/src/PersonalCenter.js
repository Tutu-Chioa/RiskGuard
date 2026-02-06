import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const PersonalCenter = () => {
  const { updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // profile, api-config, change-password
  const [apiConfig, setApiConfig] = useState({
    apiKey: '',
    modelProvider: 'openai',
    modelName: 'gpt-4'
  });
  const [userProfile, setUserProfile] = useState({
    username: '',
    email: '',
    role: '',
    avatar: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const navigate = useNavigate();

  // 加载用户信息
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    Promise.all([
      fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error('获取失败');
          return r.json();
        })
        .then(data => {
          setUserProfile({
            username: data.username || '',
            email: data.email || '',
            role: data.role || '',
            avatar: data.avatar || ''
          });
          if (data.avatar) setPreviewUrl(data.avatar);
        }),
      fetch('/api/llm-config', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : {})
        .then(data => {
          if (data.api_key || data.base_url || data.model) {
            setApiConfig(prev => ({
              ...prev,
              apiKey: data.api_key || '',
              modelName: data.model || 'gpt-4o-mini'
            }));
          }
        })
        .catch(() => {})
    ]).catch(() => {
      navigate('/login');
    }).finally(() => {
      setLoading(false);
    });
  }, [navigate]);

  // 保存用户资料（同步到后端，邮件提醒将发往此处填写的邮箱）
  const saveProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setMessage('');

    try {
      let avatarData = null;
      if (selectedFile) {
        avatarData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error('图片读取失败'));
          reader.readAsDataURL(selectedFile);
        });
      }
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: userProfile.username, email: userProfile.email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.message || '保存失败');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      updateUser({
        username: data.username ?? userProfile.username,
        email: data.email ?? userProfile.email,
        role: data.role ?? userProfile.role,
        avatar: avatarData || userProfile.avatar
      });
      setMessage('个人资料已更新，风险提醒将发送至当前邮箱');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('更新失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 保存API配置
  const saveApiConfig = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/llm-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          api_key: apiConfig.apiKey,
          model: apiConfig.modelName
        })
      });

      if (response.ok) {
        setMessage('API配置保存成功！');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setMessage('保存失败: ' + (errorData.detail || '未知错误'));
      }
    } catch (error) {
      setMessage('保存失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('新密码与确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage('新密码长度不能少于6位');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('请先登录');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('密码修改成功！');
        // 清空密码表单
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.detail || '密码修改失败');
      }
    } catch (error) {
      setMessage('网络错误: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理头像文件选择
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // 创建预览URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading && userProfile.username === '') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 顶部横幅 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">个人中心</h1>
          <p className="text-purple-100">管理您的个人信息、API配置和监控企业</p>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 选项卡导航 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              个人资料
            </button>
            <button
              onClick={() => setActiveTab('api-config')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'api-config'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              API配置
            </button>
            <button
              onClick={() => setActiveTab('change-password')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'change-password'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              修改密码
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* 个人资料面板 */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">个人资料</h3>
              
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="头像预览" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-2xl">
                          {userProfile.username ? userProfile.username.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                </div>
                <div>
                  <p className="text-sm text-gray-500">点击头像图标上传新图片</p>
                  <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG 格式，最大 2MB</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                  <input
                    type="text"
                    value={userProfile.username}
                    onChange={(e) => setUserProfile({...userProfile, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入您的用户名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入您的邮箱地址"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <input
                    type="text"
                    value={userProfile.role}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={saveProfile}
                  disabled={loading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '保存中...' : '保存资料'}
                </button>
              </div>
            </div>
          )}

          {/* API配置面板 */}
          {activeTab === 'api-config' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">大模型API配置</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API密钥</label>
                  <input
                    type="password"
                    value={apiConfig.apiKey}
                    onChange={(e) => setApiConfig({...apiConfig, apiKey: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入您的API密钥"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">模型提供商</label>
                    <select
                      value={apiConfig.modelProvider}
                      onChange={(e) => setApiConfig({...apiConfig, modelProvider: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                    <input
                      type="text"
                      value={apiConfig.modelName}
                      onChange={(e) => setApiConfig({...apiConfig, modelName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="如: gpt-4, claude-3-opus等"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={saveApiConfig}
                  disabled={loading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          )}

          {/* 修改密码面板 */}
          {activeTab === 'change-password' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">修改密码</h3>
              
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="请输入当前密码"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="请输入新密码，至少6位"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="请再次输入新密码"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={changePassword}
                  disabled={loading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '修改中...' : '修改密码'}
                </button>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">密码安全提示</h4>
                <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                  <li>密码长度至少6位</li>
                  <li>建议包含大小写字母、数字和特殊字符</li>
                  <li>不要使用与其他网站相同的密码</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalCenter;