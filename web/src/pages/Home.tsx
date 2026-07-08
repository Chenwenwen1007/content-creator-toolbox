import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { categories, tools, searchTools } from '../data/tools';
import { cn } from '../lib/utils';

/**
 * 首页组件
 * 顶部大搜索框 + 分类卡片 + 工具列表
 */
export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const searchResults = useMemo(() => {
    return searchTools(searchQuery);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const handleToolClick = (path: string) => {
    navigate(path);
  };

  const categoryColors: Record<string, string> = {
    amber: 'from-amber-accent/20 to-amber-accent/5 border-amber-accent/20 text-amber-dark',
    moss: 'from-moss/20 to-moss/5 border-moss/20 text-moss',
  };

  return (
    <div className="min-h-screen">
      {/* Hero 搜索区域 */}
      <section className="pt-16 pb-12 px-4 relative">
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-amber-accent/10 rounded-full blur-3xl"></div>
          <div className="absolute top-32 right-1/4 w-48 h-48 bg-moss/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container xl:max-w-3xl relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-accent/10 text-amber-accent text-sm font-medium mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <Sparkles size={14} strokeWidth={1.5} />
              创作工具箱
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-ink-900 mb-4 leading-tight opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              一站式<span className="text-amber-accent">创作辅助</span>工具集
            </h1>
            <p className="text-ink-500 text-base md:text-lg max-w-xl mx-auto leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              短视频去水印、文案提取、图片处理，多种工具，开箱即用
            </p>
          </div>

          {/* 搜索框 */}
          <div className="relative max-w-2xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索工具，如：解析、压缩、九宫格..."
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-white shadow-card border border-cream-200
                           text-ink-900 placeholder-ink-300 text-base
                           focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                           transition-all"
                autoFocus
              />
            </div>

            {/* 搜索结果下拉 */}
            {isSearching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-card-hover border border-cream-200 z-50 max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="p-2">
                    <p className="text-xs text-ink-300 px-3 py-2">找到 {searchResults.length} 个工具</p>
                    {searchResults.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.path)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-cream-50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-cream-100 flex items-center justify-center flex-shrink-0">
                          <tool.icon size={20} className="text-ink-700" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink-900">{tool.name}</span>
                            <span className="text-xs text-ink-300">{tool.category}</span>
                          </div>
                          <p className="text-sm text-ink-500 truncate">{tool.description}</p>
                        </div>
                        <ArrowRight size={16} className="text-ink-300 flex-shrink-0" strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-ink-500">没有找到相关工具</p>
                    <p className="text-sm text-ink-300 mt-1">换个关键词试试</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 分类卡片 + 工具列表 */}
      {!isSearching && (
        <section className="pb-16 px-4">
          <div className="container xl:max-w-5xl space-y-12">
            {categories.map((category, catIndex) => {
              const categoryTools = tools.filter((t) => t.categoryId === category.id);
              const ColorIcon = category.icon;
              return (
                <div key={category.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${400 + catIndex * 100}ms` }}>
                  {/* 分类标题 */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
                      categoryColors[category.color] || categoryColors.amber
                    )}>
                      <ColorIcon size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="font-serif text-xl font-semibold text-ink-900">{category.name}</h2>
                      <p className="text-sm text-ink-500">{category.description}</p>
                    </div>
                  </div>

                  {/* 工具卡片网格 */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTools.map((tool, toolIndex) => {
                      const ToolIcon = tool.icon;
                      return (
                        <Link
                          key={tool.id}
                          to={tool.path}
                          className="group relative p-5 rounded-xl bg-white shadow-card border border-cream-100
                                     hover:shadow-card-hover hover:-translate-y-0.5 hover:border-amber-accent/20
                                     transition-all duration-300"
                          style={{ animationDelay: `${500 + catIndex * 100 + toolIndex * 50}ms` }}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-lg bg-cream-100 group-hover:bg-amber-accent/10 flex items-center justify-center flex-shrink-0 transition-colors">
                              <ToolIcon size={22} className="text-ink-700 group-hover:text-amber-accent transition-colors" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-ink-900 group-hover:text-amber-dark transition-colors">{tool.name}</h3>
                                {tool.status === 'coming-soon' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-brick/10 text-brick font-medium">
                                    开发中
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-ink-500 leading-relaxed line-clamp-2">{tool.description}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-ink-300">{tool.category}</span>
                            <ArrowRight size={16} className="text-ink-300 group-hover:text-amber-accent group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
