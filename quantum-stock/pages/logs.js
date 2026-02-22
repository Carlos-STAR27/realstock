import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { FileText, Filter, Search, CheckCircle, AlertCircle, XCircle, Info, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { getAuthHeaders } from '../utils/api';

export default function LogsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    task_name: '',
    start_date: '',
    end_date: '',
    status: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    task_names: [],
    dates: [],
    statuses: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    } else if (session.user?.role !== 'admin') {
      router.push('/search');
    }
  }, [session, router]);

  useEffect(() => {
    if (session) {
      loadFilterOptions();
      loadLogs();
    }
  }, [session]);

  const loadFilterOptions = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/logs/filters`, {
        headers: getAuthHeaders(session)
      });
      const data = await res.json();
      setFilterOptions(data);
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const params = new URLSearchParams();
      if (filters.task_name) params.append('task_name', filters.task_name);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', 100);

      const res = await fetch(`${API_URL}/api/logs/list?${params.toString()}`, {
        headers: getAuthHeaders(session)
      });
      const data = await res.json();
      setLogs(data.items || []);
    } catch (error) {
      console.error('加载日志失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除符合筛选条件的日志吗？此操作不可恢复！')) {
      return;
    }

    setIsDeleting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const params = new URLSearchParams();
      if (filters.task_name) params.append('task_name', filters.task_name);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.status) params.append('status', filters.status);

      const res = await fetch(`${API_URL}/api/logs?${params.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(session)
      });

      if (res.ok) {
        const result = await res.json();
        alert(`成功删除 ${result.deleted_count} 条日志`);
        loadLogs();
        loadFilterOptions();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除日志失败:', error);
      alert('删除日志失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status) => {
    const upperStatus = status ? status.toUpperCase() : '';
    if (upperStatus === 'SUCCESS') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (upperStatus === 'ERROR' || upperStatus === 'FAILED') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (upperStatus === 'WARNING') {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    return <Info className="h-4 w-4 text-slate-400" />;
  };

  const getStatusClass = (status) => {
    const upperStatus = status ? status.toUpperCase() : '';
    if (upperStatus === 'SUCCESS') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (upperStatus === 'ERROR' || upperStatus === 'FAILED') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (upperStatus === 'WARNING') {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (!session) {
    return null;
  }

  return (
    <Layout headerIcon="search" breadcrumbItems={[{ label: '日志管理' }]}>
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                日志管理
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-rose-600" />
            <h2 className="text-sm font-medium text-slate-500">筛选条件</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                任务类别
              </label>
              <select
                value={filters.task_name}
                onChange={(e) => setFilters({ ...filters, task_name: e.target.value })}
                className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              >
                <option value="">全部</option>
                {filterOptions.task_names.map((name, idx) => (
                  <option key={idx} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="block w-full px-2 py-1.5.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              >
                <option value="">全部</option>
                {filterOptions.statuses.map((status, idx) => (
                  <option key={idx} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadLogs}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium"
            >
              <Search className="h-4 w-4" />
              查询
            </button>
            <button
              onClick={() => {
                setFilters({ task_name: '', start_date: '', end_date: '', status: '' });
                loadLogs();
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              重置
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isDeleting ? (
                <span className="inline-block animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isDeleting ? '删除中...' : '删除'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-rose-600" />
              <h2 className="text-sm font-medium text-slate-500">日志列表</h2>
            </div>
            <span className="text-sm text-slate-500">共 {logs.length} 条记录</span>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">加载中...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无日志</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">任务类别</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">执行时间</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">状态</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">消息</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-800 font-medium">{log.task_name}</td>
                      <td className="py-2 px-3 text-slate-600">{log.execute_time}</td>
                      <td className="py-2 px-3">
                        <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ' + getStatusClass(log.status)}>
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-md truncate" title={log.message}>
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
