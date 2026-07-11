import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Image as ImageIcon,
  FileImage,
  Trash2,
  Minus,
  Gauge,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { reportToolUsage } from '../api/request';

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 压缩图片项数据接口
 */
interface CompressItem {
  id: string;
  file: File;
  originalUrl: string;
  compressedUrl: string | null;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  type: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

/**
 * SVG文本优化压缩
 * 移除注释、多余空白、精简小数精度
 * @param svgText SVG原始文本
 * @returns 压缩后的SVG文本
 */
function compressSvg(svgText: string): string {
  let result = svgText;
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<\?xml[^?]*\?>/g, '');
  result = result.replace(/<!DOCTYPE[^>]*>/g, '');
  result = result.replace(/\s+/g, ' ');
  result = result.replace(/\s*([{}>;:,])\s*/g, '$1');
  result = result.replace(/(\d+\.\d{3,})/g, (match) => {
    return parseFloat(match).toFixed(2);
  });
  result = result.trim();
  return result;
}

/**
 * Canvas压缩JPG/PNG/WebP图片
 * @param file 原始图片文件
 * @param quality 压缩质量 0-100
 * @param mime 输出MIME类型
 * @returns Promise<{ dataUrl: string; blob: Blob; width: number; height: number }>
 */
function compressRasterImage(
  file: File,
  quality: number,
  mime: string
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas不可用'));
          return;
        }
        ctx.drawImage(img, 0, 0);

        const qualityValue = Math.max(0.1, Math.min(1, quality / 100));
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('压缩失败'));
              return;
            }
            const url = URL.createObjectURL(blob);
            resolve({
              dataUrl: url,
              blob,
              width: img.width,
              height: img.height,
            });
          },
          mime,
          qualityValue
        );
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 加载Gifsicle WASM模块（动态CDN加载）
 * @returns Promise<Gifsicle模块>
 */
async function loadGifsicle(): Promise<any> {
  if ((window as any).gifsicle) {
    return (window as any).gifsicle;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gifsicle-wasm-browser@1.5.19/dist/gifsicle.min.js';
    script.onload = async () => {
      try {
        const gifsicle = (window as any).Gifsicle();
        await gifsicle.ready();
        (window as any).gifsicle = gifsicle;
        resolve(gifsicle);
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error('Gifsicle加载失败'));
    document.head.appendChild(script);
  });
}

/**
 * 使用Gifsicle压缩GIF
 * @param file GIF文件
 * @param quality 压缩质量 0-100（转换为lossy参数）
 * @returns Promise<Blob>
 */
async function compressGif(file: File, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const gifsicle = await loadGifsicle();
  const arrayBuffer = await file.arrayBuffer();
  const inputName = 'input.gif';
  const outputName = 'output.gif';

  const lossy = Math.round((100 - quality) * 2);
  const colors = quality < 50 ? 64 : quality < 80 ? 128 : 256;

  const cmd = [
    `--optimize=3`,
    `--lossy=${Math.max(0, Math.min(200, lossy))}`,
    `--colors=${colors}`,
    inputName,
    '-o',
    outputName,
  ];

  const result = await gifsicle.run(cmd, [
    { name: inputName, data: new Uint8Array(arrayBuffer) },
  ]);

  const outputFile = result.find((f: any) => f.name === outputName);
  if (!outputFile) {
    throw new Error('GIF压缩失败');
  }

  const blob = new Blob([outputFile.data], { type: 'image/gif' });
  return { blob, width: 0, height: 0 };
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名（小写）
 */
function getExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext ? ext.toLowerCase() : '';
}

/**
 * 根据文件类型获取MIME类型
 * @param file 文件对象
 * @returns MIME类型字符串
 */
function getOutputMime(file: File): string {
  const ext = getExtension(file.name);
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
  };
  return mimeMap[ext] || file.type || 'image/jpeg';
}

/**
 * 图片压缩组件
 * 支持JPG、PNG、SVG、GIF格式压缩，多图批量处理，保留原格式
 */
