import { useState } from 'react';
import { MessageCircle, X, ChevronLeft } from 'lucide-react';
import { ContactModal } from './ContactModal';

/**
 * 右侧悬浮联系按钮组件
 * 默认只显示一个靠边的小按钮，点击后展开完整大小
 * 点击"联系我"弹出联系方式弹窗
 */
export function FloatingContact() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* 悬浮按钮 */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        {isExpanded ? (
          /* 展开状态 */
          <div className="bg-white shadow-xl rounded-l-2xl border border-r-0 border-cream-200 overflow-hidden animate-slide-in-right">
            <div className="p-4 w-44">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-ink-900 text-sm">联系作者</span>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-cream-100 transition-colors"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-xs text-ink-500 mb-4 leading-relaxed">
                有想法或建议？<br />欢迎联系我交流
              </p>
              <button
                onClick={() => {
                  setShowModal(true);
                  setIsExpanded(false);
                }}
                className="w-full py-2.5 rounded-lg bg-amber-accent text-white text-sm font-medium
                           hover:bg-amber-dark transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} strokeWidth={1.5} />
                联系我
              </button>
            </div>
          </div>
        ) : (
          /* 收起状态 - 只显示一个小按钮 */
          <button
            onClick={() => setIsExpanded(true)}
            className="bg-amber-accent text-white px-2 py-6 rounded-l-xl shadow-lg
                       hover:bg-amber-dark transition-all duration-200
                       flex flex-col items-center gap-1.5 group hover:pl-3"
          >
            <ChevronLeft size={16} strokeWidth={2} className="animate-pulse" />
            <MessageCircle size={18} strokeWidth={1.5} />
            <span className="text-xs font-medium writing-vertical">联系我</span>
          </button>
        )}
      </div>

      {/* 联系弹窗 */}
      <ContactModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
