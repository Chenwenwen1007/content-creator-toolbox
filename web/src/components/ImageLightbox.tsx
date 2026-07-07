import { useEffect } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
  downloadUrl?: string;
  copyUrl?: string;
}

/**
 * 图片预览 Lightbox 组件
 * 点击图片后放大展示，支持下载和复制链接
 */
export function ImageLightbox({ src, alt, onClose, downloadUrl, copyUrl }: ImageLightboxProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  /**
   * 复制图片链接到剪贴板
   */
  const handleCopy = async () => {
    if (!copyUrl) return;
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败不处理
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/90 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center
                   text-white hover:bg-white/20 transition-colors"
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      {/* 工具栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm
                       hover:bg-white/20 transition-colors"
          >
            <Download size={16} strokeWidth={1.5} />
            下载
          </a>
        )}
        {copyUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm
                       hover:bg-white/20 transition-colors"
          >
            {copied ? (
              <>
                <Check size={16} strokeWidth={1.5} />
                已复制
              </>
            ) : (
              <>
                <Copy size={16} strokeWidth={1.5} />
                复制链接
              </>
            )}
          </button>
        )}
      </div>

      {/* 图片 */}
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
