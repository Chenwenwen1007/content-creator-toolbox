import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { categories, tools } from '../data/tools';
import { cn } from '../lib/utils';

interface ToolLayoutProps {
  children: React.ReactNode;
  categoryId: string;
}

/**
 * 工具页面布局
 * 左侧分类导航 + 右侧内容区，带面包屑
 */
export function ToolLayout({ children, categoryId }: ToolLayoutProps) {
  const location = useLocation();
  const category = categories.find((c) => c.id === categoryId);
  const categoryTools = tools.filter((t) => t.categoryId === categoryId);

  return (
    <div className="py-8 px-4">
      <div className="container xl:max-w-5xl">
        {/* 面包屑 */}
        <div className="flex items-center gap-1 text-sm text-ink-500 mb-6">
          <Link to="/" className="flex items-center gap-1 hover:text-amber-accent transition-colors">
            <Home size={14} strokeWidth={1.5} />
            首页
          </Link>
          <ChevronRight size={14} strokeWidth={1.5} className="text-ink-300" />
          <span className="text-ink-900 font-medium">{category?.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧导航 */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-card border border-cream-100 p-3 sticky top-20">
              <p className="text-xs font-medium text-ink-300 px-3 py-2 uppercase tracking-wider">
                {category?.name}
              </p>
              <nav className="space-y-1">
                {categoryTools.map((tool) => {
                  const isActive = location.pathname === tool.path;
                  const ToolIcon = tool.icon;
                  return (
                    <Link
                      key={tool.id}
                      to={tool.path}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all",
                        isActive
                          ? "bg-amber-accent/10 text-amber-dark font-medium"
                          : "text-ink-700 hover:bg-cream-50 hover:text-ink-900"
                      )}
                    >
                      <ToolIcon size={16} strokeWidth={1.5} />
                      <span className="flex-1">{tool.name}</span>
                      {tool.status === 'coming-soon' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-brick/10 text-brick">
                          新
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
