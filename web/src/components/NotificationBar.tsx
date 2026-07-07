import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { ContactModal } from './ContactModal';

/**
 * 顶部通知栏组件
 * 展示滚动通知文字，点击弹出联系作者弹窗
 */
export function NotificationBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);

  if (!isVisible) return null;

  /**
   * 处理通知栏点击
   * 点击关闭按钮时不触发弹窗
   */
  const handleBarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-close-btn]')) return;
    setShowModal(true);
  };

  return (
    <>
      <div
        className="bg-amber-accent/10 border-b border-amber-accent/20 cursor-pointer hover:bg-amber-accent/15 transition-colors"
        onClick={handleBarClick}
      >
        <div className="container xl:max-w-5xl">
          <div className="h-9 flex items-center justify-center gap-3 px-4">
            <Bell size={14} className="text-amber-accent flex-shrink-0" strokeWidth={1.5} />
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap">
                <span className="text-sm text-amber-dark">
                  对网站有想法或需要添加新工具？点击此处联系作者，欢迎交流合作！
                </span>
              </div>
            </div>
            <button
              data-close-btn
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="p-1 rounded text-amber-dark/60 hover:text-amber-dark hover:bg-amber-accent/10 transition-colors flex-shrink-0"
              title="关闭通知"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* 联系弹窗 */}
      <ContactModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
