import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Grid2X2,
  Grid3X3,
  Rows,
  Columns,
  Grid2x2Check,
  Upload,
  Download,
  Trash2,
  Palette,
  Move,
  GripVertical,
  Maximize2,
  Ratio,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { reportToolUsage } from '../api/request';

/**
 * 宫格模板配置
 */
interface GridTemplate {
  name: string;
  rows: number;
  cols: number;
  icon: React.ReactNode;
}

/**
 * 宽高比预设
 */
interface AspectPreset {
  name: string;
  ratio: number;
  label: string;
}

/**
 * 图片项数据
 */
interface ImageItem {
  id: string;
  src: string;
  file: File;
}

/**
 * 常用宫格模板
 */
const templates: GridTemplate[] = [
  { name: '2×2', rows: 2, cols: 2, icon: <Grid2X2 size={18} strokeWidth={1.5} /> },
  { name: '3×3', rows: 3, cols: 3, icon: <Grid3X3 size={18} strokeWidth={1.5} /> },
  { name: '2×3', rows: 2, cols: 3, icon: <Rows size={18} strokeWidth={1.5} /> },
  { name: '3×2', rows: 3, cols: 2, icon: <Columns size={18} strokeWidth={1.5} /> },
  { name: '4×4', rows: 4, cols: 4, icon: <Grid2x2Check size={18} strokeWidth={1.5} /> },
];

/**
 * 宽高比预设选项
 */
const aspectPresets: AspectPreset[] = [
  { name: '1:1', ratio: 1, label: '正方形' },
  { name: '4:5', ratio: 4 / 5, label: '小红书' },
  { name: '3:4', ratio: 3 / 4, label: '竖版' },
  { name: '9:16', ratio: 9 / 16, label: '抖音' },
  { name: '16:9', ratio: 16 / 9, label: '横屏' },
  { name: '4:3', ratio: 4 / 3, label: '横版' },
  { name: '3:2', ratio: 3 / 2, label: '照片' },
];

/**
 * 多宫格组件
 * 支持多种宫格布局、自定义格子宽高比、图片上传拖拽排序、自定义间隔和背景色、导出尺寸调节
 */
