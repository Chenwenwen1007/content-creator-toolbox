import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  Image as ImageIcon,
  Crop,
  Trash2,
  Move,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  MousePointer2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { reportToolUsage } from '../api/request';

/**
 * 裁剪比例类型
 */
type AspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

/**
 * 裁剪框数据
 */
interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 比例选项配置
 */
interface RatioOption {
  value: AspectRatio;
  label: string;
  icon: React.ReactNode;
  ratio: number | null;
}

/**
 * 比例选项列表
 */
const ratioOptions: RatioOption[] = [
  { value: 'free', label: '自由', icon: <MousePointer2 size={16} strokeWidth={1.5} />, ratio: null },
  { value: '1:1', label: '1:1', icon: <Square size={16} strokeWidth={1.5} />, ratio: 1 },
  { value: '4:3', label: '4:3', icon: <RectangleHorizontal size={16} strokeWidth={1.5} />, ratio: 4 / 3 },
  { value: '16:9', label: '16:9', icon: <RectangleHorizontal size={16} strokeWidth={1.5} />, ratio: 16 / 9 },
  { value: '3:4', label: '3:4', icon: <RectangleVertical size={16} strokeWidth={1.5} />, ratio: 3 / 4 },
  { value: '9:16', label: '9:16', icon: <RectangleVertical size={16} strokeWidth={1.5} />, ratio: 9 / 16 },
];

/**
 * 图片裁剪组件
 * 支持上传图片、选择裁剪比例、拖拽调整裁剪框、下载裁剪后图片
 */