export function ImageCompress() {
  const [items, setItems] = useState<CompressItem[]>([]);
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gifsicleLoaded, setGifsicleLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件上传
   * 读取多个图片文件并添加到列表
   * @param e 文件选择事件
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: CompressItem[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/') && !getExtension(file.name).match(/^(jpg|jpeg|png|gif|svg|webp)$/)) {
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const url = URL.createObjectURL(file);

      const item: CompressItem = {
        id,
        file,
        originalUrl: url,
        compressedUrl: null,
        originalSize: file.size,
        compressedSize: 0,
        width: 0,
        height: 0,
        type: getOutputMime(file),
        status: 'pending',
      };

      if (file.type.startsWith('image/svg') || getExtension(file.name) === 'svg') {
        item.status = 'done';
      }

      newItems.push(item);
    });

    newItems.forEach((item) => {
      if (item.type === 'image/svg+xml') {
        return;
      }
      const img = new Image();
      img.onload = () => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, width: img.width, height: img.height } : it
          )
        );
      };
      img.src = item.originalUrl;
    });

    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 压缩单个图片项
   * @param item 要压缩的图片项
   * @param q 压缩质量
   */
  const compressItem = useCallback(async (item: CompressItem, q: number): Promise<CompressItem> => {
    try {
      const ext = getExtension(item.file.name).toLowerCase();

      if (ext === 'svg' || item.type === 'image/svg+xml') {
        const text = await item.file.text();
        const compressed = compressSvg(text);
        const blob = new Blob([compressed], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        return {
          ...item,
          compressedUrl: url,
          compressedSize: blob.size,
          status: 'done',
        };
      }

      if (ext === 'gif' || item.type === 'image/gif') {
        const { blob, width, height } = await compressGif(item.file, q);
        const url = URL.createObjectURL(blob);
        return {
          ...item,
          compressedUrl: url,
          compressedSize: blob.size,
          width,
          height,
          status: 'done',
        };
      }

      const mime = getOutputMime(item.file);
      const { blob, width, height } = await compressRasterImage(item.file, q, mime);
      const url = URL.createObjectURL(blob);
      return {
        ...item,
        compressedUrl: url,
        compressedSize: blob.size,
        width,
        height,
        status: 'done',
      };
    } catch (err) {
      return {
        ...item,
        status: 'error',
        error: err instanceof Error ? err.message : '压缩失败',
      };
    }
  }, []);

  /**
   * 压缩所有图片
   */
  const handleCompressAll = async () => {
    setIsProcessing(true);
    setItems((prev) => prev.map((it) => ({ ...it, status: 'processing' as const })));

    try {
      const hasGif = items.some(
        (it) => getExtension(it.file.name).toLowerCase() === 'gif' || it.type === 'image/gif'
      );
      if (hasGif && !gifsicleLoaded) {
        await loadGifsicle();
        setGifsicleLoaded(true);
      }

      const results = await Promise.all(items.map((item) => compressItem(item, quality)));
      setItems(results);

      const successCount = results.filter((r) => r.status === 'done').length;
      if (successCount > 0) {
        reportToolUsage('image-compress');
      }
    } catch (err) {
      console.error('批量压缩失败:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 下载单个压缩后的图片
   * @param item 图片项
   */
  const downloadItem = (item: CompressItem) => {
    if (!item.compressedUrl) return;

    const link = document.createElement('a');
    const originalName = item.file.name.replace(/\.[^/.]+$/, '');
    const ext = getExtension(item.file.name);
    link.download = `${originalName}-compressed.${ext}`;
    link.href = item.compressedUrl;
    link.click();
  };

  /**
   * 下载所有压缩后的图片
   */
  const downloadAll = () => {
    items.filter((it) => it.status === 'done' && it.compressedUrl).forEach((item, index) => {
      setTimeout(() => downloadItem(item), index * 200);
    });
  };

  /**
   * 删除单个图片项
   * @param id 图片项ID
   */
  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item) {
        URL.revokeObjectURL(item.originalUrl);
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  /**
   * 清空所有图片
   */
  const clearAll = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.originalUrl);
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    });
    setItems([]);
    setQuality(80);
  };

  /**
   * 计算总压缩率
   */
  const getTotalSavings = (): number => {
    const doneItems = items.filter((it) => it.status === 'done' && it.compressedSize > 0);
    if (doneItems.length === 0) return 0;
    const totalOriginal = doneItems.reduce((sum, it) => sum + it.originalSize, 0);
    const totalCompressed = doneItems.reduce((sum, it) => sum + it.compressedSize, 0);
    return Math.round((1 - totalCompressed / totalOriginal) * 100);
  };

  /**
   * 获取格式标签样式
   * @param type MIME类型
   */
  const getFormatBadge = (type: string) => {
    const formats: Record<string, { label: string; color: string }> = {
      'image/jpeg': { label: 'JPG', color: 'bg-amber-100 text-amber-700' },
      'image/png': { label: 'PNG', color: 'bg-blue-100 text-blue-700' },
      'image/gif': { label: 'GIF', color: 'bg-purple-100 text-purple-700' },
      'image/svg+xml': { label: 'SVG', color: 'bg-green-100 text-green-700' },
      'image/webp': { label: 'WebP', color: 'bg-teal-100 text-teal-700' },
    };
    const ext = getExtension(items.find((i) => i.type === type)?.file.name || '');
    if (ext === 'svg') return formats['image/svg+xml'];
    if (ext === 'gif') return formats['image/gif'];
    return formats[type] || { label: 'IMG', color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp,.jpg,.jpeg,.png,.gif,.svg,.webp"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {items.length === 0 ? (
        /* 上传区域 */
        <div
          className="bg-white rounded-xl shadow-card border border-cream-100 p-12
                     border-dashed border-2 hover:border-amber-accent/50 hover:bg-cream-50/30
                     transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-100 flex items-center justify-center">
              <Upload size={28} strokeWidth={1.5} className="text-amber-accent" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink-900 mb-2">
              上传图片进行压缩
            </h3>
            <p className="text-sm text-ink-500 mb-4">
              支持 JPG、PNG、GIF、SVG、WebP 格式，可批量选择多张图片
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {['JPG', 'PNG', 'GIF', 'SVG', 'WebP'].map((fmt) => (
                <span key={fmt} className="px-2 py-1 rounded-md bg-cream-100 text-ink-600 text-xs font-medium">
                  {fmt}
                </span>
              ))}
            </div>
            <button
              className="px-6 py-2.5 rounded-lg bg-amber-accent text-white
                         text-sm font-medium
                         hover:bg-amber-dark transition-all duration-200
                         inline-flex items-center gap-2"
            >
              <ImageIcon size={16} strokeWidth={1.5} />
              选择图片
            </button>
          </div>
        </div>
      ) : (
        /* 压缩界面 */
        <div className="space-y-6">
          {/* 质量控制 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-sm font-semibold text-ink-900 flex items-center gap-2">
                <Gauge size={16} strokeWidth={1.5} className="text-amber-accent" />
                压缩质量
              </h3>
              <span className="text-lg font-bold text-amber-accent font-serif">
                {quality}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer
                         accent-amber-accent"
            />
            <div className="flex justify-between mt-2 text-xs text-ink-500">
              <span>高压缩（文件更小）</span>
              <span>高质量（画质更好）</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-lg border border-cream-300 bg-white
                         text-ink-700 text-sm font-medium
                         hover:bg-cream-50 transition-all duration-200
                         flex items-center gap-2"
            >
              <Upload size={16} strokeWidth={1.5} />
              添加图片
            </button>
            <button
              onClick={handleCompressAll}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-lg bg-amber-accent text-white
                         text-sm font-medium shadow-sm
                         hover:bg-amber-dark transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  压缩中...
                </>
              ) : (
                <>
                  <Minus size={16} strokeWidth={1.5} />
                  开始压缩（{items.length}张）
                </>
              )}
            </button>
            {items.some((it) => it.status === 'done' && it.compressedUrl) && (
              <button
                onClick={downloadAll}
                className="px-6 py-2.5 rounded-lg bg-moss text-white
                           text-sm font-medium shadow-sm
                           hover:bg-moss-light transition-all duration-200
                           flex items-center gap-2"
              >
                <Download size={16} strokeWidth={1.5} />
                下载全部
              </button>
            )}
            <button
              onClick={clearAll}
              className="px-5 py-2.5 rounded-lg border border-brick/30 bg-white
                         text-brick text-sm font-medium
                         hover:bg-brick/5 transition-all duration-200
                         flex items-center gap-2"
            >
              <Trash2 size={16} strokeWidth={1.5} />
              清空
            </button>
          </div>

          {/* 压缩统计 */}
          {getTotalSavings() > 0 && (
            <div className="text-center">
              <span className="text-sm text-moss font-medium">
                总共节省 {getTotalSavings()}% 空间
              </span>
            </div>
          )}

          {/* 图片列表 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const badge = getFormatBadge(item.type);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-card border border-cream-100 overflow-hidden relative group"
                >
                  {/* 删除按钮 */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 text-white
                               flex items-center justify-center opacity-0 group-hover:opacity-100
                               transition-opacity hover:bg-black/60"
                  >
                    <X size={14} />
                  </button>

                  {/* 预览 */}
                  <div className="aspect-video bg-cream-50 relative overflow-hidden">
                    <img
                      src={item.compressedUrl || item.originalUrl}
                      alt={item.file.name}
                      className="w-full h-full object-contain"
                    />
                    {/* 状态遮罩 */}
                    {item.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    )}
                    {item.status === 'done' && item.compressedUrl && (
                      <div className="absolute top-2 left-2">
                        <Check size={16} className="text-moss bg-white rounded-full p-0.5" />
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm text-ink-900 font-medium truncate flex-1">
                        {item.file.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-cream-50">
                        <p className="text-ink-400">原图</p>
                        <p className="text-ink-700 font-medium">{formatFileSize(item.originalSize)}</p>
                      </div>
                      <div className={`p-2 rounded ${item.compressedSize > 0 ? 'bg-moss/5' : 'bg-cream-50'}`}>
                        <p className="text-ink-400">压缩后</p>
                        <p className={`font-medium ${item.compressedSize > 0 ? 'text-moss' : 'text-ink-400'}`}>
                          {item.compressedSize > 0 ? formatFileSize(item.compressedSize) : '-'}
                        </p>
                      </div>
                    </div>

                    {item.width > 0 && (
                      <p className="text-xs text-ink-400">
                        {item.width} × {item.height} px
                      </p>
                    )}

                    {item.status === 'error' && (
                      <p className="text-xs text-brick">{item.error}</p>
                    )}

                    {/* 下载按钮 */}
                    {item.status === 'done' && item.compressedUrl && (
                      <button
                        onClick={() => downloadItem(item)}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-moss/10 text-moss text-sm font-medium
                                   hover:bg-moss/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <Download size={14} strokeWidth={1.5} />
                        下载
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
