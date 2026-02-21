
import Link from 'next/link';
import { Home as HomeIcon, ChevronRight } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="bg-white/50 backdrop-blur-sm border-b">
      <div className="container py-3">
        <div className="flex items-center text-sm text-slate-500">
          <Link href="/" className="flex items-center gap-1 hover:text-slate-700 transition-colors">
            <HomeIcon className="h-4 w-4" />
            <span>首页</span>
          </Link>
          {items.map((item, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1" />
              {item.href ? (
                <Link href={item.href} className="hover:text-slate-700 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-700 font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
