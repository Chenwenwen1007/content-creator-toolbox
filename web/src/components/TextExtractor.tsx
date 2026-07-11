import { useState, useRef, useEffect } from 'react';
import { FileText, Copy, Check, Loader2, Settings, Sparkles, Pyramid, List, AlignLeft } from 'lucide-react';
import { parseVideo, extractVideoTextAI, VideoTextExtractResult, reportToolUsage } from '../api/request';
import { useAppStore } from '../store/app';
import { Link } from 'react-router-dom';

/**
 * 文案提取工具组件
 * 通过多模态 AI 分析视频内容，提取视频文案并以金字塔结构展示
 * 顶层：一句话摘要
 * 中层：关键要点列表
 * 底层：完整文案
 */
export function TextExtractor() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [aiResult, setAiResult] = useState<VideoTextExtractResult | null>(null);
  const [error, setError] = useState('');
  const [frameCount, setFrameCount] = useState(6);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState<'summary' | 'points' | 'full' | null>(null);

  const { getActiveModel, models, activeModelId } = useAppStore();
  const activeModel = models[activeModelId];

  /**
   * 处理解析按钮点击
   * 先解析视频链接，获取视频直链
   */
  const handleParse = async () => {
    if (!inputText.trim()) {
      setError('请输入分享链接或文案');
      return;
    }

    setIsLoading(true);
    setError('');
    setParseResult(null);
    setAiResult(null);
    setProgress(0);

    try {
      const data = await parseVideo(inputText.trim());
      setParseResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 从视频中抽取帧
   * @param videoUrl 视频地址
   * @param count 抽帧数量
   * @returns base64 格式的帧图片数组
   */
  const extractFrames = (videoUrl: string, count: number): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 不可用'));
        return;
      }

      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.src = videoUrl;

      const frames: string[] = [];
      let currentFrame = 0;

      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const duration = video.duration;
        const interval = duration / (count + 1);

        const captureNext = () => {
          if (currentFrame >= count) {
            resolve(frames);
            return;
          }
          const time = interval * (currentFrame + 1);
          video.currentTime = time;
        };

        video.addEventListener('seeked', () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          frames.push(base64);
          currentFrame++;
          setProgress(Math.round((currentFrame / count) * 40));
          setTimeout(captureNext, 100);
        }, { once: true });

        captureNext();
      });

      video.addEventListener('error', () => {
        reject(new Error('视频加载失败，可能是跨域限制'));
      });
    });
  };

  /**
   * 处理 AI 提取文案按钮点击
   * 先抽帧，再调用后端多模态接口
   */
  const handleExtract = async () => {
    if (!parseResult) return;

    const model = getActiveModel();
    if (!model) {
      setError('请先在设置中配置 API Key');
      return;
    }

    setIsExtracting(true);
    setError('');
    setAiResult(null);
    setProgress(0);

    try {
      // 获取视频地址（优先无水印）
      const videoUrl = parseResult.no_watermark_video_url
        || parseResult.video_url
        || parseResult.no_watermark_preview_video_url;

      if (!videoUrl) {
        throw new Error('未找到视频地址');
      }

      // 抽帧
      setProgress(5);
      const frames = await extractFrames(videoUrl, frameCount);

      // 调用 AI
      setProgress(50);
      const result = await extractVideoTextAI(
        videoUrl,
        frames,
        activeModelId,
        model.apiKey,
        model.defaultModel,
        model.baseUrl
      );

      setProgress(100);
      setAiResult(result);
      // AI提取成功，上报工具使用
      reportToolUsage('text-extract');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 提取失败，请稍后重试');
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * 复制文本到剪贴板
   */
  const copyText = async (text: string, type: 'summary' | 'points' | 'full') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // 复制失败不处理
    }
  };

  /**
   * 处理粘贴操作
   */
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch {
      // 剪贴板不可用时手动输入
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* API Key 提示 */}
      {!activeModel?.apiKey && (
        <div className="p-4 rounded-lg bg-amber-accent/10 border border-amber-accent/20 text-amber-dark text-sm flex items-start gap-3">
          <Settings size={18} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="font-medium">请先配置 API Key</p>
            <p className="text-xs mt-1 opacity-80">
              <Link to="/settings" className="underline hover:opacity-80">前往设置</Link> 配置大模型 API 密钥后使用 AI 提取功能
            </p>
          </div>
        </div>
      )}

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
                <FileText size={16} strokeWidth={1.5} />
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

      {/* 解析结果 + AI 提取 */}
      {parseResult && (
        <div className="bg-white rounded-lg shadow-card overflow-hidden animate-fade-in">
          {/* 视频信息 */}
          <div className="p-5 border-b border-cream-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-cream-200 text-ink-700 font-medium">
                {parseResult.platform_label}
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink-900 leading-snug">
              {parseResult.title}
            </h3>
            {parseResult.author && (
              <p className="text-sm text-ink-500 mt-1">@{parseResult.author}</p>
            )}
          </div>

          {/* AI 提取控制区 */}
          <div className="p-5 border-b border-cream-100 bg-cream-50/50">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-700">抽帧数量:</label>
                <select
                  value={frameCount}
                  onChange={(e) => setFrameCount(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-md border border-cream-300 bg-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent"
                >
                  <option value={3}>3 帧</option>
                  <option value={6}>6 帧</option>
                  <option value={9}>9 帧</option>
                  <option value={12}>12 帧</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-500">模型:</span>
                <span className="text-sm font-medium text-ink-700">{activeModel?.name}</span>
              </div>
            </div>

            {/* 进度条 */}
            {(isExtracting || isLoading) && (
              <div className="mb-4">
                <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  {progress < 40 ? '正在抽取视频帧...' : progress < 100 ? 'AI 正在分析...' : '完成！'}
                </p>
              </div>
            )}

            <button
              onClick={handleExtract}
              disabled={isExtracting || !activeModel?.apiKey}
              className="w-full px-6 py-2.5 rounded-lg bg-moss text-white
                         text-sm font-medium shadow-sm
                         hover:bg-moss-light transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  AI 提取中...
                </>
              ) : (
                <>
                  <Sparkles size={16} strokeWidth={1.5} />
                  AI 提取视频文案
                </>
              )}
            </button>
          </div>

          {/* AI 结果 - 金字塔结构 */}
          {aiResult && (
            <div className="p-5 space-y-6 animate-fade-in">
              {/* 顶层 - 一句话摘要 */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-accent/10 flex items-center justify-center">
                    <Pyramid size={16} className="text-amber-accent" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <h4 className="font-medium text-ink-900">一句话摘要</h4>
                    <button
                      onClick={() => copyText(aiResult.summary, 'summary')}
                      className="text-xs text-ink-500 hover:text-ink-700 flex items-center gap-1"
                    >
                      {copied === 'summary' ? (
                        <><Check size={12} className="text-moss" />已复制</>
                      ) : (
                        <><Copy size={12} />复制</>
                      )}
                    </button>
                  </div>
                </div>
                <div className="ml-10 pl-4 border-l-2 border-amber-accent/30">
                  <p className="text-ink-900 font-serif text-base leading-relaxed">
                    {aiResult.summary}
                  </p>
                </div>
              </div>

              {/* 中层 - 关键要点 */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-moss/10 flex items-center justify-center">
                    <List size={16} className="text-moss" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <h4 className="font-medium text-ink-900">关键要点</h4>
                    <button
                      onClick={() => copyText(aiResult.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n'), 'points')}
                      className="text-xs text-ink-500 hover:text-ink-700 flex items-center gap-1"
                    >
                      {copied === 'points' ? (
                        <><Check size={12} className="text-moss" />已复制</>
                      ) : (
                        <><Copy size={12} />复制</>
                      )}
                    </button>
                  </div>
                </div>
                <div className="ml-10 space-y-2">
                  {aiResult.key_points.map((point, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-moss/10 text-moss text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <p className="text-ink-700 leading-relaxed text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 底层 - 完整文案 */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-ink-900/10 flex items-center justify-center">
                    <AlignLeft size={16} className="text-ink-700" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <h4 className="font-medium text-ink-900">完整文案</h4>
                    <button
                      onClick={() => copyText(aiResult.full_text, 'full')}
                      className="text-xs text-ink-500 hover:text-ink-700 flex items-center gap-1"
                    >
                      {copied === 'full' ? (
                        <><Check size={12} className="text-moss" />已复制</>
                      ) : (
                        <><Copy size={12} />复制</>
                      )}
                    </button>
                  </div>
                </div>
                <div className="ml-10 pl-4 border-l-2 border-ink-300/30">
                  <p className="text-ink-700 leading-relaxed text-sm whitespace-pre-wrap">
                    {aiResult.full_text}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 隐藏的 video 和 canvas 用于抽帧 */}
      <video ref={videoRef} className="hidden" crossOrigin="anonymous" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
