import React, { useState, useEffect, useCallback } from 'react';

const LIMIT = 50;

export default function AuditLogSection({ isAdmin = false, userIdFilter = null }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [userFilter, setUserFilter] = useState(userIdFilter || '');
  const [users, setUsers] = useState([]);

  const fetchLog = useCallback((off = 0, append = false) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (isAdmin && userFilter) params.set('user_id', userFilter);
    fetch(`/api/audit-log?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        const list = data.items || data || [];
        if (append) setItems(prev => [...prev, ...list]);
        else setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isAdmin, userFilter]);

  useEffect(() => {
    setLoading(true);
    fetchLog(0, false);
  }, [fetchLog]);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [isAdmin]);

  const loadMore = () => {
    const next = offset + LIMIT;
    setOffset(next);
    setLoading(true);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(next) });
    if (isAdmin && userFilter) params.set('user_id', userFilter);
    fetch(`/api/audit-log?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        const list = data.items || data || [];
        setItems(prev => [...prev, ...list]);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">操作日志</h3>
      {isAdmin && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">按用户：</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
          >
            <option value="">全部</option>
            {users.map(u => <option key={u.id} value={String(u.id)}>{u.username} (id: {u.id})</option>)}
          </select>
        </div>
      )}
      {loading && items.length === 0 ? (
        <div className="py-8 text-center text-gray-500">加载中...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">时间</th>
                    {isAdmin && <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">用户</th>}
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">操作</th>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">资源</th>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {items.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-gray-500">暂无记录</td></tr>
                  ) : (
                    items.map((log) => (
                      <tr key={log.id} className="text-gray-700 dark:text-gray-300">
                        <td className="px-3 py-2 whitespace-nowrap">{log.created_at || '-'}</td>
                        {isAdmin && <td className="px-3 py-2">{log.username ? `${log.username} (${log.user_id})` : (log.user_id ?? '-')}</td>}
                      <td className="px-3 py-2">{log.action || '-'}</td>
                      <td className="px-3 py-2">{log.resource_type && log.resource_id ? `${log.resource_type}#${log.resource_id}` : '-'}</td>
                      <td className="px-3 py-2 max-w-xs truncate" title={log.detail}>{log.detail || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {items.length >= LIMIT && (
            <button type="button" onClick={loadMore} disabled={loading} className="text-sm theme-link disabled:opacity-50">加载更多</button>
          )}
        </>
      )}
    </div>
  );
}
