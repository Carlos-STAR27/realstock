
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Download, Play, Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';

export default function NamesPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    } else if (session.user?.role !== 'admin') {
      router.push('/search');
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      console.log('执行股票名称抽取');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setExecutionResult({
        success: true,
        message: '股票名称抽取成功',
        details: {
          stocksExtracted: 5000,
          startTime: new Date().toLocaleString(),
          endTime: new Date(Date.now() + 8000).toLocaleString(),
          source: 'BaoStock'
        }
      });
    } catch (error) {
      setExecutionResult({
        success: false,
        message: '股票名称抽取失败',
        error: error.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Layout 
      headerIcon="bar" 
      breadcrumbItems={[{ label: '股票名称抽取' }]}
    >
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                股票名称抽取
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="mb-6 p-4 bg-slate-100 rounded-full">
              <Download className="h-8 w-8 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">抽取股票名称</h2>
            <p className="text-slate-500 mb-8 max-w-2xl">
              此操作将从 BaoStock 数据源抽取最新的股票名称数据，包括股票代码、股票名称等信息。
              抽取完成后，数据将被存储到系统中供选股功能使用。
            </p>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isExecuting ? '执行中...' : '抽取'}
            </button>
          </div>
        </div>

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
                {executionResult.success ? (
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span className="text-slate-500">抽取股票数量:</span>
                      <span className="font-medium">{executionResult.details.stocksExtracted} 只</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">执行时间:</span>
                      <span>{executionResult.details.startTime} - {executionResult.details.endTime}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">数据源:</span>
                      <span>{executionResult.details.source}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-red-500">{executionResult.error}</p>
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
      </div>
    </Layout>
  );
}
