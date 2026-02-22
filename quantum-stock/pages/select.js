
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Calendar, Play, Loader2, Sparkles, CheckCircle, AlertCircle, Trash2, AlertTriangle, History, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import Layout from '../components/Layout';
import { getAuthHeaders } from '../utils/api';

export default function SelectPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    selectText: ''
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const [executeDates, setExecuteDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);

  const [selectLogs, setSelectLogs] = useState([]);
  const [deleteLogs, setDeleteLogs] = useState([]);
  const [selectLogsExpanded, setSelectLogsExpanded] = useState(true);
  const [deleteLogsExpanded, setDeleteLogsExpanded] = useState(true);
  const [textError, setTextError] = useState('');

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    } else if (session.user?.role !== 'admin') {
      router.push('/search');
    }
  }, [session, router]);

  useEffect(() => {
    if (session) {
      loadExecuteDates();
      loadLogs();
    }
  }, [session]);

  const loadLogs = async () => {
    try {
      const selectRes = await fetch('/api/logs?task_name=选股&limit=5');
      const selectData = await selectRes.json();
      setSelectLogs(selectData.items || []);
      
      const deleteRes = await fetch('/api/logs?task_name=删除&limit=5');
      const deleteData = await deleteRes.json();
      setDeleteLogs(deleteData.items || []);
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  };

  const loadExecuteDates = async () => {
    try {
      const response = await fetch('/api/manage/execute_dates');
      const data = await response.json();
      setExecuteDates(data.items || []);
    } catch (error) {
      console.error('加载执行日期失败:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedDate) return;
    
    if (!confirm(`确定要删除 ${selectedDate} 的选股数据吗？此操作不可恢复！`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const response = await fetch(`/api/manage/stock_selected?execute_id=${encodeURIComponent(selectedDate)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (response.ok) {
        setDeleteResult({ success: true, message: `成功删除 ${data.deleted} 条记录` });
        loadExecuteDates();
        loadLogs();
      } else {
        setDeleteResult({ success: false, message: data.detail || '删除失败' });
      }
    } catch (error) {
      setDeleteResult({ success: false, message: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!session) {
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'selectText' && value.length > 20) {
      setTextError('选股说明不能超过20个字符');
      return;
    }
    if (name === 'selectText') {
      setTextError('');
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (textError) {
      return;
    }
    
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/tasks/select_stock`, {
        method: 'POST',
        headers: getAuthHeaders(session),
        body: JSON.stringify({
          start_date: formData.startDate,
          end_date: formData.endDate,
          select_text: formData.selectText
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setExecutionResult({
          success: true,
          message: '选股执行成功',
          details: {
            stocksSelected: result.stocks_selected || 0,
            startTime: new Date().toLocaleString(),
            endTime: new Date(Date.now() + 5000).toLocaleString(),
            dateRange: `${formData.startDate} 至 ${formData.endDate}`
          }
        });
        loadExecuteDates();
        loadLogs();
      } else {
        throw new Error(result.error || '选股执行失败');
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        message: '选股执行失败',
        error: error.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Layout 
      headerIcon="bar" 
      breadcrumbItems={[{ label: 'AI选股' }]}
    >
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI选股
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">股票池添加</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div>
                <label htmlFor="startDate" className="block text-sm font-semibold text-slate-700 mb-2">
                  交易日期（Start）
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all duration-200 hover:border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-semibold text-slate-700 mb-2">
                  交易日期（End）
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all duration-200 hover:border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="selectText" className="block text-sm font-semibold text-slate-700 mb-2">
                  选股说明
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="selectText"
                    name="selectText"
                    maxLength={20}
                    value={formData.selectText}
                    onChange={handleInputChange}
                    placeholder="最多20字"
                    className="block w-full pl-3 pr-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all duration-200 hover:border-slate-300"
                  />
                </div>
                {textError && (
                  <p className="text-red-500 text-xs mt-1">{textError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 opacity-0">
                  执行按钮
                </label>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isExecuting ? '执行中...' : '执行选股'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-medium text-slate-500">执行选股历史记录</h2>
            </div>
            <button
              onClick={() => setSelectLogsExpanded(!selectLogsExpanded)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {selectLogsExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>
          </div>
          {selectLogsExpanded && (
            <>
              {selectLogs.length > 0 ? (
                <div className="space-y-2">
                  {selectLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 
                          log.status === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-sm text-slate-600">{log.message}</span>
                      </div>
                      <span className="text-xs text-slate-400">{log.execute_time ? log.execute_time.replace('T', ' ') : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">暂无执行记录</p>
              )}
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">股票池管理</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="executeDate" className="block text-sm font-semibold text-slate-700 mb-2">
                选股ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  id="executeDate"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm transition-all duration-200 bg-white"
                >
                  <option value="">请选择选股ID</option>
                  {executeDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 opacity-0">
                删除按钮
              </label>
              <button
                onClick={handleDelete}
                disabled={!selectedDate || isDeleting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeleting ? '删除中...' : '删除数据'}
              </button>
            </div>
          </div>

          {executeDates.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-yellow-700 text-sm">暂无选股数据，请先执行选股</p>
            </div>
          )}

          {deleteResult && (
            <div className={`mt-4 p-4 rounded-xl ${deleteResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {deleteResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={deleteResult.success ? 'text-green-700' : 'text-red-700'}>
                  {deleteResult.message}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700 text-sm">删除操作将永久删除选股数据，此操作不可恢复，请谨慎操作！</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-red-600" />
              <h2 className="text-sm font-medium text-slate-500">删除操作历史记录</h2>
            </div>
            <button
              onClick={() => setDeleteLogsExpanded(!deleteLogsExpanded)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {deleteLogsExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>
          </div>
          {deleteLogsExpanded && (
            <>
              {deleteLogs.length > 0 ? (
                <div className="space-y-2">
                  {deleteLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 
                          log.status === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-sm text-slate-600">{log.message}</span>
                      </div>
                      <span className="text-xs text-slate-400">{log.execute_time ? log.execute_time.replace('T', ' ') : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">暂无删除记录</p>
              )}
            </>
          )}
        </div>

        {executionResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 ${executionResult.success ? 'border-2 border-green-200' : 'border-2 border-red-200'}`}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${executionResult.success ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-500 to-orange-500'}`}>
                    {executionResult.success ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <h3 className={`text-lg font-semibold ${executionResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {executionResult.message}
                  </h3>
                </div>
                <button
                  onClick={() => setExecutionResult(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6">
                {executionResult.success ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">选中股票数量</span>
                      <span className="font-medium text-slate-800">{executionResult.details.stocksSelected} 只</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">执行时间</span>
                      <span className="text-sm text-slate-700">{executionResult.details.startTime}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500 text-sm">数据范围</span>
                      <span className="text-sm text-slate-700">{executionResult.details.dateRange}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-600">{executionResult.error}</p>
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setExecutionResult(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    关闭
                  </button>
                  {executionResult.success && (
                    <button
                      onClick={() => {
                        setExecutionResult(null);
                        router.push('/search');
                      }}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-colors font-medium"
                    >
                      查看结果
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
