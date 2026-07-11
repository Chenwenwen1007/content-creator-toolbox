import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Check,
  X,
  Loader2,
  Crop,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { reportToolUsage } from '../api/request';

/**
 * 旋转图片项数据接口
 */
interface RotateItem {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  selected: boolean;
  processedUrl: string | null;
  processedBlob: Blob | null;
  status: 'idle' | 'processing' | 'done' | 'error';
}

/**
 * 获取文件扩展名
 */
function getExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext ? ext.toLowerCase() : 'jpg';
}

/**
 * 根据扩展名获取MIME类型
 */
function getMime(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return map[ext] || 'image/jpeg';
}

/**
 * 旋转图片并导出
 * @param img 图片元素
 * @param rotation 旋转角度（度）
 * @param cropBlank 是否裁剪空白区域
 * @param mime 输出MIME类型
 * @returns Promise<{ blob: Blob; width: number; height: number }>
 */
function rotateAndExport(
  img: HTMLImageElement,
  rotation: number,
  cropBlank: boolean,
  mime: string
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas不可用'));
      return;
    }

    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    let newWidth: number;
    let newHeight: number;

    if (cropBlank) {
      const rotatedWidth = img.width * cos + img.height * sin;
      const rotatedHeight = img.width * sin + img.height * cos;
      newWidth = Math.round(rotatedWidth);
      newHeight = Math.round(rotatedHeight);
    } else {
      newWidth = img.width;
      newHeight = img.height;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, newWidth, newHeight);

    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('导出失败'));
          return;
        }
        resolve({ blob, width: newWidth, height: newHeight });
      },
      mime,
      0.92
    );
  });
}

/**
 * 将角度规范化到0-360范围
 */
function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

/**
 * 角度吸附到15°的倍数（按住Shift时）
 */
function snapAngle(angle: number, snap: number = 15): number {
  return Math.round(angle / snap) * snap;
}

/**
 * 图片旋转组件
 * 支持按钮快速旋转、拖拽自由旋转、Shift吸附、多图批量/单独处理、裁剪空白、双指缩放
 */
