
import { getSession, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Search, BarChart3, Database, Users, FileText, TrendingUp, Sparkles, Star, Eye } from 'lucide-react';
import Layout from '../components/Layout';
import FeatureCard from '../components/FeatureCard';

export default function Home({ session: serverSession }) {
  const { data: clientSession } = useSession();
  const session = clientSession || serverSession;
  const isAdmin = session?.user?.role === 'admin';

  const [stats, setStats] = useState({ stockCount: '0', yield: 'N/A', yieldPositive: true });

  useEffect(() => {
    if (session) {
      fetch('/api/stats/overview')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(err => console.error('Failed to load stats:', err));
    }
  }, [session]);

  return (
    <Layout headerIcon="bar">
      {session ? (
        <div>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-full mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">欢迎回来！</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              智能选股系统
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              让数据驱动投资决策，把握每一个市场机会
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            <FeatureCard
              icon={<Search className="h-7 w-7" />}
              title="黄金股池"
              description="根据条件查询选股结果、管理自选和观察股票"
              href="/search"
              gradient="from-blue-500 to-cyan-500"
              delay={0}
            />
            {isAdmin && (
              <>
                <FeatureCard
                  icon={<BarChart3 className="h-7 w-7" />}
                  title="AI选股"
                  description="运行选股算法生成结果"
                  href="/select"
                  gradient="from-purple-500 to-pink-500"
                  delay={0}
                />
                <FeatureCard
                  icon={<Database className="h-7 w-7" />}
                  title="数据提取"
                  description="日K线、股票名称"
                  href="/kline"
                  gradient="from-orange-500 to-yellow-500"
                  delay={0}
                />
                <FeatureCard
                  icon={<Users className="h-7 w-7" />}
                  title="用户管理"
                  description="创建、修改、显示、密码修改"
                  href="/users"
                  gradient="from-emerald-500 to-teal-500"
                  delay={0}
                />
                <FeatureCard
                  icon={<FileText className="h-7 w-7" />}
                  title="日志管理"
                  description="查看任务执行日志"
                  href="/logs"
                  gradient="from-rose-500 to-pink-500"
                  delay={0}
                />
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl p-8 border shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">数据概览</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard 
                title="选股池记录"
                value={stats.stockCount}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard 
                title="今日收益率"
                value={stats.yield}
                isPositive={stats.yieldPositive}
                gradient="from-green-500 to-emerald-500"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex">
                <Sparkles className="h-20 w-20 text-yellow-500" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              欢迎使用 Quantum Stock
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              智能选股系统，帮助您快速筛选优质股票，提升投资效率
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ title, value, gradient, isPositive }) {
  const getValueColor = () => {
    if (isPositive === undefined) return '';
    return isPositive ? 'text-red-600' : 'text-green-600';
  };
  
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border">
      <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
      <p className={`text-3xl font-bold ${getValueColor()}`}>
        {value}
      </p>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  return {
    props: { session },
  };
}
