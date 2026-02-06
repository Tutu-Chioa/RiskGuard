import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AdminPage = () => {
  const { user, role } = useAuth();
  const currentUserId = user?.id;
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userMsg, setUserMsg] = useState('');
  const [userError, setUserError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [addSaving, setAddSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_from: '',
    smtp_password: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = useCallback(() => {
    const token = localStorage.getItem('token');
    return fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('无权限'))))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (role !== 'admin') return;
    if (tab === 'users') {
      setUsersLoading(true);
      fetchUsers().finally(() => setUsersLoading(false));
    } else if (tab === 'settings') {
      setSettingsLoading(true);
      const token = localStorage.getItem('token');
      fetch('/api/admin/system-settings', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => setSettings({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || '587',
          smtp_user: data.smtp_user || '',
          smtp_from: data.smtp_from || '',
          smtp_password: data.smtp_password || '',
        }))
        .finally(() => setSettingsLoading(false));
    }
  }, [role, tab, fetchUsers]);

  const handleCreateUser = (e) => {
    e.preventDefault();
    setUserError('');
    setUserMsg('');
    if (!addForm.username.trim()) { setUserError('请填写用户名'); return; }
    if (!addForm.password || addForm.password.length < 6) { setUserError('密码至少 6 位'); return; }
    setAddSaving(true);
    const token = localStorage.getItem('token');
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        username: addForm.username.trim(),
        email: addForm.email.trim() || undefined,
        password: addForm.password,
        role: addForm.role,
      }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          setUserMsg(data.message || '创建成功');
          setShowAddModal(false);
          setAddForm({ username: '', email: '', password: '', role: 'user' });
          fetchUsers();
        } else setUserError(data.message || '创建失败');
      })
      .catch(() => setUserError('网络错误'))
      .finally(() => setAddSaving(false));
  };

  const handleRoleChange = (u, newRole) => {
    if (u.id === currentUserId || u.role === newRole) return;
    setRoleSaving(u.id);
    setUserError('');
    const token = localStorage.getItem('token');
    fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: newRole }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          setUserMsg(`已将 ${u.username} 设为${newRole === 'admin' ? '管理员' : '普通用户'}`);
          fetchUsers();
        } else setUserError(data.message || '更新失败');
      })
      .catch(() => setUserError('网络错误'))
      .finally(() => setRoleSaving(null));
  };

  const handleDeleteUser = (u) => {
    if (u.id === currentUserId) return;
    setDeleteConfirm(u);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const token = localStorage.getItem('token');
    fetch(`/api/admin/users/${deleteConfirm.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          setUserMsg('已删除用户');
          setDeleteConfirm(null);
          fetchUsers();
        } else setUserError(data.message || '删除失败');
      })
      .catch(() => setUserError('网络错误'));
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSettingsSaving(true);
    const token = localStorage.getItem('token');
    const body = { ...settings };
    if (!body.smtp_password || body.smtp_password === '********') delete body.smtp_password;
    fetch('/api/admin/system-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          setMessage(data.message || '已保存');
          if (body.smtp_password !== undefined) setSettings((s) => ({ ...s, smtp_password: '********' }));
        } else setError(data.message || '保存失败');
      })
      .catch(() => setError('网络错误'))
      .finally(() => setSettingsSaving(false));
  };

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">您没有权限访问管理后台。</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">管理后台</h1>

      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 mb-4 sm:mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${tab === 'users' ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          用户管理
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${tab === 'settings' ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          系统设置（发件人）
        </button>
      </div>

      {tab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">用户列表</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">可在此新增、编辑角色或删除用户</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowAddModal(true); setUserError(''); setUserMsg(''); }}
              className="theme-btn-primary px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
            >
              新增用户
            </button>
          </div>
          {(userMsg || userError) && (
            <div className={`px-4 py-2 text-sm ${userError ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'}`}>
              {userError || userMsg}
            </div>
          )}
          {usersLoading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                    <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">ID</th>
                    <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">用户名</th>
                    <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">邮箱</th>
                    <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">角色</th>
                    <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">注册时间</th>
                    <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.id}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{u.username}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email || '-'}</td>
                      <td className="px-4 py-3">
                        {u.id === currentUserId ? (
                          <span className={u.role === 'admin' ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                            {u.role === 'admin' ? '管理员' : '普通用户'}（当前登录）
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            disabled={roleSaving === u.id}
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                          >
                            <option value="user">普通用户</option>
                            <option value="admin">管理员</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-500">{u.created_at || '-'}</td>
                      <td className="px-4 py-3">
                        {u.id === currentUserId ? (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">不可删除自己</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="text-red-600 dark:text-red-400 hover:underline text-sm"
                          >
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!usersLoading && users.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">暂无用户数据</div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !addSaving && setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">新增用户</h3>
            {userError && <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-sm">{userError}</div>}
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名 *</label>
                <input
                  type="text"
                  value={addForm.username}
                  onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="登录用户名"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱（选填）</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码 *（至少 6 位）</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={addSaving} className="theme-btn-primary px-4 py-2 rounded-lg disabled:opacity-50">
                  {addSaving ? '创建中...' : '创建'}
                </button>
                <button type="button" onClick={() => !addSaving && setShowAddModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-800 dark:text-gray-100">确定要删除用户「{deleteConfirm.username}」吗？此操作不可恢复。</p>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={confirmDelete} className="theme-btn-primary px-4 py-2 rounded-lg">
                确定删除
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">邮件发件人（SMTP）</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">用于忘记密码、风险速览等邮件。配置后系统将以此处设置的账号作为发件人。</p>
          {message && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm">{message}</div>}
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
          {settingsLoading ? (
            <div className="text-gray-500">加载中...</div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP 服务器</label>
                <input
                  type="text"
                  value={settings.smtp_host}
                  onChange={(e) => setSettings((s) => ({ ...s, smtp_host: e.target.value }))}
                  placeholder="例如 smtp.example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">端口</label>
                <input
                  type="text"
                  value={settings.smtp_port}
                  onChange={(e) => setSettings((s) => ({ ...s, smtp_port: e.target.value }))}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">发件人登录账号（邮箱）</label>
                <input
                  type="text"
                  value={settings.smtp_user}
                  onChange={(e) => setSettings((s) => ({ ...s, smtp_user: e.target.value }))}
                  placeholder="notify@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">发件人显示名称/地址（选填）</label>
                <input
                  type="text"
                  value={settings.smtp_from}
                  onChange={(e) => setSettings((s) => ({ ...s, smtp_from: e.target.value }))}
                  placeholder="不填则使用上方登录账号"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP 密码 / 授权码</label>
                <input
                  type="password"
                  value={settings.smtp_password === '********' ? '' : settings.smtp_password}
                  onChange={(e) => setSettings((s) => ({ ...s, smtp_password: e.target.value }))}
                  placeholder={settings.smtp_password === '********' ? '已配置，留空不修改' : '请输入密码'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={settingsSaving}
                className="theme-btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {settingsSaving ? '保存中...' : '保存'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
