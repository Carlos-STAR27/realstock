
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Filter, Table, Download, Loader2, Sparkles, TrendingUp, Star, Eye } from 'lucide-react';
import Layout from '../components/Layout';
import { getAuthHeaders } from '../utils/api';

export default function SearchPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    executeId: '',
    stockCode: ''
  });

  const [searchResults, setSearchResults] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50
  });
  const [favoriteResults, setFavoriteResults] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50
  });
  const [observationResults, setObservationResults] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isObservationLoading, setIsObservationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executeDates, setExecuteDates] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, router]);

  useEffect(() => {
    const loadExecuteDates = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/api/manage/execute_dates`, {
          headers: getAuthHeaders(session)
        });
        if (response.ok) {
          const data = await response.json();
          setExecuteDates(data.items || []);
        }
      } catch (e) {
        console.error('Failed to load execute dates:', e);
      }
    };
    
    if (session) {
      loadExecuteDates();
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchFavoriteResults(1);
      fetchObservationResults(1);
    }
  }, [session]);
  
  const toggleFavorite = async (item) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/stock/toggle_favorite`, {
        method: 'POST',
        headers: getAuthHeaders(session),
        body: JSON.stringify({
          ts_code: item.ts_code,
          execute_id: item.execute_id
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(prev => ({
          ...prev,
          items: prev.items.map(i => 
            i.ts_code === item.ts_code && i.execute_id === item.execute_id
              ? { ...i, is_favorite: data.is_favorite }
              : i
          )
        }));
        setFavoriteResults(prev => ({
          ...prev,
          items: prev.items.map(i => 
            i.ts_code === item.ts_code && i.execute_id === item.execute_id
              ? { ...i, is_favorite: data.is_favorite }
              : i
          ).filter(i => i.is_favorite)
        }));
        fetchFavoriteResults(favoriteResults.page);
      }
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
  };
  
  const toggleObservation = async (item) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/stock/toggle_observation`, {
        method: 'POST',
        headers: getAuthHeaders(session),
        body: JSON.stringify({
          ts_code: item.ts_code,
          execute_id: item.execute_id
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(prev => ({
          ...prev,
          items: prev.items.map(i => 
            i.ts_code === item.ts_code && i.execute_id === item.execute_id
              ? { ...i, is_observation: data.is_observation }
              : i
          )
        }));
        setObservationResults(prev => ({
          ...prev,
          items: prev.items.map(i => 
            i.ts_code === item.ts_code && i.execute_id === item.execute_id
              ? { ...i, is_observation: data.is_observation }
              : i
          ).filter(i => i.is_observation)
        }));
        fetchObservationResults(observationResults.page);
      }
    } catch (e) {
      console.error('Failed to toggle observation:', e);
    }
  };

  const fetchFavoriteResults = async (page) => {
    setIsFavoriteLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', favoriteResults.pageSize);

      const response = await fetch(`${API_URL}/api/stock/favorite_list?${params.toString()}`, {
        headers: getAuthHeaders(session)
      });

      if (response.ok) {
        const data = await response.json();
        setFavoriteResults({
          items: data.items || [],
          total: data.total || 0,
          page,
          pageSize: favoriteResults.pageSize
        });
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const fetchObservationResults = async (page) => {
    setIsObservationLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', observationResults.pageSize);

      const response = await fetch(`${API_URL}/api/stock/observation_list?${params.toString()}`, {
        headers: getAuthHeaders(session)
      });

      if (response.ok) {
        const data = await response.json();
        setObservationResults({
          items: data.items || [],
          total: data.total || 0,
          page,
          pageSize: observationResults.pageSize
        });
      }
    } catch (err) {
      console.error('Failed to fetch observations:', err);
    } finally {
      setIsObservationLoading(false);
    }
  };

  const handleFavoritePageChange = (newPage) => {
    fetchFavoriteResults(newPage);
  };

  const handleObservationPageChange = (newPage) => {
    fetchObservationResults(newPage);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    fetchResults(1);
  };

  const fetchResults = async (page) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const params = new URLSearchParams();
      if (formData.stockCode) params.append('ts_code', formData.stockCode);
      if (formData.startDate) params.append('buy_date_start', formData.startDate);
      if (formData.endDate) params.append('buy_date_end', formData.endDate);
      if (formData.executeId) params.append('execute_id', formData.executeId);
      params.append('page', page);
      params.append('page_size', searchResults.pageSize);

      const response = await fetch(`${API_URL}/api/query/stock_selected?${params.toString()}`, {
        headers: getAuthHeaders(session)
      });

      if (!response.ok) {
        throw new Error('查询失败');
      }

      const data = await response.json();
      setSearchResults({
        items: data.items || [],
        total: data.total || 0,
        page,
        pageSize: searchResults.pageSize
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchResults(newPage);
  };

  const getPriceBgClass = (price) => {
    if (!price) return '';
    const p = Number(price);
    if (p > 100) return 'bg-red-50';
    if (p >= 50 && p <= 100) return 'bg-yellow-50';
    return '';
  };

  return (
    <Layout 
      headerIcon="search" 
      breadcrumbItems={[{ label: '黄金股池' }]}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                黄金股池
              </h1>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl"
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="executeId" className="block text-sm font-semibold text-slate-700 mb-2">
                  选股ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-4 w-4 text-slate-400" />
                  </div>
                  <select
                    id="executeId"
                    name="executeId"
                    value={formData.executeId}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all duration-200 hover:border-slate-300 bg-white"
                  >
                    <option value="">请选择</option>
                    {executeDates.map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-semibold text-slate-700 mb-2">
                  建议买入日期 (Start)
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
                  建议买入日期 (End)
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
                <label htmlFor="stockCode" className="block text-sm font-semibold text-slate-700 mb-2">
                  股票代码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="stockCode"
                    name="stockCode"
                    value={formData.stockCode}
                    onChange={handleInputChange}
                    placeholder="例如: 000001.SZ"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all duration-200 hover:border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 opacity-0">
                  查询按钮
                </label>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  查询
                </button>
              </div>
            </div>
          </form>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6"
          >
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Table className="h-4 w-4 text-white" />
              </div>
              黄金股池
            </h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              导出
            </button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-slate-500">正在加载数据...</p>
              </div>
            </div>
          )}

          {!isLoading && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        选股ID
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        建议买入日期
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        股票代码
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        股票名称
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        收盘价
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {searchResults.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="text-slate-400">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">暂无数据</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      searchResults.items.map((item, index) => {
                        const isSelected = selectedRow && selectedRow.ts_code === item.ts_code && selectedRow.execute_id === item.execute_id;
                        return (
                        <tr
                          key={index}
                          className={`cursor-pointer ${isSelected ? 'bg-cyan-100' : ''} hover:bg-slate-50`}
                          onClick={() => setSelectedRow(item)}
                        >
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-600">{item.execute_id}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-600">{item.buy_date}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm">
                            {(() => {
                              const [code, exchange] = item.ts_code.split('.');
                              const exchangeLower = exchange.toLowerCase();
                              const url = `https://finance.sina.com.cn/realstock/company/${exchangeLower}${code}/nc.shtml?display_code=${item.ts_code}`;
                              return (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium">
                                  {item.ts_code}
                                </a>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-700 font-medium">{item.stock_name}</td>
                          <td className={`px-2 py-1.5 whitespace-nowrap text-sm text-right font-mono ${getPriceBgClass(item.price_close)}`}>
                            {item.price_close ? Number(item.price_close).toFixed(2) : ''}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(item);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  item.is_favorite
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                {item.is_favorite ? '删除自选' : '加自选'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleObservation(item);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  item.is_observation
                                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {item.is_observation ? '删除观察' : '加观察'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {searchResults.total > 0 && (
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-sm text-slate-500">
                    显示 <span className="font-medium text-slate-700">{((searchResults.page - 1) * searchResults.pageSize + 1)}-
                    {Math.min(searchResults.page * searchResults.pageSize, searchResults.total)}</span> 条，共 <span className="font-medium text-slate-700">{searchResults.total}</span> 条
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                      disabled={searchResults.page <= 1}
                      onClick={() => handlePageChange(searchResults.page - 1)}
                    >
                      上一页
                    </button>
                    <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium">
                      {searchResults.page}
                    </button>
                    <button 
                      className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                      disabled={searchResults.page >= Math.ceil(searchResults.total / searchResults.pageSize)}
                      onClick={() => handlePageChange(searchResults.page + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Star className="h-4 w-4 text-white" />
              </div>
              自选股池
            </h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              导出
            </button>
          </div>

          {isFavoriteLoading && (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-yellow-600 mx-auto mb-4" />
                <p className="text-slate-500">正在加载数据...</p>
              </div>
            </div>
          )}

          {!isFavoriteLoading && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        选股ID
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        建议买入日期
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        股票代码
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        股票名称
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        收盘价
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {favoriteResults.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="text-slate-400">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">暂无数据</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      favoriteResults.items.map((item, index) => {
                        const isSelected = selectedRow && selectedRow.ts_code === item.ts_code && selectedRow.execute_id === item.execute_id;
                        return (
                        <tr
                          key={index}
                          className={`cursor-pointer ${isSelected ? 'bg-cyan-100' : ''} hover:bg-slate-50`}
                          onClick={() => setSelectedRow(item)}
                        >
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-600">{item.execute_id}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-600">{item.buy_date}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm">
                            {(() => {
                              const [code, exchange] = item.ts_code.split('.');
                              const exchangeLower = exchange.toLowerCase();
                              const url = `https://finance.sina.com.cn/realstock/company/${exchangeLower}${code}/nc.shtml?display_code=${item.ts_code}`;
                              return (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium">
                                  {item.ts_code}
                                </a>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-700 font-medium">{item.stock_name}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-right font-mono text-slate-600">
                            {item.price_close ? Number(item.price_close).toFixed(2) : ''}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                item.is_favorite
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {item.is_favorite ? '删除自选' : '加自选'}
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  显示 <span className="font-medium text-slate-700">{favoriteResults.total > 0 ? ((favoriteResults.page - 1) * favoriteResults.pageSize + 1) + '-' + Math.min(favoriteResults.page * favoriteResults.pageSize, favoriteResults.total) : '0-0'}</span> 条，共 <span className="font-medium text-slate-700">{favoriteResults.total}</span> 条
                </div>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    disabled={favoriteResults.page <= 1}
                    onClick={() => handleFavoritePageChange(favoriteResults.page - 1)}
                  >
                    上一页
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl text-sm font-medium">
                    {favoriteResults.page}
                  </button>
                  <button 
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    disabled={favoriteResults.page >= Math.ceil(favoriteResults.total / favoriteResults.pageSize) || favoriteResults.total === 0}
                    onClick={() => handleFavoritePageChange(favoriteResults.page + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Eye className="h-4 w-4 text-white" />
              </div>
              观察股池
            </h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              导出
            </button>
          </div>

          {isObservationLoading && (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                <p className="text-slate-500">正在加载数据...</p>
              </div>
            </div>
          )}

          {!isObservationLoading && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        选股ID
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        建议买入日期
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        股票代码
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        股票名称
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        收盘价
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {observationResults.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="text-slate-400">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">暂无数据</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      observationResults.items.map((item, index) => {
                        const isSelected = selectedRow && selectedRow.ts_code === item.ts_code && selectedRow.execute_id === item.execute_id;
                        return (
                        <tr
                          key={index}
                          className={`cursor-pointer ${isSelected ? 'bg-cyan-100' : ''} hover:bg-slate-50`}
                          onClick={() => setSelectedRow(item)}
                        >
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-600">{item.execute_id}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-600">{item.buy_date}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm">
                            {(() => {
                              const [code, exchange] = item.ts_code.split('.');
                              const exchangeLower = exchange.toLowerCase();
                              const url = `https://finance.sina.com.cn/realstock/company/${exchangeLower}${code}/nc.shtml?display_code=${item.ts_code}`;
                              return (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium">
                                  {item.ts_code}
                                </a>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-slate-700 font-medium">{item.stock_name}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-right font-mono text-slate-600">
                            {item.price_close ? Number(item.price_close).toFixed(2) : ''}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-sm text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleObservation(item);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                item.is_observation
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {item.is_observation ? '删除观察' : '加观察'}
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  显示 <span className="font-medium text-slate-700">{observationResults.total > 0 ? ((observationResults.page - 1) * observationResults.pageSize + 1) + '-' + Math.min(observationResults.page * observationResults.pageSize, observationResults.total) : '0-0'}</span> 条，共 <span className="font-medium text-slate-700">{observationResults.total}</span> 条
                </div>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    disabled={observationResults.page <= 1}
                    onClick={() => handleObservationPageChange(observationResults.page - 1)}
                  >
                    上一页
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium">
                    {observationResults.page}
                  </button>
                  <button 
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    disabled={observationResults.page >= Math.ceil(observationResults.total / observationResults.pageSize) || observationResults.total === 0}
                    onClick={() => handleObservationPageChange(observationResults.page + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </Layout>
  );
}