export function ImageCrop() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, box: { x: 0, y: 0, width: 0, height: 0 } });
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [displayScale, setDisplayScale] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * 获取当前比例值
   */
  const getCurrentRatio = (): number | null => {
    const option = ratioOptions.find((o) => o.value === aspectRatio);
    return option?.ratio ?? null;
  };

  /**
   * 处理文件上传
   * 读取图片并初始化裁剪框
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

        const minDim = Math.min(img.width, img.height);
        const cropSize = minDim * 0.7;
        const cropX = (img.width - cropSize) / 2;
        const cropY = (img.height - cropSize) / 2;
        setCropBox({ x: cropX, y: cropY, width: cropSize, height: cropSize });
        setCroppedImage(null);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  /**
   * 计算显示缩放比例
   */
  useEffect(() => {
    if (!imageContainerRef.current || originalSize.width === 0) return;

    const containerWidth = imageContainerRef.current.clientWidth;
    const containerHeight = 500;

    const scaleX = containerWidth / originalSize.width;
    const scaleY = containerHeight / originalSize.height;
    setDisplayScale(Math.min(scaleX, scaleY, 1));
  }, [originalSize]);

  /**
   * 当比例变化时调整裁剪框
   */
  useEffect(() => {
    if (originalSize.width === 0 || cropBox.width === 0) return;

    const ratio = getCurrentRatio();
    if (ratio === null) return;

    let newWidth = cropBox.width;
    let newHeight = newWidth / ratio;

    if (newHeight > originalSize.height * 0.9) {
      newHeight = originalSize.height * 0.9;
      newWidth = newHeight * ratio;
    }

    if (newWidth > originalSize.width * 0.9) {
      newWidth = originalSize.width * 0.9;
      newHeight = newWidth / ratio;
    }

    let newX = cropBox.x + (cropBox.width - newWidth) / 2;
    let newY = cropBox.y + (cropBox.height - newHeight) / 2;

    newX = Math.max(0, Math.min(originalSize.width - newWidth, newX));
    newY = Math.max(0, Math.min(originalSize.height - newHeight, newY));

    setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  }, [aspectRatio]);

  /**
   * 处理裁剪框拖拽开始
   */
  const handleCropMouseDown = (e: React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBox },
    });
  };

  /**
   * 处理鼠标移动
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragType) return;

    const dx = (e.clientX - dragStart.x) / displayScale;
    const dy = (e.clientY - dragStart.y) / displayScale;

    if (dragType === 'move') {
      let newX = dragStart.box.x + dx;
      let newY = dragStart.box.y + dy;

      newX = Math.max(0, Math.min(originalSize.width - cropBox.width, newX));
      newY = Math.max(0, Math.min(originalSize.height - cropBox.height, newY));

      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (dragType === 'resize') {
      const ratio = getCurrentRatio();
      let newWidth = dragStart.box.width + dx;
      let newHeight = ratio ? newWidth / ratio : dragStart.box.height + dy;

      const minSize = 50;
      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);

      if (ratio) {
        if (newWidth > originalSize.width - dragStart.box.x) {
          newWidth = originalSize.width - dragStart.box.x;
          newHeight = newWidth / ratio;
        }
        if (newHeight > originalSize.height - dragStart.box.y) {
          newHeight = originalSize.height - dragStart.box.y;
          newWidth = newHeight * ratio;
        }
      } else {
        newWidth = Math.min(newWidth, originalSize.width - dragStart.box.x);
        newHeight = Math.min(newHeight, originalSize.height - dragStart.box.y);
      }

      setCropBox((prev) => ({
        ...prev,
        x: dragStart.box.x,
        y: dragStart.box.y,
        width: newWidth,
        height: newHeight,
      }));
    }
  }, [isDragging, dragType, dragStart, displayScale, cropBox.width, cropBox.height, originalSize, aspectRatio]);

  /**
   * 处理鼠标释放
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  /**
   * 绑定全局鼠标事件
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /**
   * 执行裁剪
   * 将裁剪区域绘制到 canvas 并导出
   */
  const performCrop = useCallback(() => {
    if (!originalImage || cropBox.width === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      const x = Math.round(cropBox.x);
      const y = Math.round(cropBox.y);
      const width = Math.round(cropBox.width);
      const height = Math.round(cropBox.height);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/png');
      setCroppedImage(dataUrl);
    };
    img.src = originalImage;
  }, [originalImage, cropBox]);

  /**
   * 下载裁剪后的图片
   */
  const downloadCroppedImage = () => {
    if (!croppedImage && cropBox.width > 0) {
      performCrop();
      setTimeout(() => {
        doDownload();
      }, 100);
    } else {
      doDownload();
    }
  };

  const doDownload = () => {
    const img = croppedImage || canvasRef.current?.toDataURL('image/png');
    if (!img || !originalFile) return;

    const link = document.createElement('a');
    const originalName = originalFile.name.replace(/\.[^/.]+$/, '');
    link.download = `${originalName}-cropped.png`;
    link.href = img;
    link.click();
    reportToolUsage('image-crop');
  };

  /**
   * 清除当前图片
   */
  const clearImage = () => {
    setOriginalImage(null);
    setOriginalFile(null);
    setOriginalSize({ width: 0, height: 0 });
    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
    setCroppedImage(null);
    setAspectRatio('free');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 切换比例
   */
  const handleRatioChange = (ratio: AspectRatio) => {
    setAspectRatio(ratio);
    setCroppedImage(null);
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
              上传图片进行裁剪
            </h3>
            <p className="text-sm text-ink-500 mb-4">
              支持自由裁剪和多种比例裁剪
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
        /* 裁剪界面 */
        <div className="space-y-6">
          {/* 比例选择 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-5">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Crop size={16} strokeWidth={1.5} className="text-amber-accent" />
              裁剪比例
            </h3>
            <div className="flex flex-wrap gap-2">
              {ratioOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRatioChange(option.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    aspectRatio === option.value
                      ? 'bg-amber-accent/10 text-amber-dark border border-amber-accent/30'
                      : 'bg-cream-50 text-ink-700 hover:bg-cream-100 border border-transparent'
                  )}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 裁剪画布 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-5">
            <div
              ref={imageContainerRef}
              className="relative mx-auto overflow-hidden rounded-lg bg-cream-100"
              style={{
                width: originalSize.width * displayScale,
                height: originalSize.height * displayScale,
                maxWidth: '100%',
                maxHeight: 500,
              }}
            >
              {/* 原图 */}
              <img
                src={originalImage}
                alt="待裁剪"
                className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                draggable={false}
              />

              {/* 裁剪框 */}
              {cropBox.width > 0 && (
                <>
                  {/* 遮罩层 */}
                  <div
                    className="absolute inset-0 bg-ink-900/50 pointer-events-none"
                    style={{
                      clipPath: `polygon(
                        0 0, 100% 0, 100% 100%, 0 100%,
                        0 0,
                        ${cropBox.x * displayScale}px ${cropBox.y * displayScale}px,
                        ${(cropBox.x + cropBox.width) * displayScale}px ${cropBox.y * displayScale}px,
                        ${(cropBox.x + cropBox.width) * displayScale}px ${(cropBox.y + cropBox.height) * displayScale}px,
                        ${cropBox.x * displayScale}px ${(cropBox.y + cropBox.height) * displayScale}px,
                        ${cropBox.x * displayScale}px ${cropBox.y * displayScale}px
                      )`,
                    }}
                  />

                  {/* 裁剪框边框 */}
                  <div
                    className="absolute border-2 border-white cursor-move"
                    style={{
                      left: cropBox.x * displayScale,
                      top: cropBox.y * displayScale,
                      width: cropBox.width * displayScale,
                      height: cropBox.height * displayScale,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                    }}
                    onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                  >
                    {/* 网格线 */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50" />
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50" />
                    </div>

                    {/* 移动图标提示 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/50 text-white text-xs">
                        <Move size={12} strokeWidth={1.5} />
                        拖动移动
                      </div>
                    </div>

                    {/* 右下角调整大小手柄 */}
                    <div
                      className="absolute -right-1 -bottom-1 w-4 h-4 bg-white border-2 border-amber-accent rounded-sm cursor-se-resize"
                      onMouseDown={(e) => handleCropMouseDown(e, 'resize')}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 裁剪信息 */}
            {cropBox.width > 0 && (
              <div className="mt-4 flex items-center justify-center gap-6 text-sm text-ink-500">
                <span>
                  位置: ({Math.round(cropBox.x)}, {Math.round(cropBox.y)})
                </span>
                <span>
                  尺寸: {Math.round(cropBox.width)} × {Math.round(cropBox.height)}
                </span>
              </div>
            )}
          </div>

          {/* 预览裁剪结果 */}
          {croppedImage && (
            <div className="bg-white rounded-xl shadow-card border border-cream-100 p-5">
              <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3">裁剪预览</h3>
              <div className="flex justify-center">
                <div className="relative rounded-lg overflow-hidden bg-cream-100 inline-block">
                  <img
                    src={croppedImage}
                    alt="裁剪预览"
                    className="max-w-full max-h-64 object-contain"
                  />
                </div>
              </div>
            </div>
          )}

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
              onClick={performCrop}
              className="px-5 py-2.5 rounded-lg border border-amber-accent/30 bg-amber-accent/10
                         text-amber-dark text-sm font-medium
                         hover:bg-amber-accent/20 transition-all duration-200
                         flex items-center gap-2"
            >
              <Crop size={16} strokeWidth={1.5} />
              预览裁剪
            </button>
            <button
              onClick={downloadCroppedImage}
              className="px-6 py-2.5 rounded-lg bg-moss text-white
                         text-sm font-medium
                         hover:bg-moss-light transition-all duration-200
                         flex items-center gap-2"
            >
              <Download size={16} strokeWidth={1.5} />
              下载裁剪图片
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
