import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  FileImage,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { reportToolUsage } from '../api/request';

/**
 * 目标格式类型
 */
type TargetFormat = 'jpg' | 'png' | 'webp';

/**
 * 格式选项配置
 */
interface FormatOption {
  value: TargetFormat;
  label: string;
  description: string;
}

/**
 * 格式选项列表
 */
const formatOptions: FormatOption[] = [
  { value: 'jpg', label: 'JPG', description: '有损压缩，体积小' },
  { value: 'png', label: 'PNG', description: '无损压缩，支持透明' },
  { value: 'webp', label: 'WebP', description: '现代格式，高压缩比' },
];

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
 * 图片格式转换组件
 * 支持上传图片、选择目标格式、调节质量、预览和下载转换后图片
 */
export function ImageConvert() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('webp');
  const [quality, setQuality] = useState(90);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [convertedSize, setConvertedSize] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * 检查当前格式是否支持质量调节
   */
  const supportsQuality = (): boolean => {
    return targetFormat === 'jpg' || targetFormat === 'webp';
  };

  /**
   * 获取 MIME 类型
   */
  const getMimeType = (format: TargetFormat): string => {
    switch (format) {
      case 'jpg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/png';
    }
  };

  /**
   * 获取文件扩展名
   */
  const getExtension = (format: TargetFormat): string => {
    switch (format) {
      case 'jpg':
        return 'jpg';
      case 'png':
        return 'png';
      case 'webp':
        return 'webp';
      default:
        return 'png';
    }
  };

  /**
   * 处理文件上传
   * 读取图片信息并初始化转换
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setOriginalImage(src);
      setOriginalFile(file);

      const img = new Image();
      img.onload = () => {
        setOriginalSize({ width: img.width, height: img.height });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  /**
   * 转换图片格式
   * 使用 canvas 绘制并按目标格式导出
   */
  const convertImage = useCallback(() => {
    if (!originalImage || originalSize.width === 0) return;

    setIsConverting(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (targetFormat === 'jpg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const mimeType = getMimeType(targetFormat);
      const qualityValue = supportsQuality() ? quality / 100 : undefined;

      const dataUrl = canvas.toDataURL(mimeType, qualityValue);
      setConvertedImage(dataUrl);

      const base64Str = dataUrl.split(',')[1];
      const sizeInBytes = Math.floor((base64Str.length * 3) / 4);
      setConvertedSize(sizeInBytes);

      setIsConverting(false);
    };
    img.src = originalImage;
  }, [originalImage, originalSize, targetFormat, quality]);

  /**
   * 当格式或质量变化时重新转换
   */
  useEffect(() => {
    if (originalImage && originalSize.width > 0) {
      convertImage();
    }
  }, [targetFormat, quality, originalImage, originalSize, convertImage]);

  /**
   * 下载转换后的图片
   */
  const downloadConvertedImage = () => {
    if (!convertedImage || !originalFile) return;

    const link = document.createElement('a');
    const originalName = originalFile.name.replace(/\.[^/.]+$/, '');
    const ext = getExtension(targetFormat);
    link.download = `${originalName}-converted.${ext}`;
    link.href = convertedImage;
    link.click();
    reportToolUsage('image-convert');
  };

  /**
   * 清除当前图片
   */
  const clearImage = () => {
    setOriginalImage(null);
    setOriginalFile(null);
    setOriginalSize({ width: 0, height: 0 });
    setConvertedImage(null);
    setConvertedSize(0);
    setQuality(90);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 计算体积变化百分比
   */
  const getSizeChangePercent = (): number => {
    if (!originalFile || convertedSize === 0) return 0;
    return Math.round(((convertedSize - originalFile.size) / originalFile.size) * 100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {!originalImage ? (
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
              上传图片进行格式转换
            </h3>
            <p className="text-sm text-ink-500 mb-4">
              支持转换为 JPG、PNG、WebP 格式
            </p>
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
        /* 转换界面 */
        <div className="space-y-6">
          {/* 格式选择 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-5">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Sparkles size={16} strokeWidth={1.5} className="text-amber-accent" />
              选择目标格式
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTargetFormat(option.value)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    targetFormat === option.value
                      ? 'border-amber-accent bg-amber-accent/5'
                      : 'border-cream-200 hover:border-cream-300 bg-white'
                  )}
                >
                  <p className={cn(
                    'font-serif font-bold text-lg mb-1',
                    targetFormat === option.value ? 'text-amber-dark' : 'text-ink-900'
                  )}>
                    {option.label}
                  </p>
                  <p className="text-xs text-ink-500">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 质量调节（仅对 JPG/WebP 有效） */}
          {supportsQuality() && (
            <div className="bg-white rounded-xl shadow-card border border-cream-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-sm font-semibold text-ink-900">
                  输出质量
                </h3>
                <span className="text-lg font-bold text-amber-accent font-serif">
                  {quality}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer
                           accent-amber-accent"
              />
              <div className="flex justify-between mt-2 text-xs text-ink-500">
                <span>高压缩</span>
                <span>高质量</span>
              </div>
            </div>
          )}

          {/* 对比区域 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 原图 */}
            <div className="bg-white rounded-xl shadow-card border border-cream-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
                <h4 className="font-medium text-sm text-ink-900 flex items-center gap-2">
                  <FileImage size={16} strokeWidth={1.5} className="text-ink-500" />
                  原图
                </h4>
                <span className="text-xs text-ink-500 uppercase">
                  {originalFile?.name.split('.').pop()}
                </span>
              </div>
              <div className="p-4">
                <div className="relative rounded-lg overflow-hidden bg-cream-100 aspect-video">
                  <img
                    src={originalImage}
                    alt="原图"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2.5 rounded-lg bg-cream-50">
                    <p className="text-xs text-ink-500 mb-0.5">文件大小</p>
                    <p className="font-medium text-ink-900">
                      {originalFile ? formatFileSize(originalFile.size) : '-'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cream-50">
                    <p className="text-xs text-ink-500 mb-0.5">尺寸</p>
                    <p className="font-medium text-ink-900">
                      {originalSize.width > 0
                        ? `${originalSize.width} × ${originalSize.height}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 转换后 */}
            <div className="bg-white rounded-xl shadow-card border border-cream-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
                <h4 className="font-medium text-sm text-ink-900 flex items-center gap-2">
                  <RefreshCw size={16} strokeWidth={1.5} className="text-amber-accent" />
                  转换后
                </h4>
                {convertedSize > 0 && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    getSizeChangePercent() < 0
                      ? 'bg-moss/10 text-moss'
                      : 'bg-brick/10 text-brick'
                  )}>
                    {getSizeChangePercent() > 0 ? '+' : ''}{getSizeChangePercent()}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="relative rounded-lg overflow-hidden bg-cream-100 aspect-video">
                  {isConverting ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-sm text-ink-500">转换中...</div>
                    </div>
                  ) : (
                    convertedImage && (
                      <img
                        src={convertedImage}
                        alt="转换后"
                        className="w-full h-full object-contain"
                      />
                    )
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2.5 rounded-lg bg-amber-accent/5">
                    <p className="text-xs text-ink-500 mb-0.5">文件大小</p>
                    <p className="font-medium text-amber-dark">
                      {convertedSize > 0 ? formatFileSize(convertedSize) : '-'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cream-50">
                    <p className="text-xs text-ink-500 mb-0.5">格式</p>
                    <p className="font-medium text-ink-900 uppercase">{targetFormat}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={clearImage}
              className="px-5 py-2.5 rounded-lg border border-cream-300 bg-white
                         text-ink-700 text-sm font-medium
                         hover:bg-cream-50 transition-all duration-200
                         flex items-center gap-2"
            >
              <Trash2 size={16} strokeWidth={1.5} />
              重新选择
            </button>
            <button
              onClick={downloadConvertedImage}
              disabled={!convertedImage || isConverting}
              className="px-6 py-2.5 rounded-lg bg-moss text-white
                         text-sm font-medium
                         hover:bg-moss-light transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              <Download size={16} strokeWidth={1.5} />
              下载图片
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
