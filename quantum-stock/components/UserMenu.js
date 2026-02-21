
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { User, LogOut, Settings } from 'lucide-react';

export default function UserMenu({ session }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('Backend logout error:', e);
    }
    signOut({ callbackUrl: '/' });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <div className="relative user-menu-container">
      <button 
        className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 transition-all duration-300 hover:shadow-md"
        onClick={() => setUserMenuOpen(!userMenuOpen)}
      >
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center border-2 border-indigo-200">
          <User className="h-5 w-5 text-indigo-600" />
        </div>
        <span className="text-sm font-medium">{session.user.name}</span>
      </button>
      {userMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="py-2">
            <button className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors">
              <Settings className="h-4 w-4 text-slate-500" />
              用户设置
            </button>
            <button className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors">
              <User className="h-4 w-4 text-slate-500" />
              修改显示名称
            </button>
            <button className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors">
              <Settings className="h-4 w-4 text-slate-500" />
              修改显示图标
            </button>
            <hr className="my-1 border-slate-100" />
            <button 
              className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              注销
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
