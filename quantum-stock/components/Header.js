import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { Sparkles, BarChart3, Search, LogIn } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header({ icon = 'bar' }) {
  const { data: session } = useSession();
  const HeaderIconComponent = icon === 'search' ? Search : BarChart3;

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <HeaderIconComponent className="h-6 w-6 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Quantum Stock
                </h1>
                <p className="text-xs text-slate-500">智能选股系统</p>
              </div>
            </div>
          </Link>
          
          {session ? (
            <UserMenu session={session} />
          ) : (
            <button
              onClick={() => signIn()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium"
            >
              <LogIn className="h-4 w-4" />
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
