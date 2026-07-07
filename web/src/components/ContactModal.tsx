import { useState, useEffect } from 'react';
import { X, MessageCircle, Mail, QrCode, Copy, Check, Users } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 联系作者弹窗组件
 * 展示微信、微信群聊、邮箱联系方式，以及二维码图片
 */
export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showWechatQr, setShowWechatQr] = useState(false);
  const [showGroupQr, setShowGroupQr] = useState(false);

  const wechatId = 'xuandong__happy';
  const email = '211758384@qq.com';

  /**
   * 弹窗关闭时重置所有展开状态
   */
  useEffect(() => {
    if (!isOpen) {
      setShowWechatQr(false);
      setShowGroupQr(false);
      setCopied(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * 复制文本到剪贴板
   * @param text 要复制的文本
   * @param type 复制类型标识
   */
  const copyText = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // 复制失败静默处理
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
        {/* 头部 */}
        <div className="px-6 py-5 border-b border-cream-100 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-ink-900">联系作者</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-cream-100 transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-4">
          {/* 加入微信群聊 */}
          <div
            className="flex items-center gap-4 p-4 rounded-xl bg-green-50 hover:bg-green-100/60 transition-colors cursor-pointer group"
            onClick={() => setShowGroupQr(!showGroupQr)}
          >
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Users size={22} className="text-green-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-500">加入微信群聊</p>
              <p className="font-medium text-ink-900">交流分享，共同进步</p>
            </div>
            <QrCode size={18} className="text-ink-400" strokeWidth={1.5} />
          </div>

          {/* 微信群二维码 */}
          {showGroupQr && (
            <div className="p-4 rounded-xl bg-green-50 text-center animate-fade-in">
              <div className="w-48 h-48 mx-auto bg-white rounded-lg shadow-inner border border-green-200/50 flex items-center justify-center overflow-hidden">
                <img
                  src="/wechat-group-qr.png"
                  alt="微信群二维码"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-ink-400 text-sm">
                  <QrCode size={48} className="mx-auto mb-2 opacity-30" strokeWidth={1} />
                  <p>二维码加载失败</p>
                </div>
              </div>
              <p className="text-xs text-ink-400 mt-3 leading-relaxed">
                二维码过期可添加作者微信<br />或发送邮件提醒
              </p>
            </div>
          )}

          {/* 微信 */}
          <div
            className="flex items-center gap-4 p-4 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors cursor-pointer group"
            onClick={() => setShowWechatQr(!showWechatQr)}
          >
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <MessageCircle size={22} className="text-green-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-500">微信</p>
              <p className="font-medium text-ink-900 font-mono">{wechatId}</p>
            </div>
            <QrCode size={18} className="text-ink-400" strokeWidth={1.5} />
          </div>

          {/* 微信二维码 */}
          {showWechatQr && (
            <div className="p-4 rounded-xl bg-cream-50 text-center animate-fade-in">
              <div className="w-48 h-48 mx-auto bg-white rounded-lg shadow-inner border border-cream-200 flex items-center justify-center overflow-hidden">
                <img
                  src="/wechat-qr.png"
                  alt="微信二维码"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-ink-400 text-sm">
                  <QrCode size={48} className="mx-auto mb-2 opacity-30" strokeWidth={1} />
                  <p>请添加微信号：{wechatId}</p>
                </div>
              </div>
              <p className="text-xs text-ink-400 mt-3">长按识别二维码或搜索微信号添加</p>
            </div>
          )}

          {/* 邮箱 */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Mail size={22} className="text-blue-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-500">邮箱</p>
              <p className="font-medium text-ink-900 font-mono text-sm truncate">{email}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyText(email, 'email');
              }}
              className="p-2 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-white transition-colors"
            >
              {copied === 'email' ? (
                <Check size={16} className="text-moss" strokeWidth={2} />
              ) : (
                <Copy size={16} strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* 复制微信号按钮 */}
          <button
            onClick={() => copyText(wechatId, 'wechat')}
            className="w-full py-3 rounded-xl bg-amber-accent text-white font-medium text-sm
                       hover:bg-amber-dark transition-colors flex items-center justify-center gap-2"
          >
            {copied === 'wechat' ? (
              <>
                <Check size={16} strokeWidth={2} />
                已复制微信号
              </>
            ) : (
              <>
                <Copy size={16} strokeWidth={1.5} />
                复制微信号
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
