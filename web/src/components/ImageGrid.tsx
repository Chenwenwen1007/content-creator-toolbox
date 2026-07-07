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
} from 'lucide-react';
import { cn } from '../lib/utils';

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
 * 多宫格切图组件
 * 支持多种宫格布局、图片上传、拖拽排序、自定义间隔和背景色、导出图片
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
   * 应用模板
   * @param template 宫格模板
   */
  const applyTemplate = (template: GridTemplate) => {
    setRows(template.rows);
    setCols(template.cols);
  };

  /**
   * 解析颜色输入
   * 支持 #RRGGBB 和 rgb(r,g,b) 格式
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
   * 处理放置
   * 交换两张图片的位置
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
   * 将整个画布绘制到 canvas 并导出为 PNG
   */
  const exportImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellSize = 400;
    const totalWidth = cols * cellSize + (cols + 1) * gap;
    const totalHeight = rows * cellSize + (rows + 1) * gap;

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

        const x = gap + col * (cellSize + gap);
        const y = gap + row * (cellSize + gap);

        if (imageItem) {
          try {
            const img = await loadImage(imageItem.src);
            const scale = Math.max(cellSize / img.width, cellSize / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = x + (cellSize - scaledWidth) / 2;
            const offsetY = y + (cellSize - scaledHeight) / 2;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, cellSize, cellSize);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            ctx.restore();
          } catch {
            ctx.fillStyle = '#EFE8DA';
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        } else {
          ctx.fillStyle = '#EFE8DA';
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    const link = document.createElement('a');
    link.download = `image-grid-${rows}x${cols}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [rows, cols, gap, bgColor, images]);

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
        <div className="lg:w-64 flex-shrink-0 space-y-5">
          {/* 模板选择 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <GripVertical size={14} strokeWidth={1.5} className="text-amber-accent" />
              常用模板
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
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    setColorInput(e.target.value);
                  }}
                  className="w-10 h-10 rounded-lg border border-cream-300 cursor-pointer
                             bg-white p-0.5"
                />
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => handleColorInputChange(e.target.value)}
                  placeholder="#RRGGBB 或 rgb(r,g,b)"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-cream-300 bg-white
                             text-ink-900 text-sm font-mono
                             focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                             transition-all"
                />
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
            className="bg-white rounded-xl shadow-card border border-cream-100 p-6"
            style={{ backgroundColor: bgColor }}
          >
            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: `${gap}px`,
                aspectRatio: `${cols} / ${rows}`,
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

          {/* 提示信息 */}
          <div className="mt-4 text-xs text-ink-500 text-center">
            共 {rows * cols} 个格子，已填充 {images.filter((i) => i !== null).length} 张图片
          </div>
        </div>
      </div>
    </div>
  );
}
