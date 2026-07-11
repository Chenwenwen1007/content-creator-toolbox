import { useState } from 'react';
import { Image, Download, Copy, Check, Loader2 } from 'lucide-react';
import { parseVideo, ParseResult, getCoverProxyUrl, reportToolUsage } from '../api/request';

/**
 * 封面保存工具组件
 * 从短视频链接中提取并下载高清封面图
 */
export function CoverSaver() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  /**
   * 处理获取封面按钮点击
   * 调用解析接口获取封面信息
   */
  const handleGetCover = async () => {
    if (!inputText.trim()) {
      setError('请输入分享链接或文案');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await parseVideo(inputText.trim());
      setResult(data);
      reportToolUsage('cover-save');
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取封面失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理粘贴操作
   * 从剪贴板读取内容并填充到输入框
   */
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch {
      // 剪贴板不可用时手动输入
    }
  };

  /**
   * 复制封面链接
   */
  const handleCopyUrl = async () => {
    if (!result || !result.cover_url) return;
    try {
      await navigator.clipboard.writeText(result.cover_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败不处理
    }
  };

  /**
   * 获取封面代理地址
   * 直接使用后端返回的 preview_cover_url
   */
  const getCoverUrl = () => {
    if (!result) return '';
    return getCoverProxyUrl(result.preview_cover_url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 输入区域 */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="粘贴抖音/快手/小红书分享链接或文案..."
            className="w-full h-28 px-4 py-3 rounded-lg border border-cream-300 bg-white
                       text-ink-900 placeholder-ink-300 resize-none
                       focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                       transition-all font-sans text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleGetCover();
              }
            }}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePaste}
            className="px-5 py-2.5 rounded-lg border border-cream-300 bg-white
                       text-ink-700 text-sm font-medium
                       hover:bg-cream-50 hover:border-ink-300
                       transition-all duration-200"
          >
            粘贴
          </button>
          <button
            onClick={handleGetCover}
            disabled={isLoading}
            className="flex-1 px-6 py-2.5 rounded-lg bg-amber-accent text-white
                       text-sm font-medium shadow-sm
                       hover:bg-amber-dark transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                获取中...
              </>
            ) : (
              <>
                <Image size={16} strokeWidth={1.5} />
                获取封面
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 rounded-lg bg-brick/10 border border-brick/20 text-brick text-sm">
          {error}
        </div>
      )}

      {/* 封面结果 */}
      {result && result.preview_cover_url && (
        <div className="bg-white rounded-lg shadow-card overflow-hidden animate-fade-in">
          {/* 标题信息 */}
          <div className="p-5 border-b border-cream-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-cream-200 text-ink-700 font-medium">
                {result.platform_label}
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink-900 leading-snug">
              {result.title}
            </h3>
            {result.author && (
              <p className="text-sm text-ink-500 mt-1">@{result.author}</p>
            )}
          </div>

          {/* 封面预览 */}
          <div className="p-5">
            <div className="relative rounded-lg overflow-hidden bg-cream-100">
              <img
                src={getCoverUrl()}
                alt={result.title}
                className="w-full h-auto max-h-[500px] object-contain mx-auto"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-5">
              <a
                href={getCoverUrl()}
                download={`${result.title || 'cover'}.jpg`}
                className="flex-1 px-6 py-2.5 rounded-lg bg-moss text-white
                           text-sm font-medium text-center
                           hover:bg-moss-light transition-all duration-200
                           flex items-center justify-center gap-2"
              >
                <Download size={16} strokeWidth={1.5} />
                下载封面
              </a>
              <button
                onClick={handleCopyUrl}
                className="px-5 py-2.5 rounded-lg border border-cream-300 bg-white
                           text-ink-700 text-sm font-medium
                           hover:bg-cream-50 transition-all duration-200
                           flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-moss" strokeWidth={1.5} />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={16} strokeWidth={1.5} />
                    复制链接
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
