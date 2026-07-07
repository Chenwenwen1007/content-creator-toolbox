import { Clock } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface PlaceholderToolProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * 占位工具组件
 * 用于展示尚未开发完成的工具，提示用户功能开发中
 */
export function PlaceholderTool({ icon: Icon, title, description }: PlaceholderToolProps) {
  return (
    <div className="bg-white rounded-lg shadow-card p-8 text-center animate-fade-in">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-100 flex items-center justify-center">
        <Icon size={28} className="text-ink-300" strokeWidth={1.5} />
      </div>
      <h3 className="font-serif text-xl font-semibold text-ink-900 mb-2">
        {title}
      </h3>
      <p className="text-ink-500 text-sm mb-4 max-w-sm mx-auto">
        {description}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brick/10 text-brick text-sm">
        <Clock size={14} strokeWidth={1.5} />
        功能开发中，敬请期待
      </div>
    </div>
  );
}
