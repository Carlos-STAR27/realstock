
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { Calendar, Play, Loader2, Sparkles, CheckCircle, AlertCircle, Download, History, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import Layout from '../components/Layout';

export default function KlinePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: ''
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [executionLogs, setExecutionLogs] = useState([]);
  const logsEndRef = useRef(null);
  const dailyAbortControllerRef = useRef(null);
  
  // 日K线抽取弹窗相关状态
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyLogs, setDailyLogs] = useState([]);
  const dailyLogsEndRef = useRef(null);

  const [isExtractingNames, setIsExtractingNames] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  
  // 股票名称抽取弹窗相关状态
  const [showNamesModal, setShowNamesModal] = useState(false);
  const [namesModalLogs, setNamesModalLogs] = useState([]);
  const namesModalLogsEndRef = useRef(null);
  const namesAbortControllerRef = useRef(null);

  const [updateLogs, setUpdateLogs] = useState([]);
  const [namesLogs, setNamesLogs] = useState([]);
  const [updateLogsExpanded, setUpdateLogsExpanded] = useState(true);
  const [namesLogsExpanded, setNamesLogsExpanded] = useState(true);

  const [showMonthlyStats, setShowMonthlyStats] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showTushareButton, setShowTushareButton] = useState(false);
  const [isExtractingTushare, setIsExtractingTushare] = useState(false);
  const [tushareVerifyData, setTushareVerifyData] = useState(null);
  const tushareAbortControllerRef = useRef(null);
  
  // Tushare弹窗相关状态
  const [showTushareModal, setShowTushareModal] = useState(false);
  const [tushareLogs, setTushareLogs] = useState([]);
  const tushareLogsEndRef = useRef(null);

  // 自动滚动到日志底部
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);

  // 自动滚动Tushare弹窗日志到底部
  useEffect(() => {
    if (tushareLogsEndRef.current) {
      tushareLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tushareLogs]);

  // 自动滚动日K线抽取弹窗日志到底部
  useEffect(() => {
    if (dailyLogsEndRef.current) {
      dailyLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dailyLogs]);

  // 自动滚动股票名称抽取弹窗日志到底部
  useEffect(() => {
    if (namesModalLogsEndRef.current) {
      namesModalLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [namesModalLogs]);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    } else if (session.user?.role !== 'admin') {
      router.push('/search');
    }
  }, [session, router]);

  useEffect(() => {
    if (session) {
      loadLogs();
    }
  }, [session]);

  const loadLogs = async () => {
    try {
      const updateRes = await fetch('/api/logs?task_name=日K线抽取&limit=5');
      const updateData = await updateRes.json();
      setUpdateLogs(updateData.items || []);
      
      const namesRes = await fetch('/api/logs?task_name=股票名称抽取&limit=5');
      const namesData = await namesRes.json();
      setNamesLogs(namesData.items || []);
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  };

  const loadMonthlyStats = async () => {
    setIsLoadingStats(true);
    setTushareVerifyData(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      let url = `${API_URL}/api/stats/monthly_counts`;
      const params = new URLSearchParams();
      if (formData.startDate) {
        params.append('start_date', formData.startDate);
      }
      if (formData.endDate) {
        params.append('end_date', formData.endDate);
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }
      const res = await fetch(url);
      const data = await res.json();
      setMonthlyStats(data.items || []);
      setShowMonthlyStats(true);
      setShowTushareButton(true);
    } catch (error) {
      console.error('加载月度统计失败:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 辅助函数：生成某个月的所有日期
  const getDaysInMonth = (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate(); // 获取该月天数
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      days.push(`${year}-${month.toString().padStart(2, '0')}-${dayStr}`);
    }
    return days;
  };

  const loadTushareVerify = async () => {
    setIsExtractingTushare(true);
    setShowTushareModal(true);
    setTushareLogs([]);
    let outputText = '';
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // 创建新的AbortController
    tushareAbortControllerRef.current = new AbortController();
    
    // 从月度统计表中获取所有年月，并按从小到大排序
    const yearMonths = monthlyStats
      .map(item => item.year_month)
      .sort((a, b) => a.localeCompare(b)); // 从小到大排序
    
    if (yearMonths.length === 0) {
      outputText += '错误：没有可用的年月数据\n';
      setTushareLogs([{ type: 'output', message: outputText }]);
      setIsExtractingTushare(false);
      return;
    }
    
    // 找出最小年月和最大年月
    const minYearMonth = yearMonths[0];
    const maxYearMonth = yearMonths[yearMonths.length - 1];
    
    // 最小年月转换成该月第一天
    const [minYear, minMonth] = minYearMonth.split('-').map(Number);
    const startDate = `${minYear}-${minMonth.toString().padStart(2, '0')}-01`;
    
    // 最大年月转换成该月最后一天
    const [maxYear, maxMonth] = maxYearMonth.split('-').map(Number);
    const endDate = new Date(maxYear, maxMonth, 0).toISOString().split('T')[0];
    
    outputText += `开始按天获取Tushare数据\n`;
    outputText += `最小年月: ${minYearMonth} → ${startDate}\n`;
    outputText += `最大年月: ${maxYearMonth} → ${endDate}\n`;
    outputText += `日期范围: ${startDate} 到 ${endDate}\n`;
    outputText += '='.repeat(50) + '\n';
    setTushareLogs([{ type: 'output', message: outputText }]);
    
    // 存储按年月汇总的结果
    const monthlyCounts = {};
    
    try {
      // 构建URL
      let url = `${API_URL}/api/stats/tushare_verify`;
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      url += '?' + params.toString();
      
      const response = await fetch(url, {
        signal: tushareAbortControllerRef.current.signal
      });
      
      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line) {
            outputText += line + '\n';
            
            // 解析成功的数据条目
            const successMatch = line.match(/(\d{4}-\d{2}-\d{2}) 成功，共 (\d+) 条记录/);
            if (successMatch) {
              const date = successMatch[1];
              const count = parseInt(successMatch[2]);
              const yearMonth = date.substring(0, 7);
              
              if (!monthlyCounts[yearMonth]) {
                monthlyCounts[yearMonth] = 0;
              }
              monthlyCounts[yearMonth] += count;
            }
            
            // 检查是否执行完成
            if (line.includes('各月统计：') || line.includes('[RESULT_JSON_START]')) {
              continue;
            }
            
            setTushareLogs([{ type: 'output', message: outputText }]);
          }
        }
      }
      
      // 处理剩余缓冲
      if (buffer) {
        outputText += buffer + '\n';
        setTushareLogs([{ type: 'output', message: outputText }]);
      }
      
      // 更新表格数据 - 合并数据库和tushare数据
      const allResults = [];
      monthlyStats.forEach(dbItem => {
        const tushareCount = monthlyCounts[dbItem.year_month] || 0;
        const diff = tushareCount - dbItem.count;
        allResults.push({
          year_month: dbItem.year_month,
          db_count: dbItem.count,
          tushare_count: tushareCount,
          diff: diff
        });
      });
      
      if (allResults.length > 0) {
        setTushareVerifyData(allResults);
      }
      
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'AbortError') {
        console.log('Tushare数据抽取已取消');
        outputText += '\n[已取消]\n';
        setTushareLogs([{ type: 'output', message: outputText }]);
      } else {
        console.error('加载Tushare校验数据失败:', error);
        outputText += `\n[错误] ${error.message}\n`;
        setTushareLogs([{ type: 'output', message: outputText }]);
      }
    } finally {
      setIsExtractingTushare(false);
      tushareAbortControllerRef.current = null;
    }
  };
  
  // 关闭Tushare弹窗
  const closeTushareModal = async () => {
    // 1. 取消前端请求
    if (tushareAbortControllerRef.current) {
      tushareAbortControllerRef.current.abort();
      console.log('已取消Tushare数据抽取前端请求');
    }
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // 2. 调用后端API终止所有tushare相关进程
    try {
      const response = await fetch(`${API_URL}/api/process/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_type: 'tushare_verify' }),
        credentials: 'include'
      });
      const result = await response.json();
      console.log('后端进程终止结果:', result);
    } catch (error) {
      console.error('终止后端进程失败:', error);
    }
    
    // 3. 重置状态
    setIsExtractingTushare(false);
    tushareAbortControllerRef.current = null;
    setShowTushareModal(false);
    // 注意：不在这里清空tushareVerifyData，只有在折叠时才清空
  };

  if (!session) {
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 关闭日K线抽取弹窗
  const closeDailyModal = async () => {
    // 1. 取消前端请求
    if (dailyAbortControllerRef.current) {
      dailyAbortControllerRef.current.abort();
      console.log('已取消日K线抽取前端请求');
    }
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // 2. 调用后端API终止所有日K线相关进程
    try {
      const response = await fetch(`${API_URL}/api/process/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_type: 'daily_update' }),
        credentials: 'include'
      });
      const result = await response.json();
      console.log('后端进程终止结果:', result);
    } catch (error) {
      console.error('终止后端进程失败:', error);
    }
    
    // 3. 重置状态
    setIsExecuting(false);
    dailyAbortControllerRef.current = null;
    setShowDailyModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsExecuting(true);
    setExecutionResult(null);
    setDailyLogs([]);
    setShowDailyModal(true);
    let outputText = '';

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // 创建新的AbortController
    dailyAbortControllerRef.current = new AbortController();

    try {
      // 直接请求后端API，绕过Next.js代理（因为rewrites不支持流式响应）
      const response = await fetch(`${API_URL}/api/tasks/update_daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: formData.startDate,
          end_date: formData.endDate
        }),
        credentials: 'include',
        signal: dailyAbortControllerRef.current.signal
      });

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let success = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          if (line) {
            outputText += line + '\n';
            setDailyLogs([{ type: 'output', message: outputText }]);
            // 检查是否执行完成
            if (line.includes('[执行完成，返回码: 0]')) {
              success = true;
            }
          }
        }
      }

      // 处理剩余缓冲
      if (buffer) {
        outputText += buffer;
        setDailyLogs([{ type: 'output', message: outputText }]);
        if (buffer.includes('[执行完成，返回码: 0]')) {
          success = true;
        }
      }

      // 处理最终结果
      if (success) {
        setExecutionResult({
          success: true,
          message: '日K线抽取成功',
        });
        // 完成后自动刷新历史记录
        await loadLogs();
      } else {
        throw new Error('执行失败');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('日K线抽取已取消');
        outputText += '\n[已取消]\n';
        setDailyLogs([{ type: 'output', message: outputText }]);
      } else {
        setExecutionResult({
          success: false,
          message: '日K线抽取失败',
          error: error.message
        });
      }
    } finally {
      setIsExecuting(false);
      dailyAbortControllerRef.current = null;
    }
  };

  const handleExtractNames = async () => {
    setIsExtractingNames(true);
    setShowNamesModal(true);
    setNamesModalLogs([]);
    setExtractResult(null);
    let outputText = '';

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // 创建新的AbortController
    namesAbortControllerRef.current = new AbortController();

    try {
      // 直接请求后端API，绕过Next.js代理
      const response = await fetch(`${API_URL}/api/tasks/update_names`, {
        method: 'POST',
        credentials: 'include',
        signal: namesAbortControllerRef.current.signal
      });

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let success = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          if (line) {
            outputText += line + '\n';
            setNamesModalLogs([{ type: 'output', message: outputText }]);
            // 检查是否执行完成
            if (line.includes('[执行完成，返回码: 0]')) {
              success = true;
            }
          }
        }
      }

      // 处理剩余缓冲
      if (buffer) {
        outputText += buffer;
        setNamesModalLogs([{ type: 'output', message: outputText }]);
        if (buffer.includes('[执行完成，返回码: 0]')) {
          success = true;
        }
      }

      // 处理最终结果
      if (success) {
        setExtractResult({
          success: true,
          message: '股票名称抽取成功',
        });
        // 完成后自动刷新历史记录
        await loadLogs();
      } else {
        throw new Error('执行失败');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('股票名称抽取已取消');
        outputText += '\n[已取消]\n';
        setNamesModalLogs([{ type: 'output', message: outputText }]);
      } else {
        setExtractResult({
          success: false,
          message: '股票名称抽取失败',
          error: error.message
        });
      }
    } finally {
      setIsExtractingNames(false);
      namesAbortControllerRef.current = null;
    }
  };

  // 关闭股票名称抽取弹窗
  const closeNamesModal = async () => {
    // 1. 取消前端请求
    if (namesAbortControllerRef.current) {
      namesAbortControllerRef.current.abort();
      console.log('已取消股票名称抽取前端请求');
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // 2. 调用后端API终止所有股票名称相关进程
    try {
      const response = await fetch(`${API_URL}/api/process/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_type: 'names_update' }),
        credentials: 'include'
      });
      const result = await response.json();
      console.log('后端进程终止结果:', result);
    } catch (error) {
      console.error('终止后端进程失败:', error);
    }

    // 3. 重置状态
    setIsExtractingNames(false);
    namesAbortControllerRef.current = null;
    setShowNamesModal(false);
  };

  return (
    <Layout 
      headerIcon="bar" 
      breadcrumbItems={[{ label: '数据提取' }]}
    >
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                数据提取
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <line x1="4" y1="8" x2="4" y2="16" />
                <rect x="3" y="10" width="2" height="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="6" x2="12" y2="18" />
                <rect x="11" y="9" width="2" height="6" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="20" y1="7" x2="20" y2="17" />
                <rect x="19" y="8" width="2" height="6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">日K线</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
              <div>
                <label htmlFor="startDate" className="block text-sm font-semibold text-slate-700 mb-2">
                  交易日期（开始）
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
                  交易日期（结束）
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
                <label className="block text-sm font-semibold text-slate-700 mb-2 opacity-0">
                  执行按钮
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isExecuting}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
                  >
                    {isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isExecuting ? '执行中...' : '开始抽取'}
                  </button>
                  <button
                    type="button"
                    onClick={loadMonthlyStats}
                    disabled={isLoadingStats}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
                  >
                    {isLoadingStats ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    数据条目统计
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {showMonthlyStats && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-medium text-slate-500">月度数据条目统计</h2>
              </div>
              <div className="flex items-center gap-3">
                {showTushareButton && (
                  <button
                    onClick={loadTushareVerify}
                    disabled={isExtractingTushare}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium text-sm"
                  >
                    {isExtractingTushare ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isExtractingTushare ? '抽取中...' : '抽取tushare数据'}
                  </button>
                )}
                <button
                  onClick={async () => {
                    // 1. 取消前端请求
                    if (tushareAbortControllerRef.current) {
                      tushareAbortControllerRef.current.abort();
                      console.log('已取消Tushare数据抽取前端请求');
                    }
                    
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                    
                    // 2. 调用后端API终止所有tushare相关进程
                    try {
                      const response = await fetch(`${API_URL}/api/process/terminate`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ task_type: 'tushare_verify' }),
                        credentials: 'include'
                      });
                      const result = await response.json();
                      console.log('后端进程终止结果:', result);
                    } catch (error) {
                      console.error('终止后端进程失败:', error);
                    }
                    
                    // 3. 重置前端状态
                    setIsExtractingTushare(false);
                    setShowTushareModal(false);
                    setShowMonthlyStats(false);
                    setTushareVerifyData(null); // 折叠时清空tushare校验数据
                    tushareAbortControllerRef.current = null;
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronUp className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">年月</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">数据条目</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">tushare校验数</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">差异条目</th>
                  </tr>
                </thead>
                <tbody>
                  {tushareVerifyData ? (
                    tushareVerifyData.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-slate-100 hover:bg-slate-50 ${
                          item.diff !== 0 ? 'bg-red-50' : 'bg-green-50'
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-600">{item.year_month}</td>
                        <td className="py-2 px-3 text-right text-slate-800 font-medium">{item.db_count.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-800 font-medium">{item.tushare_count.toLocaleString()}</td>
                        <td className={`py-2 px-3 text-right font-bold ${
                          item.diff !== 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {item.diff !== 0 ? `-${Math.abs(item.diff).toLocaleString()}` : '0'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    monthlyStats.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600">{item.year_month}</td>
                        <td className="py-2 px-3 text-right text-slate-800 font-medium">{item.count.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {isExtractingTushare ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              加载中...
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {isExtractingTushare ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              加载中...
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-medium text-slate-500">日K线抽取历史记录</h2>
            </div>
            <button
              onClick={() => setUpdateLogsExpanded(!updateLogsExpanded)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {updateLogsExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>
          </div>
          {updateLogsExpanded && (
            <>
              {updateLogs.length > 0 ? (
                <div className="space-y-2">
                  {updateLogs.map((log, idx) => (
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
                <p className="text-sm text-slate-500">暂无抽取记录</p>
              )}
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">股票名称</h2>
          </div>
          <button
            onClick={handleExtractNames}
            disabled={isExtractingNames}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
          >
            {isExtractingNames ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExtractingNames ? '抽取中...' : '股票名称抽取'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-green-600" />
              <h2 className="text-sm font-medium text-slate-500">股票名称抽取历史记录</h2>
            </div>
            <button
              onClick={() => setNamesLogsExpanded(!namesLogsExpanded)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {namesLogsExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>
          </div>
          {namesLogsExpanded && (
            <>
              {namesLogs.length > 0 ? (
                <div className="space-y-2">
                  {namesLogs.map((log, idx) => (
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
                <p className="text-sm text-slate-500">暂无抽取记录</p>
              )}
            </>
          )}
        </div>

        {/* 实时执行日志显示 */}
        {(isExecuting || executionLogs.length > 0) && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                {isExecuting ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {isExecuting ? '正在抽取日K线数据...' : '抽取完成'}
                </h3>
                <p className="text-sm text-slate-500">
                  {isExecuting ? '请稍候，正在处理数据' : '数据已成功写入数据库'}
                </p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-indigo-100 rounded-xl p-4 text-sm text-slate-700 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
              {executionLogs[0]?.message || ''}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {executionResult && (
          <div className={`bg-white border rounded-2xl p-6 shadow-xl ${executionResult.success ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`mt-1 p-2 rounded-full ${executionResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {executionResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <h2 className={`text-lg font-semibold mb-2 ${executionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {executionResult.message}
                </h2>
                {executionResult.error && (
                  <p className="text-red-500 mb-4">{executionResult.error}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setExecutionResult(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Tushare数据抽取弹窗 */}
        {showTushareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    {isExtractingTushare ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Download className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {isExtractingTushare ? '正在抽取Tushare数据...' : 'Tushare数据抽取完成'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {isExtractingTushare ? '请稍候，正在处理数据' : '数据校验完成'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeTushareModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-500">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>

              {/* 弹窗内容 - 日志显示区域 */}
              <div className="flex-1 p-6 overflow-hidden">
                <div className="bg-slate-50 text-slate-800 rounded-xl p-4 text-sm font-mono overflow-x-auto overflow-y-auto max-h-[60vh] whitespace-pre-wrap leading-relaxed border border-slate-200">
                  {tushareLogs[0]?.message || '等待开始...'}
                  <div ref={tushareLogsEndRef} />
                </div>
              </div>

              {/* 弹窗底部 */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                {isExtractingTushare && (
                  <button
                    onClick={closeTushareModal}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    取消抽取
                  </button>
                )}
                <button
                  onClick={closeTushareModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  {isExtractingTushare ? '后台运行' : '关闭'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 日K线抽取弹窗 */}
        {showDailyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    {isExecuting ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Play className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {isExecuting ? '正在抽取日K线数据...' : '日K线抽取完成'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {isExecuting ? '请稍候，正在处理数据' : '数据已成功写入数据库'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDailyModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-500">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>

              {/* 弹窗内容 - 日志显示区域 */}
              <div className="flex-1 p-6 overflow-hidden">
                <div className="bg-slate-50 text-slate-800 rounded-xl p-4 text-sm font-mono overflow-x-auto overflow-y-auto max-h-[60vh] whitespace-pre-wrap leading-relaxed border border-slate-200">
                  {dailyLogs[0]?.message || '等待开始...'}
                  <div ref={dailyLogsEndRef} />
                </div>
              </div>

              {/* 弹窗底部 */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                {isExecuting && (
                  <button
                    onClick={closeDailyModal}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    取消抽取
                  </button>
                )}
                <button
                  onClick={closeDailyModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  {isExecuting ? '后台运行' : '关闭'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 股票名称抽取弹窗 */}
        {showNamesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    {isExtractingNames ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Download className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {isExtractingNames ? '正在抽取股票名称...' : '股票名称抽取完成'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {isExtractingNames ? '请稍候，正在处理数据' : '数据已成功写入数据库'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeNamesModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-500">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>

              {/* 弹窗内容 - 日志显示区域 */}
              <div className="flex-1 p-6 overflow-hidden">
                <div className="bg-slate-50 text-slate-800 rounded-xl p-4 text-sm font-mono overflow-x-auto overflow-y-auto max-h-[60vh] whitespace-pre-wrap leading-relaxed border border-slate-200">
                  {namesModalLogs[0]?.message || '等待开始...'}
                  <div ref={namesModalLogsEndRef} />
                </div>
              </div>

              {/* 弹窗底部 */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                {isExtractingNames && (
                  <button
                    onClick={closeNamesModal}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    取消抽取
                  </button>
                )}
                <button
                  onClick={closeNamesModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  {isExtractingNames ? '后台运行' : '关闭'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
