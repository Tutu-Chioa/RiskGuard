import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const PAGE_SIZE = 100;

const DbViewerPage = () => {
  const { role } = useAuth();
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [addSaving, setAddSaving] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const token = localStorage.getItem('token');
  const opts = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const optsJson = useCallback(() => ({
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }), [token]);

  useEffect(() => {
    if (role !== 'admin') return;
    setTablesLoading(true);
    fetch('/api/admin/db/tables', opts())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('无权限'))))
      .then((d) => setTables(d.tables || []))
      .catch((e) => { setError(e.message); setTables([]); })
      .finally(() => setTablesLoading(false));
  }, [role, opts]);

  const loadTable = useCallback((name, off = 0) => {
    if (!name) return;
    setTableLoading(true);
    setError('');
    fetch(`/api/admin/db/table/${encodeURIComponent(name)}?limit=${PAGE_SIZE}&offset=${off}`, opts())
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.message || r.statusText)));
        return r.json();
      })
      .then(setTableData)
      .catch((e) => { setError(e.message); setTableData(null); })
      .finally(() => setTableLoading(false));
  }, [opts]);

  useEffect(() => {
    if (selectedTable) {
      setOffset(0);
      loadTable(selectedTable, 0);
    } else {
      setTableData(null);
    }
  }, [selectedTable, loadTable]);

  const goToPage = (newOffset) => {
    if (!selectedTable || newOffset < 0) return;
    setOffset(newOffset);
    loadTable(selectedTable, newOffset);
  };

  const pkCol = tableData?.columns?.find((c) => c.pk)?.name;

  const handleOpenAdd = () => {
    const initial = {};
    tableData?.columns?.forEach((c) => { initial[c.name] = ''; });
    setAddForm(initial);
    setShowAddModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!selectedTable) return;
    setAddSaving(true);
    const row = {};
    tableData.columns.forEach((c) => {
      const v = addForm[c.name];
      if (v === '' || v == null) return;
      if (c.type && (c.type.toUpperCase().includes('INT'))) row[c.name] = parseInt(v, 10);
      else if (c.type && (c.type.toUpperCase().includes('REAL') || c.type.toUpperCase().includes('FLOAT'))) row[c.name] = parseFloat(v);
      else row[c.name] = String(v);
    });
    fetch(`/api/admin/db/table/${encodeURIComponent(selectedTable)}/row`, {
      method: 'POST',
      ...optsJson(),
      body: JSON.stringify({ row }),
    })
      .then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.message || r.statusText)))))
      .then(() => {
        setSuccessMsg('已插入');
        setShowAddModal(false);
        loadTable(selectedTable, offset);
      })
      .catch((e) => setError(e.message))
      .finally(() => setAddSaving(false));
  };

  const handleOpenEdit = (row) => {
    const initial = {};
    tableData.columns.forEach((c) => { initial[c.name] = row[c.name] != null ? String(row[c.name]) : ''; });
    setEditForm(initial);
    setEditRow(row);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedTable || !editRow || !pkCol) return;
    const pkVal = editRow[pkCol];
    if (pkVal == null) return;
    setEditSaving(true);
    const row = {};
    tableData.columns.forEach((c) => {
      if (c.name === pkCol) return;
      const v = editForm[c.name];
      if (v === '' || v == null) { row[c.name] = null; return; }
      if (c.type && c.type.toUpperCase().includes('INT')) row[c.name] = parseInt(v, 10);
      else if (c.type && (c.type.toUpperCase().includes('REAL') || c.type.toUpperCase().includes('FLOAT'))) row[c.name] = parseFloat(v);
      else row[c.name] = String(v);
    });
    fetch(`/api/admin/db/table/${encodeURIComponent(selectedTable)}/row`, {
      method: 'PUT',
      ...optsJson(),
      body: JSON.stringify({ id: pkVal, [pkCol]: pkVal, row }),
    })
      .then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.message || r.statusText)))))
      .then(() => {
        setSuccessMsg('已更新');
        setEditRow(null);
        loadTable(selectedTable, offset);
      })
      .catch((e) => setError(e.message))
      .finally(() => setEditSaving(false));
  };

  const handleDelete = (row) => {
    setDeleteConfirm(row);
  };

  const handleDeleteConfirm = () => {
    if (!selectedTable || !deleteConfirm || !pkCol) return;
    const pkVal = deleteConfirm[pkCol];
    setDeleteSaving(true);
    fetch(`/api/admin/db/table/${encodeURIComponent(selectedTable)}/row`, {
      method: 'DELETE',
      ...optsJson(),
      body: JSON.stringify({ id: pkVal, [pkCol]: pkVal }),
    })
      .then((r) => r.json().then((d) => (r.ok ? d : Promise.reject(new Error(d.message || r.statusText)))))
      .then(() => {
        setSuccessMsg('已删除');
        setDeleteConfirm(null);
        loadTable(selectedTable, offset);
      })
      .catch((e) => setError(e.message))
      .finally(() => setDeleteSaving(false));
  };

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  if (role !== 'admin') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200">仅管理员可访问数据库查看页。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">数据库查看</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          支持增删改查，仅管理员可用。数据每页最多 {PAGE_SIZE} 条。有主键的表可编辑、删除行。
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 表列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">
            表名
          </div>
          <div className="max-h-96 overflow-y-auto">
            {tablesLoading ? (
              <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">加载中…</div>
            ) : tables.length === 0 ? (
              <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">暂无表</div>
            ) : (
              tables.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTable(t)}
                  className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700/80 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedTable === t
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 表数据 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100 flex items-center justify-between flex-wrap gap-2">
            <span>{selectedTable ? `表：${selectedTable}` : '选择左侧表查看数据'}</span>
            <div className="flex items-center gap-2">
              {tableData && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  共 {tableData.total} 条 · 当前第 {offset + 1}–{offset + tableData.rows.length} 条
                </span>
              )}
              {tableData && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  新增
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {!selectedTable && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                在左侧点击表名加载数据
              </div>
            )}
            {selectedTable && tableLoading && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">加载中…</div>
            )}
            {selectedTable && !tableLoading && tableData && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        {tableData.columns.map((col) => (
                          <th
                            key={col.name}
                            className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 whitespace-nowrap"
                          >
                            {col.name}
                            {col.pk && <span className="text-indigo-600 dark:text-indigo-400 ml-0.5">(主键)</span>}
                            <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">({col.type})</span>
                          </th>
                        ))}
                        {pkCol && <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-600 w-24">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={tableData.columns.length + (pkCol ? 1 : 0)}
                            className="px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                          >
                            无数据，可点击「新增」插入
                          </td>
                        </tr>
                      ) : (
                        tableData.rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                          >
                            {tableData.columns.map((col) => (
                              <td
                                key={col.name}
                                className="px-3 py-2 text-gray-800 dark:text-gray-200 max-w-xs truncate"
                                title={row[col.name] != null ? String(row[col.name]) : ''}
                              >
                                {row[col.name] == null ? (
                                  <span className="text-gray-400">NULL</span>
                                ) : (
                                  String(row[col.name])
                                )}
                              </td>
                            ))}
                            {pkCol && (
                              <td className="px-3 py-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(row)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline mr-2"
                                >
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  className="text-red-600 dark:text-red-400 hover:underline"
                                >
                                  删除
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {tableData.total > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                    <button
                      type="button"
                      onClick={() => goToPage(offset - PAGE_SIZE)}
                      disabled={offset <= 0}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      上一页
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.floor(offset / PAGE_SIZE) + 1} / {Math.ceil(tableData.total / PAGE_SIZE) || 1} 页
                    </span>
                    <button
                      type="button"
                      onClick={() => goToPage(offset + PAGE_SIZE)}
                      disabled={offset + tableData.rows.length >= tableData.total}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 新增弹窗 */}
      {showAddModal && tableData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">
              新增行 · {selectedTable}
            </div>
            <form onSubmit={handleAddSubmit} className="p-4 space-y-3">
              {tableData.columns.map((col) => (
                <div key={col.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {col.name} <span className="text-gray-400">({col.type})</span>
                  </label>
                  <input
                    type="text"
                    value={addForm[col.name] ?? ''}
                    onChange={(e) => setAddForm((f) => ({ ...f, [col.name]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder={col.pk ? '留空则自增' : ''}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                >
                  {addSaving ? '提交中…' : '插入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editRow && tableData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">
              编辑行 · {selectedTable}
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 space-y-3">
              {tableData.columns.map((col) => (
                <div key={col.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {col.name} {col.pk && <span className="text-gray-400">(主键，只读)</span>}
                  </label>
                  <input
                    type="text"
                    readOnly={!!col.pk}
                    value={editForm[col.name] ?? ''}
                    onChange={(e) => !col.pk && setEditForm((f) => ({ ...f, [col.name]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-70"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRow(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                >
                  {editSaving ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
            <p className="text-gray-800 dark:text-gray-100 font-medium mb-2">确认删除该行？</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              主键：{pkCol}={String(deleteConfirm[pkCol])}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSaving}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50"
              >
                {deleteSaving ? '删除中…' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DbViewerPage;
