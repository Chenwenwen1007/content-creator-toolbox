import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Image as ImageIcon,
  FileImage,
  Trash2,
  Minus,
  Gauge,
} from 'lucide-react';

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
 * 图片压缩组件
 * 支持上传图片、调整压缩质量、实时预览压缩效果、下载压缩后图片
 */
export function ImageCompress() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [quality, setQuality] = useState(80);
  const [isCompressing, setIsCompressing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * 处理文件上传
   * 读取图片信息并初始化压缩
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
        compressImage(src, quality, img.width, img.height);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  /**
   * 压缩图片
   * 使用 canvas 绘制并按质量导出
   * @param src 图片源地址
   * @param quality 压缩质量 0-100
   * @param width 图片宽度
   * @param height 图片高度
   */
  const compressImage = useCallback((src: string, quality: number, width: number, height: number) => {
    setIsCompressing(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);

      const qualityValue = quality / 100;
      const dataUrl = canvas.toDataURL('image/jpeg', qualityValue);
      setCompressedImage(dataUrl);

      const base64Str = dataUrl.split(',')[1];
      const sizeInBytes = Math.floor((base64Str.length * 3) / 4);
      setCompressedSize(sizeInBytes);

      setIsCompressing(false);
    };
    img.src = src;
  }, []);

  /**
   * 处理质量滑块变化
   * 实时重新压缩图片
   */
  const handleQualityChange = (newQuality: number) => {
    setQuality(newQuality);
    if (originalImage && originalSize.width > 0) {
      compressImage(originalImage, newQuality, originalSize.width, originalSize.height);
    }
  };

  /**
   * 下载压缩后的图片
   */
  const downloadCompressedImage = () => {
    if (!compressedImage || !originalFile) return;

    const link = document.createElement('a');
    const originalName = originalFile.name.replace(/\.[^/.]+$/, '');
    link.download = `${originalName}-compressed-${quality}.jpg`;
    link.href = compressedImage;
    link.click();
  };

  /**
   * 清除当前图片
   */
  const clearImage = () => {
    setOriginalImage(null);
    setOriginalFile(null);
    setOriginalSize({ width: 0, height: 0 });
    setCompressedImage(null);
    setCompressedSize(0);
    setQuality(80);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 计算压缩率
   */
  const getCompressionRatio = (): number => {
    if (!originalFile || compressedSize === 0) return 0;
    return Math.round((1 - compressedSize / originalFile.size) * 100);
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
              上传图片进行压缩
            </h3>
            <p className="text-sm text-ink-500 mb-4">
              支持 JPG、PNG、WebP 等常见图片格式
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
              min={1}
              max={100}
              value={quality}
              onChange={(e) => handleQualityChange(parseInt(e.target.value))}
              className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer
                         accent-amber-accent"
            />
            <div className="flex justify-between mt-2 text-xs text-ink-500">
              <span>高压缩</span>
              <span>高质量</span>
            </div>
          </div>

          {/* 对比区域 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 原图 */}
            <div className="bg-white rounded-xl shadow-card border border-cream-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
                <h4 className="font-medium text-sm text-ink-900 flex items-center gap-2">
                  <FileImage size={16} strokeWidth={1.5} className="text-ink-500" />
                  原图
                </h4>
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

            {/* 压缩后 */}
            <div className="bg-white rounded-xl shadow-card border border-cream-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
                <h4 className="font-medium text-sm text-ink-900 flex items-center gap-2">
                  <Minus size={16} strokeWidth={1.5} className="text-moss" />
                  压缩后
                </h4>
                {getCompressionRatio() > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-moss/10 text-moss font-medium">
                    节省 {getCompressionRatio()}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="relative rounded-lg overflow-hidden bg-cream-100 aspect-video">
                  {isCompressing ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-sm text-ink-500">压缩中...</div>
                    </div>
                  ) : (
                    compressedImage && (
                      <img
                        src={compressedImage}
                        alt="压缩后"
                        className="w-full h-full object-contain"
                      />
                    )
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2.5 rounded-lg bg-moss/5">
                    <p className="text-xs text-ink-500 mb-0.5">文件大小</p>
                    <p className="font-medium text-moss">
                      {compressedSize > 0 ? formatFileSize(compressedSize) : '-'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cream-50">
                    <p className="text-xs text-ink-500 mb-0.5">格式</p>
                    <p className="font-medium text-ink-900">JPEG</p>
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
              onClick={downloadCompressedImage}
              disabled={!compressedImage || isCompressing}
              className="px-6 py-2.5 rounded-lg bg-moss text-white
                         text-sm font-medium
                         hover:bg-moss-light transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              <Download size={16} strokeWidth={1.5} />
              下载压缩图片
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