export function ImageGrid() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [gap, setGap] = useState(8);
  const [bgColor, setBgColor] = useState('#F7F3EC');
  const [colorInput, setColorInput] = useState('#F7F3EC');
  const [images, setImages] = useState<(ImageItem | null)[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [cellRatio, setCellRatio] = useState(1);
  const [cellSize, setCellSize] = useState(400);
  const [customRatioW, setCustomRatioW] = useState('1');
  const [customRatioH, setCustomRatioH] = useState('1');
  const [useCustomRatio, setUseCustomRatio] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 获取当前生效的宽高比
   */
  const effectiveRatio = useCustomRatio
    ? (parseInt(customRatioW) || 1) / (parseInt(customRatioH) || 1)
    : cellRatio;

  /**
   * 初始化图片数组
   */
  useEffect(() => {
    const total = rows * cols;
    setImages((prev) => {
      if (prev.length === total) return prev;
      if (prev.length < total) {
        return [...prev, ...Array(total - prev.length).fill(null)];
      }
      return prev.slice(0, total);
    });
  }, [rows, cols]);

  /**
   * 应用宫格模板
   * @param template 宫格模板
   */
  const applyTemplate = (template: GridTemplate) => {
    setRows(template.rows);
    setCols(template.cols);
  };

  /**
   * 应用宽高比预设
   * @param preset 宽高比预设
   */
  const applyAspectPreset = (preset: AspectPreset) => {
    setCellRatio(preset.ratio);
    setUseCustomRatio(false);
  };

  /**
   * 应用自定义宽高比
   */
  const applyCustomRatio = () => {
    const w = parseInt(customRatioW);
    const h = parseInt(customRatioH);
    if (w > 0 && h > 0) {
      setUseCustomRatio(true);
    }
  };

  /**
   * 解析颜色输入
   * 支持 #RRGGBB、#RGB 和 rgb(r,g,b) 格式
   */
  const parseColor = (input: string): string | null => {
    const trimmed = input.trim();

    const hexMatch = trimmed.match(/^#([0-9A-Fa-f]{6})$/);
    if (hexMatch) return trimmed;

    const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
      }
    }

    const hexShortMatch = trimmed.match(/^#([0-9A-Fa-f]{3})$/);
    if (hexShortMatch) {
      const hex = hexShortMatch[1];
      return '#' + hex.split('').map((c) => c + c).join('');
    }

    return null;
  };

  /**
   * 处理颜色输入变化
   */
  const handleColorInputChange = (value: string) => {
    setColorInput(value);
    const parsed = parseColor(value);
    if (parsed) {
      setBgColor(parsed);
    }
  };

  /**
   * 处理文件上传
   * 自动填充到空格子中
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = [...images];
    let emptyIndex = newImages.findIndex((img) => img === null);

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (emptyIndex === -1) return;

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const src = URL.createObjectURL(file);
      newImages[emptyIndex] = { id, src, file };

      emptyIndex = newImages.findIndex((img, idx) => idx > emptyIndex && img === null);
    });

    setImages(newImages);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 处理拖拽开始
   */
  const handleDragStart = (index: number) => {
    if (!images[index]) return;
    setDraggedIndex(index);
  };

  /**
   * 处理拖拽经过
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  /**
   * 处理放置（交换图片位置）
   */
  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const temp = newImages[draggedIndex];
    newImages[draggedIndex] = newImages[index];
    newImages[index] = temp;

    setImages(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * 处理拖拽结束
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * 删除指定位置的图片
   */
  const removeImage = (index: number) => {
    const newImages = [...images];
    if (newImages[index]) {
      URL.revokeObjectURL(newImages[index]!.src);
    }
    newImages[index] = null;
    setImages(newImages);
  };

  /**
   * 清空所有图片
   */
  const clearAllImages = () => {
    images.forEach((img) => {
      if (img) URL.revokeObjectURL(img.src);
    });
    setImages(Array(rows * cols).fill(null));
  };

  /**
   * 加载图片并返回 Image 对象
   */
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  /**
   * 导出宫格图片
   * 根据格子宽高比和输出尺寸绘制到canvas并下载
   */
  const exportImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellW = cellSize;
    const cellH = Math.round(cellSize / effectiveRatio);
    const totalWidth = cols * cellW + (cols + 1) * gap;
    const totalHeight = rows * cellH + (rows + 1) * gap;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const imageItem = images[index];

        const x = gap + col * (cellW + gap);
        const y = gap + row * (cellH + gap);

        if (imageItem) {
          try {
            const img = await loadImage(imageItem.src);
            const imgRatio = img.width / img.height;
            const cellRatioVal = cellW / cellH;

            let drawW: number, drawH: number;
            if (imgRatio > cellRatioVal) {
              drawH = cellH;
              drawW = img.width * (cellH / img.height);
            } else {
              drawW = cellW;
              drawH = img.height * (cellW / img.width);
            }

            const offsetX = x + (cellW - drawW) / 2;
            const offsetY = y + (cellH - drawH) / 2;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, cellW, cellH);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            ctx.restore();
          } catch {
            ctx.fillStyle = '#EFE8DA';
            ctx.fillRect(x, y, cellW, cellH);
          }
        } else {
          ctx.fillStyle = '#EFE8DA';
          ctx.fillRect(x, y, cellW, cellH);
        }
      }
    }

    const link = document.createElement('a');
    link.download = `image-grid-${rows}x${cols}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    reportToolUsage('image-grid');
  }, [rows, cols, gap, bgColor, images, cellSize, effectiveRatio]);

  return (
    <div className="space-y-6 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左侧工具栏 */}
        <div className="lg:w-72 flex-shrink-0 space-y-4">
          {/* 模板选择 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <GripVertical size={14} strokeWidth={1.5} className="text-amber-accent" />
              宫格模板
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {templates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-xs',
                    rows === template.rows && cols === template.cols
                      ? 'bg-amber-accent/10 text-amber-dark border border-amber-accent/30'
                      : 'bg-cream-50 text-ink-700 hover:bg-cream-100 border border-transparent'
                  )}
                >
                  {template.icon}
                  <span className="font-medium">{template.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 自定义行列 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3">自定义行列</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-ink-500 w-12">行数</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-cream-300 bg-white
                             text-ink-900 text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                             transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-ink-500 w-12">列数</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-cream-300 bg-white
                             text-ink-900 text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                             transition-all"
                />
              </div>
            </div>
          </div>

          {/* 格子比例 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <Ratio size={14} strokeWidth={1.5} className="text-amber-accent" />
              格子比例
            </h3>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {aspectPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyAspectPreset(preset)}
                  className={cn(
                    'px-1 py-1.5 rounded-md text-xs font-medium transition-all',
                    !useCustomRatio && Math.abs(cellRatio - preset.ratio) < 0.001
                      ? 'bg-amber-accent text-white shadow-sm'
                      : 'bg-cream-50 text-ink-600 hover:bg-cream-100'
                  )}
                  title={preset.label}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={customRatioW}
                onChange={(e) => setCustomRatioW(e.target.value)}
                className="w-12 px-2 py-1 rounded-md border border-cream-300 text-center text-sm
                           focus:outline-none focus:ring-1 focus:ring-amber-accent/30 focus:border-amber-accent"
                placeholder="宽"
              />
              <span className="text-ink-400 text-xs">:</span>
              <input
                type="number"
                min={1}
                value={customRatioH}
                onChange={(e) => setCustomRatioH(e.target.value)}
                className="w-12 px-2 py-1 rounded-md border border-cream-300 text-center text-sm
                           focus:outline-none focus:ring-1 focus:ring-amber-accent/30 focus:border-amber-accent"
                placeholder="高"
              />
              <button
                onClick={applyCustomRatio}
                className={cn(
                  'px-2 py-1 rounded-md text-xs font-medium transition-all',
                  useCustomRatio
                    ? 'bg-moss text-white'
                    : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                )}
              >
                应用
              </button>
            </div>
          </div>

          {/* 输出尺寸 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <Maximize2 size={14} strokeWidth={1.5} className="text-amber-accent" />
              输出尺寸
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">每格宽度</span>
                <span className="text-sm font-medium text-ink-900">{cellSize}px</span>
              </div>
              <input
                type="range"
                min={200}
                max={1200}
                step={50}
                value={cellSize}
                onChange={(e) => setCellSize(parseInt(e.target.value))}
                className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer
                           accent-amber-accent"
              />
              <div className="flex justify-between text-xs text-ink-400">
                <span>200px</span>
                <span>1200px</span>
              </div>
              <p className="text-xs text-ink-400 mt-1">
                预计输出：{cols * cellSize + (cols + 1) * gap} × {Math.round(rows * cellSize / effectiveRatio) + (rows + 1) * gap}px
              </p>
            </div>
          </div>

          {/* 间隔设置 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3">图片间隔</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">间距</span>
                <span className="text-sm font-medium text-ink-900">{gap}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={gap}
                onChange={(e) => setGap(parseInt(e.target.value))}
                className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer
                           accent-amber-accent"
              />
            </div>
          </div>

          {/* 背景颜色 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <Palette size={14} strokeWidth={1.5} className="text-amber-accent" />
              背景颜色
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    setColorInput(e.target.value);
                  }}
                  className="w-16 h-10 lg:w-20 lg:h-12 rounded-lg border border-cream-300 cursor-pointer
                             bg-white p-0.5 flex-shrink-0"
                />
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => handleColorInputChange(e.target.value)}
                  placeholder="#F7F3EC"
                  className="min-w-0 flex-1 px-2 py-2 lg:py-2.5 rounded-lg border border-cream-300 bg-white
                             text-ink-900 text-xs font-mono
                             focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                             transition-all"
                />
              </div>
              {/* 常用颜色 */}
              <div className="flex flex-wrap gap-1.5">
                {['#F7F3EC', '#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#A29BFE'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setBgColor(c);
                      setColorInput(c);
                    }}
                    className="w-6 h-6 rounded-md border border-cream-200 transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2.5 rounded-lg bg-amber-accent text-white
                         text-sm font-medium
                         hover:bg-amber-dark transition-all duration-200
                         flex items-center justify-center gap-2"
            >
              <Upload size={16} strokeWidth={1.5} />
              上传图片
            </button>
            <button
              onClick={exportImage}
              className="w-full px-4 py-2.5 rounded-lg bg-moss text-white
                         text-sm font-medium
                         hover:bg-moss-light transition-all duration-200
                         flex items-center justify-center gap-2"
            >
              <Download size={16} strokeWidth={1.5} />
              导出图片
            </button>
            <button
              onClick={clearAllImages}
              className="w-full px-4 py-2.5 rounded-lg border border-cream-300 bg-white
                         text-ink-700 text-sm font-medium
                         hover:bg-cream-50 transition-all duration-200
                         flex items-center justify-center gap-2"
            >
              <Trash2 size={16} strokeWidth={1.5} />
              清空图片
            </button>
          </div>
        </div>

        {/* 右侧画布区 */}
        <div className="flex-1 min-w-0">
          <div
            className="bg-white rounded-xl shadow-card border border-cream-100 p-4 sm:p-6 overflow-auto"
          >
            <div
              className="mx-auto"
              style={{
                backgroundColor: bgColor,
                padding: gap,
                borderRadius: '0.5rem',
              }}
            >
              <div
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                  gap: `${gap}px`,
                  aspectRatio: `${cols} / ${rows / effectiveRatio}`,
                  maxWidth: `${cols * 200 + (cols + 1) * gap}px`,
                }}
              >
                {images.map((image, index) => (
                  <div
                    key={index}
                    draggable={!!image}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'relative rounded-lg overflow-hidden bg-cream-100 group',
                      image ? 'cursor-move' : 'cursor-default',
                      draggedIndex === index && 'opacity-50 scale-95',
                      dragOverIndex === index && draggedIndex !== index && 'ring-2 ring-amber-accent ring-offset-2'
                    )}
                    style={{ aspectRatio: `${effectiveRatio}` }}
                  >
                    {image ? (
                      <>
                        <img
                          src={image.src}
                          alt={`图片 ${index + 1}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                        <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/30 transition-colors">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(index);
                              }}
                              className="p-1.5 rounded-full bg-white/90 text-brick hover:bg-white transition-colors"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-ink-700 text-xs">
                              <Move size={12} strokeWidth={1.5} />
                              拖拽移动
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center border-2 border-dashed border-cream-300 rounded-lg cursor-pointer hover:border-amber-accent/50 hover:bg-cream-50/50 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="text-center">
                          <Upload size={24} strokeWidth={1.5} className="text-ink-300 mx-auto mb-1" />
                          <span className="text-xs text-ink-300">点击上传</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="mt-4 text-xs text-ink-500 text-center">
            共 {rows * cols} 个格子，已填充 {images.filter((i) => i !== null).length} 张图片
          </div>
        </div>
      </div>
    </div>
  );
}
