import { LucideIcon } from 'lucide-react';

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  status: 'available' | 'coming-soon' | 'beta';
  isActive: boolean;
  onClick: () => void;
  delay?: number;
}

/**
 * 工具卡片组件
 * 用于首页展示各个工具的入口卡片
 */
export function ToolCard({
  icon: Icon,
  title,
  description,
  status,
  isActive,
  onClick,
  delay = 0,
}: ToolCardProps) {
  const statusStyles: Record<string, string> = {
    available: 'bg-moss/10 text-moss',
    'coming-soon': 'bg-brick/10 text-brick',
    beta: 'bg-amber-100 text-amber-700',
  };

  const statusLabels: Record<string, string> = {
    available: '可用',
    'coming-soon': '开发中',
    beta: '开发中',
  };

  return (
    <button
      onClick={onClick}
      disabled={status === 'coming-soon'}
      style={{ animationDelay: `${delay}ms` }}
      className={`
        w-full text-left p-6 rounded-lg bg-white shadow-card
        transition-all duration-300 opacity-0 animate-fade-in-up
        ${isActive ? 'ring-2 ring-amber-accent shadow-card-hover -translate-y-0.5' : ''}
        ${status === 'coming-soon' ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`
          w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
          ${isActive ? 'bg-amber-accent text-white' : 'bg-cream-200 text-ink-900'}
          transition-colors duration-300
        `}>
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif text-lg font-semibold text-ink-900">
              {title}
            </h3>
            <span className={`
              text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap
              ${statusStyles[status]}
            `}>
              {statusLabels[status]}
            </span>
          </div>
          <p className="text-sm text-ink-500 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
