import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDateTimeFormat } from './utils/useDateTimeFormat';

const statusLabel = (s) => {
  if (!s || s === 'pending') return { text: '待执行', color: 'text-gray-500' };
  if (s === 'running' || s === 'loading') return { text: '进行中', color: 'text-blue-600' };
  if (s === 'success' || s === 'done') return { text: '已完成', color: 'text-green-600' };
  if (s === 'error' || s === 'failed') return { text: '异常', color: 'text-red-600' };
  return { text: s, color: 'text-gray-600' };
};

const TaskStatus = () => {
  const navigate = useNavigate();
  const { formatDateTime } = useDateTimeFormat();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskRuns, setTaskRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetch('/api/companies?sort=last_updated', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRunsLoading(true);
    fetch('/api/task-status/detailed?limit=30', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTaskRuns(Array.isArray(data) ? data : []))
      .finally(() => setRunsLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">任务状态</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">查看各企业工商信息、相关新闻与社会评价任务的执行状态及最近更新时间</p>

      {/* 最近任务执行记录 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 px-4 py-3 border-b border-gray-200 dark:border-gray-600">最近任务执行记录</h2>
        {runsLoading ? (
          <div className="p-6 text-center text-gray-500">加载中…</div>
        ) : taskRuns.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">暂无执行记录（进行过「大模型搜索相关新闻」等操作后会在此显示）</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">类型</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">企业</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">状态</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">说明</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">开始</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">结束</th>
                </tr>
              </thead>
              <tbody>
                {taskRuns.map((run) => {
                  const st = statusLabel(run.status);
                  return (
                    <tr key={run.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{run.task_type === 'news_search' ? '新闻搜索' : run.task_type || '-'}</td>
                      <td className="py-2 px-3">
                        {run.company_id ? <Link to={`/company/${run.company_id}`} className="theme-link">{run.company_name || run.company_id}</Link> : '-'}
                      </td>
                      <td className={`py-2 px-3 ${st.color}`}>{st.text}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">{run.message || '-'}</td>
                      <td className="py-2 px-3 text-gray-500">{run.started_at ? formatDateTime(run.started_at) : '-'}</td>
                      <td className="py-2 px-3 text-gray-500">{run.finished_at ? formatDateTime(run.finished_at) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 theme-spin border-transparent" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">企业名称</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">风险等级</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">工商信息</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">相关新闻</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">社会评价</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">最近更新</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">操作</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">暂无企业数据</td>
                </tr>
              ) : (
                companies.map(c => {
                  const llm = statusLabel(c.llm_status || c.crawl_status);
                  const news = statusLabel(c.news_status);
                  const media = statusLabel(c.media_status);
                  const time = c.last_updated ? formatDateTime(c.last_updated) : '—';
                  return (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2 px-4">
                        <Link to={`/company/${c.id}`} className="theme-link hover:underline font-medium">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          c.risk_level === '高' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          c.risk_level === '中' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {c.risk_level || '未知'}
                        </span>
                      </td>
                      <td className={`py-2 px-4 ${llm.color}`}>{llm.text}</td>
                      <td className={`py-2 px-4 ${news.color}`}>{news.text}</td>
                      <td className={`py-2 px-4 ${media.color}`}>{media.text}</td>
                      <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{time}</td>
                      <td className="py-2 px-4">
                        <Link to={`/company/${c.id}`} className="theme-link hover:underline text-xs">详情</Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TaskStatus;
