import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

export default function TestPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // 在客户端检查登录状态并重定向
  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, router]);

  // 如果未登录，显示加载状态
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 导航栏 */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">Quantum Stock</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{session.user.name}</span>
              <button 
                className="p-2 rounded-full hover:bg-muted transition-colors"
                onClick={() => router.push('/')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">测试页面</h1>
            <p className="text-muted-foreground">这是一个测试页面，用于验证导航功能</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <p className="text-lg">测试页面加载成功！</p>
            <p className="text-muted-foreground mt-2">如果您能看到这个页面，说明导航功能正常。</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}