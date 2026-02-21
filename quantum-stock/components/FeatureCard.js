
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function FeatureCard({ icon, title, description, href, gradient, delay = 0 }) {
  return (
    <Link href={href}>
      <div className="group cursor-pointer">
        <div className={`bg-white rounded-2xl p-6 border shadow-lg overflow-hidden`}>
          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
            {icon}
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
          <div className={`mt-4 flex items-center gap-1 text-sm font-medium text-slate-600`}>
            <span>开始使用</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
