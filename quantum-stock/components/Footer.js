
import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-white/80 backdrop-blur-lg mt-12">
      <div className="container py-8">
        <div className="text-center text-sm text-slate-500">
          <p className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            © {new Date().getFullYear()} Quantum Stock. 保留所有权利。
          </p>
        </div>
      </div>
    </footer>
  );
}
