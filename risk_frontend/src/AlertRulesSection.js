import React, { useState, useEffect } from 'react';

const RULE_TYPES = [
  { value: 'risk_upgrade', label: '风险等级上升' },
  { value: 'new_alert', label: '新增风险警报' },
  { value: 'news_spike', label: '资讯量突增' }
];

export default function AlertRulesSection() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', rule_type: 'risk_upgrade', config: '{}', enabled: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchList = () => {
    const token = localStorage.getItem('token');
    fetch('/api/alert-rules', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const token = localStorage.getItem('token');
    const url = editing ? `/api/alert-rules/${editing.id}` : '/api/alert-rules';
    const method = editing ? 'PUT' : 'POST';
    let config = {};
    try {
      if (form.config.trim()) config = JSON.parse(form.config);
    } catch (_) {
      setMessage('config 需为合法 JSON');
      setSaving(false);
      return;
    }
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: form.name, rule_type: form.rule_type, config, enabled: !!form.enabled })
    })
      .then(r => r.json())
      .then(d => {
        if (d.id !== undefined || d.message) {
          setMessage(editing ? '已更新' : '已创建');
          setShowForm(false);
          setEditing(null);
          setForm({ name: '', rule_type: 'risk_upgrade', config: '{}', enabled: true });
          fetchList();
        } else setMessage(d.message || '操作失败');
      })
      .catch(() => setMessage('网络错误'))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('确定删除该预警规则？')) return;
    const token = localStorage.getItem('token');
    fetch(`/api/alert-rules/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) { fetchList(); setMessage('已删除'); } })
      .catch(() => setMessage('删除失败'));
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      rule_type: item.rule_type || 'risk_upgrade',
      config: typeof item.config === 'string' ? item.config : JSON.stringify(item.config || {}, null, 2),
      enabled: item.enabled !== false
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">预警规则</h3>
        <button
          type="button"
          onClick={() => { setEditing(null); setForm({ name: '', rule_type: 'risk_upgrade', config: '{}', enabled: true }); setShowForm(true); }}
          className="px-3 py-1.5 theme-btn-primary rounded-lg text-sm"
        >
          新建规则
        </button>
      </div>
      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
      {loading ? (
        <div className="py-8 text-center text-gray-500">加载中...</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-600">
          {list.length === 0 ? (
            <li className="py-6 text-center text-gray-500 dark:text-gray-400">暂无规则，可点击「新建规则」添加</li>
          ) : (
            list.map((item) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {RULE_TYPES.find(r => r.value === item.rule_type)?.label || item.rule_type} · {item.enabled !== false ? '已启用' : '已关闭'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="text-sm theme-link">编辑</button>
                  <button type="button" onClick={() => handleDelete(item.id)} className="text-sm text-red-600 dark:text-red-400">删除</button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">规则名称</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
            <select value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              {RULE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">配置 (JSON)</label>
            <textarea value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm" placeholder='{"min_severity": "high"}' />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="enabled" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">启用</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 theme-btn-primary rounded-lg disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">取消</button>
          </div>
        </form>
      )}
    </div>
  );
}
