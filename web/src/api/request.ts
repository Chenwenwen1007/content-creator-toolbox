const API_BASE_URL = '';

/**
 * 解析响应数据的通用函数
 * 从 response 中提取 data 字段，兼容多种嵌套结构
 */
function extractData<T>(response: any): T {
  if (response && response.data && response.data.data !== undefined) {
    return response.data.data as T;
  }
  if (response && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
}

/**
 * 将绝对 URL 转换为相对路径（仅提取 /api/xxx 部分）
 * 开发环境下通过 Vite 代理访问，避免跨域问题
 */
function toRelativeUrl(absoluteUrl: string): string {
  if (!absoluteUrl) return '';
  if (import.meta.env.DEV) {
    const match = absoluteUrl.match(/\/api\/.+$/);
    if (match) return match[0];
  }
  return absoluteUrl;
}

export interface ParseResult {
  platform: string;
  platform_label: string;
  title: string;
  author: string;
  cover_url: string;
  video_url: string;
  preview_cover_url: string;
  preview_video_url: string;
  download_url: string;
  watermark_video_url: string;
  watermark_preview_video_url: string;
  watermark_download_url: string;
  no_watermark_video_url: string;
  no_watermark_preview_video_url: string;
  no_watermark_download_url: string;
  no_watermark_note: string;
  raw_url: string;
  resolved_url: string;
  parse_source: 'native' | 'third_party' | 'fallback';
  no_watermark_verified: boolean;
}

export interface ExtractTextResult {
  platform: string;
  platform_label: string;
  title: string;
  description: string;
  author: string;
  raw_url: string;
  resolved_url: string;
  parse_source: 'native' | 'third_party' | 'fallback';
}

export interface VideoTextExtractResult {
  summary: string;
  key_points: string[];
  full_text: string;
}

/**
 * 把 ParseResult 中的所有代理 URL 转成相对路径
 */
function convertParseResultUrls(result: ParseResult): ParseResult {
  return {
    ...result,
    preview_cover_url: toRelativeUrl(result.preview_cover_url),
    preview_video_url: toRelativeUrl(result.preview_video_url),
    download_url: toRelativeUrl(result.download_url),
    watermark_preview_video_url: toRelativeUrl(result.watermark_preview_video_url),
    watermark_download_url: toRelativeUrl(result.watermark_download_url),
    no_watermark_preview_video_url: toRelativeUrl(result.no_watermark_preview_video_url),
    no_watermark_download_url: toRelativeUrl(result.no_watermark_download_url),
  };
}

/**
 * 解析短视频链接
 * 调用后端 /api/parse 接口获取视频解析结果
 * @param text 分享文案或链接
 * @param mode 解析模式
 */
export async function parseVideo(
  text: string,
  mode: 'auto' | 'native' | 'third_party' = 'auto'
): Promise<ParseResult> {
  const response = await fetch(`${API_BASE_URL}/api/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, mode }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || '解析失败，请稍后重试');
  }

  const data = await response.json();
  const result = extractData<ParseResult>(data);
  return convertParseResultUrls(result);
}

/**
 * 提取文案（旧版，仅提取标题）
 * 先调用解析接口，再从结果中提取文案相关字段
 * @param text 分享文案或链接
 * @param mode 解析模式
 */
export async function extractText(
  text: string,
  mode: 'auto' | 'native' | 'third_party' = 'auto'
): Promise<ExtractTextResult> {
  const result = await parseVideo(text, mode);
  return {
    platform: result.platform,
    platform_label: result.platform_label,
    title: result.title,
    description: result.title,
    author: result.author,
    raw_url: result.raw_url,
    resolved_url: result.resolved_url,
    parse_source: result.parse_source,
  };
}

/**
 * AI 提取视频文案（多模态）
 * 调用后端多模态代理接口，分析视频内容并返回金字塔结构总结
 * @param videoUrl 视频直链
 * @param frames 视频帧图片（base64）
 * @param modelId 模型ID
 * @param apiKey API密钥
 * @param modelName 模型名称
 * @param baseUrl 模型基础URL
 */
export async function extractVideoTextAI(
  videoUrl: string,
  frames: string[],
  modelId: string,
  apiKey: string,
  modelName: string,
  baseUrl: string
): Promise<VideoTextExtractResult> {
  const response = await fetch(`${API_BASE_URL}/api/multimodal/extract-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: videoUrl,
      frames,
      model_id: modelId,
      api_key: apiKey,
      model_name: modelName,
      base_url: baseUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || 'AI 提取失败，请稍后重试');
  }

  const data = await response.json();
  return extractData<VideoTextExtractResult>(data);
}

/**
 * 获取封面代理地址
 * 直接使用后端返回的 preview_cover_url（已转为相对路径）
 * 不再自己生成 token，避免编码不一致问题
 * @param previewCoverUrl 后端返回的封面预览地址
 */
export function getCoverProxyUrl(previewCoverUrl: string): string {
  if (!previewCoverUrl) return '';
  return previewCoverUrl;
}

/**
 * 统计数据类型定义
 */
export interface StatsData {
  total_home_views: number;
  total_tool_usages: number;
  tool_stats: Record<string, number>;
}

/**
 * 上报首页访问
 * 调用后端 /api/stats/home-view 接口记录一次首页访问（受3小时冷却限制）
 */
export async function reportHomeView(): Promise<{ counted: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/home-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) return { counted: false };
    const data = await response.json();
    return extractData<{ counted: boolean }>(data);
  } catch {
    return { counted: false };
  }
}

/**
 * 上报工具使用
 * 调用后端 /api/stats/tool-usage/{tool_id} 接口记录一次工具使用
 * @param toolId 工具ID
 */
export async function reportToolUsage(toolId: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/tool-usage/${toolId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) return { success: false };
    const data = await response.json();
    return extractData<{ success: boolean }>(data);
  } catch {
    return { success: false };
  }
}

/**
 * 获取所有统计数据
 * 调用后端 /api/stats/all 接口获取首页访问总数和各工具使用次数
 */
export async function getAllStats(): Promise<StatsData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/all`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      return { total_home_views: 0, total_tool_usages: 0, tool_stats: {} };
    }
    const data = await response.json();
    return extractData<StatsData>(data);
  } catch {
    return { total_home_views: 0, total_tool_usages: 0, tool_stats: {} };
  }
}
