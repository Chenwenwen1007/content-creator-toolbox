import { useState } from 'react';
import { Video, Download, Copy, Check, ChevronDown, ChevronUp, Loader2, ZoomIn } from 'lucide-react';
import { parseVideo, ParseResult } from '../api/request';
import { ImageLightbox } from './ImageLightbox';

/**
 * 短视频解析工具组件
 * 支持粘贴链接、解析、预览、下载无水印/有水印视频
 */
export function VideoParser() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isNoWatermark, setIsNoWatermark] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [coverHovered, setCoverHovered] = useState(false);
  const [coverCopied, setCoverCopied] = useState(false);

  /**
   * 处理解析按钮点击
   * 调用后端解析接口获取视频信息
   */
  const handleParse = async () => {
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
      setIsNoWatermark(data.no_watermark_verified);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请稍后重试');
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
   * 复制视频链接到剪贴板
   */
  const handleCopyUrl = async () => {
    if (!result) return;
    const url = isNoWatermark
      ? result.no_watermark_video_url || result.video_url
      : result.watermark_video_url || result.video_url;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败不处理
    }
  };

  /**
   * 复制封面链接到剪贴板
   */
  const handleCopyCoverUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.cover_url);
      setCoverCopied(true);
      setTimeout(() => setCoverCopied(false), 2000);
    } catch {
      // 复制失败不处理
    }
  };

  /**
   * 获取当前选择的视频预览地址
   */
  const getPreviewUrl = () => {
    if (!result) return '';
    if (isNoWatermark) {
      return result.no_watermark_preview_video_url || result.preview_video_url;
    }
    return result.watermark_preview_video_url || result.preview_video_url;
  };

  /**
   * 获取当前选择的视频下载地址
   */
  const getDownloadUrl = () => {
    if (!result) return '';
    if (isNoWatermark) {
      return result.no_watermark_download_url || result.download_url;
    }
    return result.watermark_download_url || result.download_url;
  };

  /**
   * 获取封面预览地址
   */
  const getCoverUrl = () => {
    if (!result) return '';
    return result.preview_cover_url || result.cover_url;
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
                handleParse();
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
            onClick={handleParse}
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
                解析中...
              </>
            ) : (
              <>
                <Video size={16} strokeWidth={1.5} />
                解析视频
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

      {/* 解析结果 */}
      {result && (
        <div className="bg-white rounded-lg shadow-card overflow-hidden animate-fade-in">
          {/* 平台标签和标题 */}
          <div className="p-5 border-b border-cream-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-cream-200 text-ink-700 font-medium">
                {result.platform_label}
              </span>
              {result.no_watermark_verified && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-moss/10 text-moss font-medium">
                  无水印
                </span>
              )}
              <span className="text-xs text-ink-300">
                来源：{result.parse_source === 'native' ? '官方解析' : result.parse_source === 'third_party' ? '第三方' : '兜底'}
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink-900 leading-snug">
              {result.title}
            </h3>
            {result.author && (
              <p className="text-sm text-ink-500 mt-1">@{result.author}</p>
            )}
          </div>

          {/* 视频预览和封面 */}
          <div className="p-5">
            <div className="grid md:grid-cols-2 gap-4">
              {/* 封面图 - 带悬停按钮 */}
              {result.cover_url && (
                <div
                  className="relative rounded-lg overflow-hidden bg-cream-100 aspect-video cursor-zoom-in group"
                  onMouseEnter={() => setCoverHovered(true)}
                  onMouseLeave={() => setCoverHovered(false)}
                  onClick={() => setShowLightbox(true)}
                >
                  <img
                    src={getCoverUrl()}
                    alt={result.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* 悬停遮罩和按钮 */}
                  <div className={`
                    absolute inset-0 bg-ink-900/40 flex items-center justify-center gap-3
                    transition-opacity duration-200
                    ${coverHovered ? 'opacity-100' : 'opacity-0'}
                  `}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLightbox(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/90 text-ink-900 text-sm
                                 hover:bg-white transition-colors"
                    >
                      <ZoomIn size={16} strokeWidth={1.5} />
                      放大
                    </button>
                    <a
                      href={getCoverUrl()}
                      download={`${result.title || 'cover'}.jpg`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/90 text-ink-900 text-sm
                                 hover:bg-white transition-colors"
                    >
                      <Download size={16} strokeWidth={1.5} />
                      下载
                    </a>
                    <button
                      onClick={handleCopyCoverUrl}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/90 text-ink-900 text-sm
                                 hover:bg-white transition-colors"
                    >
                      {coverCopied ? (
                        <>
                          <Check size={16} className="text-moss" strokeWidth={1.5} />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy size={16} strokeWidth={1.5} />
                          链接
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              {/* 视频预览 */}
              <div className="relative rounded-lg overflow-hidden bg-ink-900 aspect-video">
                <video
                  src={getPreviewUrl()}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* 水印切换 */}
            {(result.no_watermark_video_url || result.watermark_video_url) && (
              <div className="flex items-center justify-center gap-4 mt-5">
                <button
                  onClick={() => setIsNoWatermark(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !isNoWatermark
                      ? 'bg-amber-accent text-white'
                      : 'bg-cream-100 text-ink-700 hover:bg-cream-200'
                  }`}
                >
                  有水印
                </button>
                <button
                  onClick={() => setIsNoWatermark(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isNoWatermark
                      ? 'bg-amber-accent text-white'
                      : 'bg-cream-100 text-ink-700 hover:bg-cream-200'
                  }`}
                >
                  无水印
                </button>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-5">
              <a
                href={getDownloadUrl()}
                download
                className="flex-1 px-6 py-2.5 rounded-lg bg-moss text-white
                           text-sm font-medium text-center
                           hover:bg-moss-light transition-all duration-200
                           flex items-center justify-center gap-2"
              >
                <Download size={16} strokeWidth={1.5} />
                下载视频
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

          {/* 详情折叠 */}
          <div className="border-t border-cream-100">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-5 py-3 flex items-center justify-between
                         text-sm text-ink-500 hover:text-ink-700
                         hover:bg-cream-50 transition-colors"
            >
              查看详情
              {showDetails ? (
                <ChevronUp size={16} strokeWidth={1.5} />
              ) : (
                <ChevronDown size={16} strokeWidth={1.5} />
              )}
            </button>
            {showDetails && (
              <div className="px-5 pb-5 space-y-2 text-sm text-ink-500 animate-fade-in">
                <p><span className="text-ink-700">原始链接：</span>{result.raw_url}</p>
                <p><span className="text-ink-700">解析链接：</span>{result.resolved_url}</p>
                {result.no_watermark_note && (
                  <p><span className="text-ink-700">备注：</span>{result.no_watermark_note}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 图片预览 Lightbox */}
      {showLightbox && result && (
        <ImageLightbox
          src={getCoverUrl()}
          alt={result.title}
          downloadUrl={getCoverUrl()}
          copyUrl={result.cover_url}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
