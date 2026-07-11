import { Link, useLocation } from 'react-router-dom';
import { Home, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * 全局布局组件
 * 包含顶部导航栏和主内容区
 */
export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-cream-200 sticky top-0 z-50">
        <div className="container xl:max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="柚米去水印" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-serif text-lg font-semibold text-ink-900">创作工具箱</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-amber-accent/10 text-amber-accent'
                  : 'text-ink-500 hover:text-ink-900 hover:bg-cream-100'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Home size={14} strokeWidth={1.5} />
                首页
              </span>
            </Link>
            <Link
              to="/settings"
              className={`p-2 rounded-md transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-amber-accent/10 text-amber-accent'
                  : 'text-ink-500 hover:text-ink-900 hover:bg-cream-100'
              }`}
              title="设置"
            >
              <Settings size={16} strokeWidth={1.5} />
            </Link>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="py-6 text-center text-sm text-ink-300 border-t border-cream-200 bg-white/50">
        仅供个人学习使用，请尊重原创版权
      </footer>
    </div>
  );
}
