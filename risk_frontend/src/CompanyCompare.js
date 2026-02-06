import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FIELDS = [
  { key: 'name', label: '企业名称' },
  { key: 'industry', label: '行业' },
  { key: 'risk_level', label: '风险等级' },
  { key: 'legal_representative', label: '法定代表人' },
  { key: 'registered_capital', label: '注册资本' },
  { key: 'business_status', label: '经营状态' },
  { key: 'registered_address', label: '注册地址' },
  { key: 'established_date', label: '成立日期' },
  { key: 'business_scope', label: '经营范围' },
  { key: 'social_evaluation', label: '社会评价/舆情摘要' },
];

const CompanyCompare = () => {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([null, null, null]);
  const [details, setDetails] = useState([null, null, null]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetch('/api/companies', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setList(data))
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const fetchOne = (id) =>
      id ? fetch(`/api/companies/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null) : Promise.resolve(null);
    Promise.all(selectedIds.map(id => fetchOne(id))).then(setDetails);
  }, [selectedIds]);

  const setSelected = (colIndex, companyId) => {
    const next = [...selectedIds];
    next[colIndex] = companyId || null;
    setSelectedIds(next);
  };

  const companies = list;
  const selectedCompanies = selectedIds.map((id, i) => id ? list.find(c => c.id === id) : null);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">企业对比</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">选择 2～3 家企业并排对比关键信息</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[0, 1, 2].map(col => (
          <div key={col} className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 bg-white dark:bg-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">企业 {col + 1}</label>
            <select
              value={selectedIds[col] || ''}
              onChange={(e) => setSelected(col, e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">请选择</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="text-left py-3 px-4 w-36 text-gray-700 dark:text-gray-300 font-medium">对比项</th>
              {[0, 1, 2].map(col => (
                <th key={col} className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">
                  {selectedCompanies[col] ? selectedCompanies[col].name : `企业 ${col + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(({ key, label }) => (
              <tr key={key} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-2 px-4 text-gray-600 dark:text-gray-400 font-medium">{label}</td>
                {[0, 1, 2].map(col => {
                  const d = details[col];
                  const val = d && d[key] != null ? String(d[key]) : '—';
                  return (
                    <td key={col} className="py-2 px-4 text-gray-800 dark:text-gray-200 align-top max-w-xs">
                      <span className="break-words block">{val}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!details[0] && !details[1] && !details[2] && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">请在上方选择要对比的企业</p>
      )}
    </div>
  );
};

export default CompanyCompare;
