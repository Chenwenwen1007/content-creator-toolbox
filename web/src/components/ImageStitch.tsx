import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Palette,
  Move,
  GripVertical,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  Plus,
  Minus,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { reportToolUsage } from '../api/request';

/**
 * 拼接方向：horizontal=横向，vertical=竖向
 */
type StitchDirection = 'horizontal' | 'vertical';

/**
 * 拼接图片项接口
 */
interface StitchItem {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
}

/**
 * 图片拼接组件
 * 支持横向/竖向拼接、拖拽排序、间距调节、背景色设置
 */
export function ImageStitch() {
  const [items, setItems] = useState<StitchItem[]>([]);
  const [direction, setDirection] = useState<StitchDirection>('vertical');
  const [gap, setGap] = useState(0);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [colorInput, setColorInput] = useState('#FFFFFF');
  const [uniformSize, setUniformSize] = useState(false);
  const [outputSize, setOutputSize] = useState(1080);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 解析颜色输入
   */
  const parseColor = (input: string): string | null => {
    const trimmed = input.trim();
    const hexMatch = trimmed.match(/^#([0-9A-Fa-f]{6})$/);
    if (hexMatch) return trimmed;
    const hexShortMatch = trimmed.match(/^#([0-9A-Fa-f]{3})$/);
    if (hexShortMatch) {
      const hex = hexShortMatch[1];
      return '#' + hex.split('').map((c) => c + c).join('');
    }
    const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
      }
    }
    return null;
  };

  /**
   * 处理颜色输入变化
   */
  const handleColorInputChange = (value: string) => {
    setColorInput(value);
    const parsed = parseColor(value);
    if (parsed) setBgColor(parsed);
  };

  /**
   * 加载图片
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
   * 处理文件上传
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: StitchItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const id = Math.random().toString(36).substr(2, 9);
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        newItems.push({
          id,
          file,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        URL.revokeObjectURL(url);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * 删除图片
   */
  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((it) => it.id !== id);
    });
  };

  /**
   * 清空所有
   */
  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
    setItems([]);
  };

  /**
   * 拖拽开始
   */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  /**
   * 拖拽经过
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };

  /**
   * 拖拽离开
   */
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  /**
   * 放置（重新排序）
   */
  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    if (draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, removed);
    setItems(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * 拖拽结束
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * 导出拼接图片
   */
  const exportImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;

    const loadedImages = await Promise.all(
      items.map((item) => loadImage(item.url))
    );

    if (direction === 'vertical') {
      let canvasW: number;
      let drawWidths: number[];
      let drawHeights: number[];

      if (uniformSize) {
        canvasW = outputSize;
        drawWidths = loadedImages.map(() => outputSize);
        drawHeights = loadedImages.map((img) => Math.round(img.naturalHeight * (outputSize / img.naturalWidth)));
      } else {
        canvasW = Math.max(...loadedImages.map((img) => img.naturalWidth));
        drawWidths = loadedImages.map((img) => img.naturalWidth);
        drawHeights = loadedImages.map((img) => img.naturalHeight);
      }

      const totalH = drawHeights.reduce((sum, h) => sum + h, 0) + gap * (items.length - 1);
      canvas.width = canvasW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasW, totalH);

      let y = 0;
      for (let i = 0; i < loadedImages.length; i++) {
        const img = loadedImages[i];
        const w = drawWidths[i];
        const h = drawHeights[i];
        const x = Math.round((canvasW - w) / 2);
        ctx.drawImage(img, x, y, w, h);
        y += h + gap;
      }
    } else {
      let canvasH: number;
      let drawWidths: number[];
      let drawHeights: number[];

      if (uniformSize) {
        canvasH = outputSize;
        drawHeights = loadedImages.map(() => outputSize);
        drawWidths = loadedImages.map((img) => Math.round(img.naturalWidth * (outputSize / img.naturalHeight)));
      } else {
        canvasH = Math.max(...loadedImages.map((img) => img.naturalHeight));
        drawHeights = loadedImages.map((img) => img.naturalHeight);
        drawWidths = loadedImages.map((img) => img.naturalWidth);
      }

      const totalW = drawWidths.reduce((sum, w) => sum + w, 0) + gap * (items.length - 1);
      canvas.width = totalW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, totalW, canvasH);

      let x = 0;
      for (let i = 0; i < loadedImages.length; i++) {
        const img = loadedImages[i];
        const w = drawWidths[i];
        const h = drawHeights[i];
        const y = Math.round((canvasH - h) / 2);
        ctx.drawImage(img, x, y, w, h);
        x += w + gap;
      }
    }

    const link = document.createElement('a');
    link.download = `image-stitch-${direction === 'vertical' ? 'v' : 'h'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    reportToolUsage('image-stitch');
  }, [items, direction, gap, bgColor, uniformSize, outputSize]);

  /**
   * 计算预览尺寸
   */
  const getPreviewStyle = (item: StitchItem): React.CSSProperties => {
    if (direction === 'vertical') {
      const w = 200;
      const h = (item.height / item.width) * w;
      return { width: `${w}px`, height: `${h}px` };
    } else {
      const h = 120;
      const w = (item.width / item.height) * h;
      return { width: `${w}px`, height: `${h}px` };
    }
  };

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
          {/* 拼接方向 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3">拼接方向</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection('vertical')}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all text-sm',
                  direction === 'vertical'
                    ? 'bg-amber-accent/10 text-amber-dark border border-amber-accent/30'
                    : 'bg-cream-50 text-ink-700 hover:bg-cream-100 border border-transparent'
                )}
              >
                <AlignVerticalJustifyStart size={20} strokeWidth={1.5} />
                <span className="font-medium">竖向拼接</span>
              </button>
              <button
                onClick={() => setDirection('horizontal')}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all text-sm',
                  direction === 'horizontal'
                    ? 'bg-amber-accent/10 text-amber-dark border border-amber-accent/30'
                    : 'bg-cream-50 text-ink-700 hover:bg-cream-100 border border-transparent'
                )}
              >
                <AlignHorizontalJustifyStart size={20} strokeWidth={1.5} />
                <span className="font-medium">横向拼接</span>
              </button>
            </div>
          </div>

          {/* 统一尺寸开关 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-sm font-semibold text-ink-900">统一尺寸</h3>
              <button
                onClick={() => setUniformSize(!uniformSize)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors',
                  uniformSize ? 'bg-amber-accent' : 'bg-cream-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    uniformSize ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
            <p className="text-xs text-ink-400 mb-3">
              {uniformSize ? '统一缩放到指定尺寸' : '保持原图尺寸纯拼接'}
            </p>
            {uniformSize && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-500">{direction === 'vertical' ? '统一宽度' : '统一高度'}</span>
                  <span className="text-sm font-medium text-ink-900">{outputSize}px</span>
                </div>
                <input
                  type="range"
                  min={480}
                  max={2000}
                  step={20}
                  value={outputSize}
                  onChange={(e) => setOutputSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-amber-accent"
                />
                <div className="flex justify-between text-xs text-ink-400">
                  <span>480px</span>
                  <span>2000px</span>
                </div>
              </div>
            )}
          </div>

          {/* 间距设置 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <h3 className="font-serif text-sm font-semibold text-ink-900 mb-3">图片间距</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">间距</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGap(Math.max(0, gap - 5))}
                    className="w-7 h-7 rounded-md bg-cream-100 hover:bg-cream-200 flex items-center justify-center text-ink-600"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-medium text-ink-900 w-12 text-center">{gap}px</span>
                  <button
                    onClick={() => setGap(gap + 5)}
                    className="w-7 h-7 rounded-md bg-cream-100 hover:bg-cream-200 flex items-center justify-center text-ink-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={gap}
                onChange={(e) => setGap(parseInt(e.target.value))}
                className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-amber-accent"
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
                  className="w-16 h-10 lg:w-20 lg:h-12 rounded-lg border border-cream-300 cursor-pointer bg-white p-0.5 flex-shrink-0"
                />
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => handleColorInputChange(e.target.value)}
                  placeholder="#FFFFFF"
                  className="min-w-0 flex-1 px-2 py-2 lg:py-2.5 rounded-lg border border-cream-300 bg-white text-ink-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['#FFFFFF', '#000000', '#F7F3EC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#A29BFE'].map((c) => (
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
              className="w-full px-4 py-2.5 rounded-lg bg-amber-accent text-white text-sm font-medium hover:bg-amber-dark transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Upload size={16} strokeWidth={1.5} />
              添加图片
            </button>
            <button
              onClick={exportImage}
              disabled={items.length < 2}
              className="w-full px-4 py-2.5 rounded-lg bg-moss text-white text-sm font-medium hover:bg-moss-light transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} strokeWidth={1.5} />
              导出拼接图
            </button>
            {items.length > 0 && (
              <button
                onClick={clearAll}
                className="w-full px-4 py-2.5 rounded-lg border border-cream-300 bg-white text-ink-700 text-sm font-medium hover:bg-cream-50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} strokeWidth={1.5} />
                清空全部
              </button>
            )}
          </div>
        </div>

        {/* 右侧预览区 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4 sm:p-6 overflow-auto">
            {items.length === 0 ? (
              <div
                className="border-2 border-dashed border-cream-300 rounded-xl p-12 text-center cursor-pointer hover:border-amber-accent/50 hover:bg-cream-50/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-100 flex items-center justify-center">
                  <Upload size={28} strokeWidth={1.5} className="text-amber-accent" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-900 mb-2">上传图片开始拼接</h3>
                <p className="text-sm text-ink-500">支持横向/竖向拼接，拖拽调整顺序</p>
                <p className="text-xs text-ink-400 mt-2">建议上传2张及以上图片</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-ink-500 mb-4 flex items-center gap-2">
                  <Move size={14} />
                  拖拽图片左侧手柄可调整顺序（{items.length}张图片）
                </p>
                <div
                  className={cn(
                    'flex gap-2 mx-auto p-4 rounded-lg overflow-auto',
                    direction === 'vertical' ? 'flex-col items-center max-w-[240px]' : 'flex-row items-start'
                  )}
                  style={{ backgroundColor: bgColor }}
                >
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'relative group cursor-move transition-all flex-shrink-0',
                        draggedIndex === index && 'opacity-50 scale-95',
                        dragOverIndex === index && draggedIndex !== index && (
                          direction === 'vertical' ? 'ring-2 ring-amber-accent ring-offset-2 translate-y-2' : 'ring-2 ring-amber-accent ring-offset-2 translate-x-2'
                        )
                      )}
                      style={getPreviewStyle(item)}
                    >
                      <img
                        src={item.url}
                        alt={`图片 ${index + 1}`}
                        className="w-full h-full object-cover rounded shadow-sm"
                        draggable={false}
                      />
                      <div className="absolute left-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-1 rounded bg-white/90 text-ink-600 cursor-grab">
                          <GripVertical size={14} />
                        </div>
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="p-1 rounded-full bg-white/90 text-brick hover:bg-white transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px]">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                {items.length < 2 && (
                  <p className="text-center text-sm text-ink-400 mt-4">请至少添加2张图片进行拼接</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