export function ImageRotate() {
  const [items, setItems] = useState<RotateItem[]>([]);
  const [cropBlank, setCropBlank] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartAngle, setDragStartAngle] = useState(0);
  const [dragStartRotation, setDragStartRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const touchStartRef = useRef<{ distance: number; angle: number; rotation: number } | null>(null);

  const activeItem = items.find((it) => it.id === activeItemId);

  /**
   * 处理文件上传
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: RotateItem[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const id = Math.random().toString(36).substr(2, 9);
      const url = URL.createObjectURL(file);

      const item: RotateItem = {
        id,
        file,
        url,
        width: 0,
        height: 0,
        rotation: 0,
        scale: 1,
        selected: false,
        processedUrl: null,
        processedBlob: null,
        status: 'idle',
      };

      const img = new Image();
      img.onload = () => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, width: img.naturalWidth, height: img.naturalHeight } : it
          )
        );
      };
      img.src = url;

      newItems.push(item);
    });

    setItems((prev) => [...prev, ...newItems]);
    if (newItems.length > 0 && !activeItemId) {
      setActiveItemId(newItems[0].id);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * 更新单个图片项
   */
  const updateItem = useCallback((id: string, updates: Partial<RotateItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  }, []);

  /**
   * 更新选中的图片（批量旋转用）
   */
  const updateSelectedItems = useCallback((updates: Partial<RotateItem>) => {
    setItems((prev) => prev.map((it) => (it.selected ? { ...it, ...updates } : it)));
  }, []);

  /**
   * 获取操作目标：如果有选中的图，操作选中的；否则操作当前激活的
   */
  const getTargetItems = useCallback((): RotateItem[] => {
    const selected = items.filter((it) => it.selected);
    if (selected.length > 0) return selected;
    if (activeItemId) {
      const active = items.find((it) => it.id === activeItemId);
      return active ? [active] : [];
    }
    return [];
  }, [items, activeItemId]);

  /**
   * 旋转指定角度
   * @param delta 角度增量
   */
  const rotateBy = (delta: number) => {
    const targets = getTargetItems();
    targets.forEach((item) => {
      const newRotation = normalizeAngle(item.rotation + delta);
      updateItem(item.id, { rotation: newRotation });
    });
  };

  /**
   * 重置旋转角度
   */
  const resetRotation = () => {
    const targets = getTargetItems();
    targets.forEach((item) => {
      updateItem(item.id, { rotation: 0 });
    });
  };

  /**
   * 计算鼠标相对于图片中心的角度
   */
  const getAngleFromCenter = useCallback(
    (clientX: number, clientY: number, element: HTMLElement): number => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    },
    []
  );

  /**
   * 处理鼠标/触摸按下（开始拖拽旋转）
   */
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    if (isPanning) return;

    const item = items.find((it) => it.id === itemId);
    if (!item) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag]')) return;

    e.preventDefault();

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        touchStartRef.current = {
          distance: Math.sqrt(dx * dx + dy * dy),
          angle: (Math.atan2(dy, dx) * 180) / Math.PI,
          rotation: item.rotation,
        };
        return;
      }
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const container = previewRef.current;
    if (!container) return;

    const imageEl = imageRefs.current.get(itemId);
    if (!imageEl) return;

    setIsDragging(true);
    setActiveItemId(itemId);
    const angle = getAngleFromCenter(clientX, clientY, imageEl.parentElement || imageEl);
    setDragStartAngle(angle);
    setDragStartRotation(item.rotation);

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      let cx: number;
      let cy: number;
      let shiftKey = false;

      if ('touches' in ev) {
        if (ev.touches.length === 2 && touchStartRef.current) {
          const t1 = ev.touches[0];
          const t2 = ev.touches[1];
          const dx = t2.clientX - t1.clientX;
          const dy = t2.clientY - t1.clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const scale = dist / touchStartRef.current.distance;
          setCanvasZoom((z) => Math.max(0.5, Math.min(3, z * scale)));
          touchStartRef.current.distance = dist;
          return;
        }
        cx = ev.touches[0].clientX;
        cy = ev.touches[0].clientY;
      } else {
        cx = ev.clientX;
        cy = ev.clientY;
        shiftKey = ev.shiftKey;
      }

      const parentEl = imageEl.parentElement;
      if (!parentEl) return;

      const currentAngle = getAngleFromCenter(cx, cy, parentEl);
      let deltaAngle = currentAngle - dragStartAngle;
      let newRotation = dragStartRotation + deltaAngle;

      if (shiftKey) {
        newRotation = snapAngle(newRotation, 15);
      }

      newRotation = normalizeAngle(newRotation);
      updateItem(itemId, { rotation: newRotation });
    };

    const handleUp = () => {
      setIsDragging(false);
      touchStartRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  };

  /**
   * 画布平移（空格+拖拽或空白区域拖拽）
   */
  const handleCanvasPointerDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-image-item]')) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });

    const handleMove = (ev: MouseEvent) => {
      setPanOffset({ x: ev.clientX - panStart.x, y: ev.clientY - panStart.y });
    };

    const handleUp = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  /**
   * 滚轮缩放画布
   */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasZoom((z) => Math.max(0.3, Math.min(3, z * delta)));
  };

  /**
   * 切换图片选中状态（批量操作）
   */
  const toggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  /**
   * 导出单个图片
   */
  const exportItem = async (item: RotateItem): Promise<RotateItem> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const ext = getExtension(item.file.name);
          const mime = getMime(ext);
          const { blob } = await rotateAndExport(img, item.rotation, cropBlank, mime);
          const url = URL.createObjectURL(blob);
          resolve({
            ...item,
            processedUrl: url,
            processedBlob: blob,
            status: 'done',
          });
        } catch (err) {
          resolve({ ...item, status: 'error' });
        }
      };
      img.onerror = () => resolve({ ...item, status: 'error' });
      img.src = item.url;
    });
  };

  /**
   * 导出所有图片
   */
  const handleExportAll = async () => {
    setIsProcessing(true);
    setItems((prev) => prev.map((it) => ({ ...it, status: 'processing' as const })));

    const results = await Promise.all(items.map((item) => exportItem(item)));
    setItems(results);

    const successCount = results.filter((r) => r.status === 'done').length;
    if (successCount > 0) {
      reportToolUsage('image-rotate');
    }
    setIsProcessing(false);
  };

  /**
   * 下载单个图片
   */
  const downloadItem = (item: RotateItem) => {
    if (!item.processedUrl) return;
    const link = document.createElement('a');
    const name = item.file.name.replace(/\.[^/.]+$/, '');
    const ext = getExtension(item.file.name);
    link.download = `${name}-rotated.${ext}`;
    link.href = item.processedUrl;
    link.click();
  };

  /**
   * 下载所有图片
   */
  const downloadAll = () => {
    items
      .filter((it) => it.status === 'done' && it.processedUrl)
      .forEach((item, i) => {
        setTimeout(() => downloadItem(item), i * 200);
      });
  };

  /**
   * 删除单张图片
   */
  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item) {
        URL.revokeObjectURL(item.url);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
      }
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
    items.forEach((item) => {
      URL.revokeObjectURL(item.url);
      if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    });
    setItems([]);
    setActiveItemId(null);
    setCanvasZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  /**
   * 重置视图
   */
  const resetView = () => {
    setCanvasZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // 空格键按住时平移光标
  const [spacePressed, setSpacePressed] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
              <RefreshCw size={28} strokeWidth={1.5} className="text-amber-accent" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink-900 mb-2">
              上传图片进行旋转
            </h3>
            <p className="text-sm text-ink-500 mb-4">
              支持JPG、PNG、WebP格式，可批量选择多张图片
            </p>
            <p className="text-xs text-ink-400 mb-4">
              拖拽旋转·按钮旋转·Shift吸附角度·双指缩放
            </p>
            <button
              className="px-6 py-2.5 rounded-lg bg-amber-accent text-white
                         text-sm font-medium
                         hover:bg-amber-dark transition-all duration-200
                         inline-flex items-center gap-2"
            >
              <Upload size={16} strokeWidth={1.5} />
              选择图片
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* 旋转按钮 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => rotateBy(-90)}
                  className="p-2.5 rounded-lg border border-cream-300 bg-white hover:bg-cream-50
                             text-ink-700 transition-colors"
                  title="向左旋转90°"
                >
                  <RotateCcw size={18} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => rotateBy(90)}
                  className="p-2.5 rounded-lg border border-cream-300 bg-white hover:bg-cream-50
                             text-ink-700 transition-colors"
                  title="向右旋转90°"
                >
                  <RotateCw size={18} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => rotateBy(180)}
                  className="px-3 py-2.5 rounded-lg border border-cream-300 bg-white hover:bg-cream-50
                             text-ink-700 text-sm transition-colors"
                  title="旋转180°"
                >
                  180°
                </button>
                <button
                  onClick={resetRotation}
                  className="p-2.5 rounded-lg border border-cream-300 bg-white hover:bg-cream-50
                             text-ink-700 transition-colors"
                  title="重置"
                >
                  <RefreshCw size={18} strokeWidth={1.5} />
                </button>
              </div>

              <div className="w-px h-8 bg-cream-200" />

              {/* 裁剪选项 */}
              <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cropBlank}
                  onChange={(e) => setCropBlank(e.target.checked)}
                  className="w-4 h-4 rounded border-cream-300 text-amber-accent focus:ring-amber-accent"
                />
                <Crop size={16} strokeWidth={1.5} className="text-ink-500" />
                裁剪空白区域
              </label>

              {/* 当前角度显示 */}
              {activeItem && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-accent/10 text-amber-accent text-sm font-medium">
                  {Math.round(activeItem.rotation)}°
                </div>
              )}

              <div className="flex-1" />

              {/* 缩放控制 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCanvasZoom((z) => Math.max(0.3, z - 0.1))}
                  className="p-2 rounded-lg hover:bg-cream-100 text-ink-600"
                >
                  <ZoomOut size={16} strokeWidth={1.5} />
                </button>
                <span className="text-xs text-ink-500 w-12 text-center">
                  {Math.round(canvasZoom * 100)}%
                </span>
                <button
                  onClick={() => setCanvasZoom((z) => Math.min(3, z + 0.1))}
                  className="p-2 rounded-lg hover:bg-cream-100 text-ink-600"
                >
                  <ZoomIn size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={resetView}
                  className="p-2 rounded-lg hover:bg-cream-100 text-ink-600"
                  title="重置视图"
                >
                  <Maximize2 size={16} strokeWidth={1.5} />
                </button>
              </div>
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
              onClick={handleExportAll}
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
                  处理中...
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  应用旋转（{items.length}张）
                </>
              )}
            </button>
            {items.some((it) => it.status === 'done') && (
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
              <X size={16} strokeWidth={1.5} />
              清空
            </button>
          </div>

          {/* 预览区域 */}
          <div
            ref={previewRef}
            className={`bg-white rounded-xl shadow-card border border-cream-100 overflow-hidden relative
                       ${spacePressed || isPanning ? 'cursor-grab' : isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
            style={{ height: '500px' }}
            onMouseDown={handleCanvasPointerDown}
            onWheel={handleWheel}
          >
            {/* 网格背景 */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(#e8e4dd 1px, transparent 1px), linear-gradient(90deg, #e8e4dd 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* 图片容器 */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${canvasZoom})`,
                transition: isDragging || isPanning ? 'none' : 'transform 0.2s ease',
              }}
            >
              <div className="relative flex flex-wrap gap-4 p-8 items-start justify-center max-w-full">
                {items.map((item) => (
                  <div
                    key={item.id}
                    data-image-item
                    className={`relative group ${activeItemId === item.id ? 'z-10' : ''}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setActiveItemId(item.id);
                      handlePointerDown(e, item.id);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveItemId(item.id);
                      handlePointerDown(e, item.id);
                    }}
                  >
                    {/* 勾选框（批量选择） */}
                    <div
                      data-no-drag
                      className="absolute -top-2 -left-2 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                    >
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                                   ${item.selected
                                     ? 'bg-amber-accent border-amber-accent text-white'
                                     : 'bg-white border-cream-300 hover:border-amber-accent'
                                   }`}
                      >
                        {item.selected && <Check size={14} strokeWidth={2.5} />}
                      </div>
                    </div>

                    {/* 删除按钮 */}
                    <button
                      data-no-drag
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-brick text-white
                                 flex items-center justify-center opacity-0 group-hover:opacity-100
                                 transition-opacity hover:bg-brick/80"
                    >
                      <X size={12} />
                    </button>

                    {/* 旋转手柄 */}
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100
                                 transition-opacity"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-accent text-white flex items-center justify-center cursor-grab shadow-md">
                        <RefreshCw size={12} />
                      </div>
                      <div className="w-px h-6 bg-amber-accent/50 mx-auto" />
                    </div>

                    {/* 图片 */}
                    <div
                      className={`relative overflow-hidden rounded-lg border-2 transition-shadow
                                 ${activeItemId === item.id
                                   ? 'border-amber-accent shadow-lg shadow-amber-accent/20'
                                   : item.selected
                                     ? 'border-moss shadow-md'
                                     : 'border-cream-200 hover:border-cream-400'
                                 }
                                 ${isDragging && activeItemId === item.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                    >
                      <img
                        ref={(el) => {
                          if (el) imageRefs.current.set(item.id, el);
                          else imageRefs.current.delete(item.id);
                        }}
                        src={item.processedUrl || item.url}
                        alt={item.file.name}
                        className="max-w-[280px] max-h-[350px] object-contain bg-white select-none pointer-events-none"
                        style={{
                          transform: `rotate(${item.rotation}deg)`,
                          transition: isDragging && activeItemId === item.id ? 'none' : 'transform 0.1s ease',
                        }}
                        draggable={false}
                      />

                      {/* 角度指示器 */}
                      {activeItemId === item.id && isDragging && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-ink-900/80 text-white text-xs font-medium">
                          {Math.round(item.rotation)}°
                        </div>
                      )}

                      {/* 处理状态 */}
                      {item.status === 'processing' && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Loader2 size={24} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* 文件名和角度 */}
                    <div className="mt-2 text-center">
                      <p className="text-xs text-ink-500 truncate max-w-[280px]">{item.file.name}</p>
                      <p className="text-xs text-amber-accent font-medium">{Math.round(item.rotation)}°</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 提示 */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-xs text-ink-400 pointer-events-none">
              <span>拖拽图片旋转 · 按住Shift吸附15° · 滚轮缩放 · 空格拖拽平移</span>
              {items.some((it) => it.selected) && (
                <span className="text-moss font-medium">
                  已选中{items.filter((it) => it.selected).length}张（批量旋转）
                </span>
              )}
            </div>
          </div>

          {/* 图片列表（缩略图） */}
          {items.length > 1 && (
            <div className="bg-white rounded-xl shadow-card border border-cream-100 p-4">
              <p className="text-xs text-ink-500 mb-3">图片列表（点击切换，勾选批量旋转）</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveItemId(item.id)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                               ${activeItemId === item.id ? 'border-amber-accent shadow-md' : 'border-cream-200'}
                               ${item.selected ? 'ring-2 ring-moss ring-offset-1' : ''}`}
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
