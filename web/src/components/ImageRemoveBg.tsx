import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  Eraser,
  Paintbrush,
  Palette,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Move,
  Undo2,
  Redo2,
  RefreshCw,
  EyeOff,
  Check,
  Repeat2,
} from 'lucide-react';
import { reportToolUsage } from '../api/request';

/**
 * 工具模式：keep=画笔涂抹保留，erase=画笔涂抹擦除
 */
type ToolMode = 'keep' | 'erase';

/**
 * 预设背景颜色
 */
type BgPreset = 'transparent' | 'white' | 'black' | 'red' | 'green' | 'blue' | 'custom';

/**
 * 抠图图片项接口
 */
interface RemoveBgItem {
  id: string;
  file: File;
  originalUrl: string;
  originalImage: HTMLImageElement | null;
  maskCanvas: HTMLCanvasElement | null;
  history: ImageData[];
  historyIndex: number;
}

/**
 * 获取文件扩展名
 */
function getExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext ? ext.toLowerCase() : 'png';
}

/**
 * 抠图透明组件
 * 画笔涂抹圈选保留区域，未涂抹区域透明化，支持背景替换
 */
export function ImageRemoveBg() {
  const [items, setItems] = useState<RemoveBgItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [toolMode, setToolMode] = useState<ToolMode>('keep');
  const [brushSize, setBrushSize] = useState(40);
  const [bgPreset, setBgPreset] = useState<BgPreset>('transparent');
  const [customBgColor, setCustomBgColor] = useState('#ff6b6b');
  const [isDrawing, setIsDrawing] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const activeItem = items.find((it) => it.id === activeItemId);

  /**
   * 棋盘格背景样式（显示透明区域）
   */
  const checkerboardStyle = {
    backgroundImage:
      'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundColor: '#fff',
  };

  /**
   * 获取当前显示的背景颜色样式
   */
  const getBgStyle = (): React.CSSProperties => {
    switch (bgPreset) {
      case 'transparent':
        return checkerboardStyle;
      case 'white':
        return { backgroundColor: '#ffffff' };
      case 'black':
        return { backgroundColor: '#000000' };
      case 'red':
        return { backgroundColor: '#ff6b6b' };
      case 'green':
        return { backgroundColor: '#4ecdc4' };
      case 'blue':
        return { backgroundColor: '#45b7d1' };
      case 'custom':
        return { backgroundColor: customBgColor };
      default:
        return checkerboardStyle;
    }
  };

  /**
   * 加载图片文件
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
   * 创建初始遮罩画布（全白色=全部保留/显示）
   */
  const createMaskCanvas = (width: number, height: number, fillValue: number = 255): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = fillValue === 255 ? '#fff' : '#000';
      ctx.fillRect(0, 0, width, height);
    }
    return canvas;
  };

  /**
   * 保存历史状态
   */
  const saveHistory = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId || !it.maskCanvas) return it;
        const ctx = it.maskCanvas.getContext('2d');
        if (!ctx) return it;
        const imageData = ctx.getImageData(0, 0, it.maskCanvas.width, it.maskCanvas.height);
        const newHistory = it.history.slice(0, it.historyIndex + 1);
        newHistory.push(imageData);
        if (newHistory.length > 30) newHistory.shift();
        return {
          ...it,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      })
    );
  }, []);

  /**
   * 撤销
   */
  const undo = () => {
    if (!activeItem || activeItem.historyIndex <= 0) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== activeItemId || !it.maskCanvas) return it;
        const newIndex = it.historyIndex - 1;
        const ctx = it.maskCanvas.getContext('2d');
        if (ctx && it.history[newIndex]) {
          ctx.putImageData(it.history[newIndex], 0, 0);
        }
        return { ...it, historyIndex: newIndex };
      })
    );
    renderDisplayCanvas();
  };

  /**
   * 重做
   */
  const redo = () => {
    if (!activeItem || activeItem.historyIndex >= activeItem.history.length - 1) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== activeItemId || !it.maskCanvas) return it;
        const newIndex = it.historyIndex + 1;
        const ctx = it.maskCanvas.getContext('2d');
        if (ctx && it.history[newIndex]) {
          ctx.putImageData(it.history[newIndex], 0, 0);
        }
        return { ...it, historyIndex: newIndex };
      })
    );
    renderDisplayCanvas();
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: RemoveBgItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.type === 'image/gif') continue;

      const id = Math.random().toString(36).substr(2, 9);
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      const maskCanvas = createMaskCanvas(img.naturalWidth, img.naturalHeight, 255);

      newItems.push({
        id,
        file,
        originalUrl: url,
        originalImage: img,
        maskCanvas,
        history: [],
        historyIndex: -1,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    if (newItems.length > 0) {
      setActiveItemId(newItems[0].id);
      setTimeout(() => {
        saveHistory(newItems[0].id);
        renderDisplayCanvas();
      }, 100);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * 填充遮罩：全部保留（白色）或全部清除（黑色）
   */
  const fillMask = (value: number) => {
    if (!activeItem || !activeItem.maskCanvas) return;
    saveHistory(activeItem.id);
    const ctx = activeItem.maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = value === 255 ? '#fff' : '#000';
    ctx.fillRect(0, 0, activeItem.maskCanvas.width, activeItem.maskCanvas.height);
    renderDisplayCanvas();
  };

  /**
   * 重置图片（全部保留/显示）
   */
  const resetImage = () => {
    fillMask(255);
  };

  /**
   * 反选遮罩：保留变删除，删除变保留
   * 用于实现"圈里保留、圈外透明"：用保留画笔画圈后，点反选即可
   */
  const invertMask = () => {
    if (!activeItem || !activeItem.maskCanvas) return;
    saveHistory(activeItem.id);
    const ctx = activeItem.maskCanvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, activeItem.maskCanvas.width, activeItem.maskCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255 - imageData.data[i];
      imageData.data[i + 1] = 255 - imageData.data[i + 1];
      imageData.data[i + 2] = 255 - imageData.data[i + 2];
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    renderDisplayCanvas();
  };

  /**
   * 获取画布上的坐标
   */
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = activeItem?.maskCanvas;
    if (!displayCanvas || !maskCanvas) return null;

    const rect = displayCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  /**
   * 在遮罩上画笔绘制
   * @param x 坐标X
   * @param y 坐标Y
   * @param isKeep true=保留（白色），false=擦除（黑色）
   */
  const brushAt = (x: number, y: number, isKeep: boolean) => {
    if (!activeItem || !activeItem.maskCanvas) return;
    const canvas = activeItem.maskCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radius = brushSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isKeep ? '#fff' : '#000';
    ctx.fill();
    ctx.restore();
  };

  /**
   * 画线（涂抹时的连续绘制）
   */
  const drawLine = (x1: number, y1: number, x2: number, y2: number, isKeep: boolean) => {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(1, Math.ceil(dist / (brushSize / 4)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      brushAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, isKeep);
    }
  };

  /**
   * 指针按下处理
   */
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeItem || !activeItem.maskCanvas) return;

    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      if (e.button !== 0) return;
      cx = e.clientX;
      cy = e.clientY;
    }

    if (spacePressed || (isFullscreen && spacePressed)) {
      setIsPanning(true);
      setLastPos({ x: cx - panOffset.x, y: cy - panOffset.y });
      e.preventDefault();
      return;
    }

    setIsDrawing(true);
    setLastPos({ x: cx, y: cy });
    saveHistory(activeItem.id);
    const coords = getCanvasCoords(cx, cy);
    if (coords) {
      brushAt(coords.x, coords.y, toolMode === 'keep');
      renderDisplayCanvas();
    }
    e.preventDefault();
  };

  /**
   * 指针移动处理
   */
  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning) {
      let cx: number, cy: number;
      if ('touches' in e) {
        if (e.touches.length !== 1) return;
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      setPanOffset({ x: cx - lastPos.x, y: cy - lastPos.y });
      return;
    }

    if (!isDrawing) return;

    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }

    const coords = getCanvasCoords(cx, cy);
    const lastCoords = getCanvasCoords(lastPos.x, lastPos.y);
    if (coords && lastCoords) {
      drawLine(lastCoords.x, lastCoords.y, coords.x, coords.y, toolMode === 'keep');
      renderDisplayCanvas();
    }
    setLastPos({ x: cx, y: cy });
  };

  /**
   * 指针抬起处理
   */
  const handlePointerUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  /**
   * 滚轮缩放
   */
  const handleWheel = (e: React.WheelEvent) => {
    if (!isFullscreen) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasZoom((z) => Math.max(0.3, Math.min(5, z * delta)));
  };

  /**
   * 渲染显示画布
   */
  const renderDisplayCanvas = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    const item = activeItem;
    if (!displayCanvas || !item || !item.originalImage || !item.maskCanvas) return;

    displayCanvas.width = item.originalImage.naturalWidth;
    displayCanvas.height = item.originalImage.naturalHeight;
    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    if (bgPreset !== 'transparent') {
      let bgColor = '#ffffff';
      switch (bgPreset) {
        case 'white': bgColor = '#ffffff'; break;
        case 'black': bgColor = '#000000'; break;
        case 'red': bgColor = '#ff6b6b'; break;
        case 'green': bgColor = '#4ecdc4'; break;
        case 'blue': bgColor = '#45b7d1'; break;
        case 'custom': bgColor = customBgColor; break;
      }
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    }

    ctx.drawImage(item.originalImage, 0, 0);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 68, 68, 0.45)';
    ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(item.maskCanvas, 0, 0);
    ctx.restore();
  }, [activeItem, bgPreset, customBgColor]);

  /**
   * 导出图片
   */
  const exportImage = () => {
    if (!activeItem || !activeItem.originalImage || !activeItem.maskCanvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = activeItem.originalImage.naturalWidth;
    exportCanvas.height = activeItem.originalImage.naturalHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    if (bgPreset !== 'transparent') {
      let bgColor = '#ffffff';
      switch (bgPreset) {
        case 'white': bgColor = '#ffffff'; break;
        case 'black': bgColor = '#000000'; break;
        case 'red': bgColor = '#ff6b6b'; break;
        case 'green': bgColor = '#4ecdc4'; break;
        case 'blue': bgColor = '#45b7d1'; break;
        case 'custom': bgColor = customBgColor; break;
      }
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    ctx.save();
    ctx.drawImage(activeItem.originalImage, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(activeItem.maskCanvas, 0, 0);
    ctx.restore();

    const ext = bgPreset === 'transparent' ? 'png' : getExtension(activeItem.file.name);
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const link = document.createElement('a');
    link.download = `${activeItem.file.name.replace(/\.[^/.]+$/, '')}-nobg.${ext}`;
    link.href = exportCanvas.toDataURL(mime, 0.95);
    link.click();
    reportToolUsage('image-remove-bg');
  };

  /**
   * 删除图片
   */
  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item) URL.revokeObjectURL(item.originalUrl);
      const next = prev.filter((it) => it.id !== id);
      if (activeItemId === id) {
        setActiveItemId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  /**
   * 清空所有
   */
  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.originalUrl));
    setItems([]);
    setActiveItemId(null);
    resetView();
  };

  const resetView = () => {
    setCanvasZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    resetView();
  };

  useEffect(() => {
    renderDisplayCanvas();
  }, [renderDisplayCanvas]);

  useEffect(() => {
    if (activeItem && activeItem.maskCanvas) {
      renderDisplayCanvas();
    }
  }, [activeItemId, bgPreset, customBgColor, renderDisplayCanvas]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeItem]);

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-cream-50 flex flex-col'
    : 'space-y-4';

  const bgPresets: { id: BgPreset; label: string; color?: string }[] = [
    { id: 'transparent', label: '透明' },
    { id: 'white', label: '白', color: '#fff' },
    { id: 'black', label: '黑', color: '#000' },
    { id: 'red', label: '红', color: '#ff6b6b' },
    { id: 'green', label: '绿', color: '#4ecdc4' },
    { id: 'blue', label: '蓝', color: '#45b7d1' },
  ];

  return (
    <div className={containerClass}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {items.length === 0 ? (
        <div
          className="bg-white rounded-xl shadow-card border border-cream-100 p-12
                     border-dashed border-2 hover:border-amber-accent/50 hover:bg-cream-50/30
                     transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-100 flex items-center justify-center">
              <Eraser size={28} strokeWidth={1.5} className="text-amber-accent" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink-900 mb-2">抠图透明</h3>
            <p className="text-sm text-ink-500 mb-4">画笔圈选保留区域，未选中区域自动透明化，支持背景替换</p>
            <button
              className="px-6 py-2.5 rounded-lg bg-amber-accent text-white text-sm font-medium
                         hover:bg-amber-dark transition-all inline-flex items-center gap-2 shadow-sm"
            >
              <Upload size={16} strokeWidth={1.5} />
              选择图片
            </button>
            <p className="text-xs text-ink-400 mt-3">支持JPG、PNG、WebP格式，本地处理不上传</p>
          </div>
        </div>
      ) : (
        <>
          {/* 工具栏 */}
          <div
            className={`bg-white ${isFullscreen ? 'border-b border-cream-200 p-3 overflow-x-auto' : 'rounded-xl shadow-card border border-cream-100 p-4'}`}
          >
            <div className="flex flex-wrap items-start gap-3">
              {/* 工具选择 */}
              <div className="flex items-center gap-1 bg-cream-100 rounded-lg p-1 flex-shrink-0">
                <button
                  onClick={() => setToolMode('keep')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1
                             ${toolMode === 'keep' ? 'bg-white text-moss shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}
                  title="涂抹去掉红色，保留该区域图片"
                >
                  <Paintbrush size={14} strokeWidth={1.5} />
                  保留
                </button>
                <button
                  onClick={() => setToolMode('erase')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1
                             ${toolMode === 'erase' ? 'bg-white text-brick shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}
                  title="涂抹加回红色，删除该区域（变透明）"
                >
                  <Eraser size={14} strokeWidth={1.5} />
                  擦除
                </button>
              </div>

              <div className="w-px h-8 bg-cream-200 hidden sm:block flex-shrink-0" />

              {/* 快捷操作 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={invertMask}
                  className="px-3 py-2 rounded-lg border border-amber-accent/30 hover:bg-amber-50 text-amber-accent text-sm flex items-center gap-1 font-medium"
                  title="反选：圈选保留区域后点此，圈外自动变透明"
                >
                  <Repeat2 size={14} strokeWidth={1.5} />
                  反选
                </button>
                <button
                  onClick={() => fillMask(0)}
                  className="px-3 py-2 rounded-lg border border-brick/30 hover:bg-brick/5 text-brick text-sm flex items-center gap-1"
                  title="全部变透明，重新涂抹保留区域"
                >
                  <EyeOff size={14} strokeWidth={1.5} />
                  全透明
                </button>
              </div>

              {/* 撤销/重做/重置 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={undo}
                  disabled={!activeItem || activeItem.historyIndex <= 0}
                  className="p-2 rounded-lg border border-cream-300 hover:bg-cream-50 text-ink-600 disabled:opacity-40"
                  title="撤销 (Ctrl+Z)"
                >
                  <Undo2 size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={redo}
                  disabled={!activeItem || activeItem.historyIndex >= activeItem.history.length - 1}
                  className="p-2 rounded-lg border border-cream-300 hover:bg-cream-50 text-ink-600 disabled:opacity-40"
                  title="重做 (Ctrl+Y)"
                >
                  <Redo2 size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={resetImage}
                  className="p-2 rounded-lg border border-cream-300 hover:bg-cream-50 text-ink-600"
                  title="重置图片"
                >
                  <RefreshCw size={16} strokeWidth={1.5} />
                </button>
              </div>

              <div className="w-px h-8 bg-cream-200 hidden md:block flex-shrink-0" />

              {/* 笔刷大小 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Paintbrush size={14} className="text-ink-400" />
                <span className="text-xs text-ink-500 whitespace-nowrap">笔刷</span>
                <input
                  type="range"
                  min={5}
                  max={150}
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-28 accent-amber-accent"
                />
                <span className="text-xs text-ink-700 w-10">{brushSize}px</span>
              </div>

              <div className="w-px h-8 bg-cream-200 hidden md:block flex-shrink-0" />

              {/* 背景选择 */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Palette size={14} className="text-ink-400" />
                <span className="text-xs text-ink-500 whitespace-nowrap">背景</span>
                {bgPresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setBgPreset(p.id)}
                    className={`w-7 h-7 rounded-md border-2 transition-all flex items-center justify-center text-xs
                               ${bgPreset === p.id ? 'border-amber-accent scale-110' : 'border-cream-300'}`}
                    style={p.id === 'transparent' ? checkerboardStyle : { backgroundColor: p.color }}
                    title={p.label}
                  >
                    {p.id === 'transparent' && <span className="text-ink-500 text-[10px]">透</span>}
                  </button>
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => {
                      setCustomBgColor(e.target.value);
                      setBgPreset('custom');
                    }}
                    className={`w-7 h-7 rounded-md border-2 cursor-pointer p-0.5
                               ${bgPreset === 'custom' ? 'border-amber-accent scale-110' : 'border-cream-300'}`}
                  />
                </div>
              </div>

              <div className="flex-1" />

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg border border-cream-300 hover:bg-cream-50 text-ink-600 flex-shrink-0"
              >
                {isFullscreen ? <Minimize2 size={16} strokeWidth={1.5} /> : <Maximize2 size={16} strokeWidth={1.5} />}
              </button>
            </div>

            {/* 非全屏下的操作按钮 */}
            {!isFullscreen && (
              <div className="flex flex-wrap gap-3 justify-center mt-4 pt-4 border-t border-cream-100">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-lg border border-cream-300 bg-white text-ink-700 text-sm font-medium
                             hover:bg-cream-50 transition-colors flex items-center gap-2"
                >
                  <Upload size={16} strokeWidth={1.5} />
                  添加图片
                </button>
                <button
                  onClick={exportImage}
                  className="px-6 py-2.5 rounded-lg bg-amber-accent text-white text-sm font-medium shadow-sm
                             hover:bg-amber-dark transition-colors flex items-center gap-2"
                >
                  <Download size={16} strokeWidth={1.5} />
                  下载图片
                </button>
                <button
                  onClick={clearAll}
                  className="px-5 py-2.5 rounded-lg border border-brick/30 bg-white text-brick text-sm font-medium
                             hover:bg-brick/5 transition-colors flex items-center gap-2"
                >
                  <Eraser size={16} strokeWidth={1.5} />
                  清空
                </button>
              </div>
            )}
          </div>

          {/* 画布区域 */}
          <div
            ref={canvasContainerRef}
            className={`bg-white ${isFullscreen ? 'flex-1 overflow-hidden relative' : 'rounded-xl shadow-card border border-cream-100 overflow-hidden relative'}`}
            style={isFullscreen ? {} : { minHeight: '520px' }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchEnd={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            <div className="absolute inset-0" style={getBgStyle()} />

            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${canvasZoom})`,
                transition: isDrawing || isPanning ? 'none' : 'transform 0.2s ease',
              }}
            >
              {activeItem ? (
                <div className="relative shadow-xl">
                  <canvas
                    ref={displayCanvasRef}
                    className={`max-w-full object-contain select-none rounded
                               ${isFullscreen ? 'max-h-[75vh]' : 'max-h-[480px]'}
                               ${spacePressed ? 'cursor-grab' : 'cursor-crosshair'}`}
                  />
                </div>
              ) : (
                <div className="text-ink-400">请选择一张图片</div>
              )}
            </div>

            {/* 提示 */}
            {activeItem && (
              <div className="absolute top-4 left-4 text-xs text-ink-500 bg-white/90 rounded-lg px-3 py-2 shadow-md">
                <div className="flex items-center gap-1">
                  <Check size={12} className={toolMode === 'keep' ? 'text-moss' : 'text-ink-400'} />
                  <span className={toolMode === 'keep' ? 'text-moss font-medium' : ''}>保留画笔</span>
                  <span className="mx-1">|</span>
                  <Check size={12} className={toolMode === 'erase' ? 'text-brick' : 'text-ink-400'} />
                  <span className={toolMode === 'erase' ? 'text-brick font-medium' : ''}>擦除画笔</span>
                </div>
                <div className="mt-1 text-ink-400">
                  <span className="text-brick">红色</span>区域为透明区。用<span className="text-moss">保留</span>画笔画圈后点「反选」可圈外透明{isFullscreen ? ' · 空格拖拽平移' : ''} · Ctrl+Z撤销
                </div>
              </div>
            )}

            {isFullscreen && (
              <>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 rounded-lg px-3 py-2 shadow-md">
                  <button
                    onClick={() => setCanvasZoom((z) => Math.max(0.3, z - 0.1))}
                    className="p-1 hover:bg-cream-100 rounded"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs text-ink-600 w-12 text-center">{Math.round(canvasZoom * 100)}%</span>
                  <button
                    onClick={() => setCanvasZoom((z) => Math.min(5, z + 0.1))}
                    className="p-1 hover:bg-cream-100 rounded"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button onClick={resetView} className="p-1 hover:bg-cream-100 rounded ml-1">
                    <Move size={16} />
                  </button>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={exportImage}
                    className="px-4 py-2 rounded-lg bg-amber-accent text-white text-sm font-medium shadow-md
                               hover:bg-amber-dark transition-colors flex items-center gap-2"
                  >
                    <Download size={14} />
                    下载
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 缩略图列表 */}
          {items.length > 1 && (
            <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
              <p className="text-xs text-ink-500 mb-3">图片列表（点击切换预览）</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {items.map((item) => (
                  <div key={item.id} className="relative flex-shrink-0">
                    <button
                      onClick={() => {
                        setActiveItemId(item.id);
                        setTimeout(renderDisplayCanvas, 50);
                      }}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                                 ${activeItemId === item.id ? 'border-amber-accent shadow-md' : 'border-cream-200'}`}
                    >
                      <img src={item.originalUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brick text-white flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
