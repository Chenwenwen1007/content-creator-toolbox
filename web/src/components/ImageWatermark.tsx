import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  Type,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  X,
  Loader2,
  RotateCw,
  Grid3X3,
  Trash2,
  Search,
  RefreshCcw,
  Plus,
  Minus,
  Lock,
  Layers,
} from 'lucide-react';
import { reportToolUsage } from '../api/request';

/**
 * 水印类型
 */
type WatermarkType = 'text' | 'image';

/**
 * 水印模式：single=单水印，tile=平铺
 */
type WatermarkMode = 'single' | 'tile';

/**
 * 水印模板定义
 */
interface WatermarkTemplate {
  id: string;
  name: string;
  mode: WatermarkMode;
  rotation: number;
  opacity: number;
  scale: number;
  tileSpacingX?: number;
  tileSpacingY?: number;
  defaultText?: string;
  color?: string;
}

/**
 * 水印配置接口
 */
interface WatermarkConfig {
  type: WatermarkType;
  mode: WatermarkMode;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  color?: string;
  imageUrl?: string;
  tileSpacingX: number;
  tileSpacingY: number;
}

/**
 * 水印图片项接口
 */
interface WatermarkItem {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  processedUrl: string | null;
  processedBlob: Blob | null;
  status: 'idle' | 'processing' | 'done' | 'error';
}

/**
 * 九宫格位置
 */
const GRID_POSITIONS = [
  { name: '左上', x: 0.1, y: 0.1 },
  { name: '上中', x: 0.5, y: 0.1 },
  { name: '右上', x: 0.9, y: 0.1 },
  { name: '左中', x: 0.1, y: 0.5 },
  { name: '居中', x: 0.5, y: 0.5 },
  { name: '右中', x: 0.9, y: 0.5 },
  { name: '左下', x: 0.1, y: 0.9 },
  { name: '下中', x: 0.5, y: 0.9 },
  { name: '右下', x: 0.9, y: 0.9 },
];

/**
 * 旋转步长选项
 */
const ROTATION_STEPS = [
  { label: '0.1°', value: 0.1 },
  { label: '0.5°', value: 0.5 },
  { label: '1°', value: 1 },
  { label: '5°', value: 5 },
  { label: '15°', value: 15 },
];

/**
 * 水印模板预设
 */
const WATERMARK_TEMPLATES: WatermarkTemplate[] = [
  {
    id: 'single',
    name: '单个水印',
    mode: 'single',
    rotation: 0,
    opacity: 0.7,
    scale: 1,
    defaultText: '© 创作工具箱',
  },
  {
    id: 'confidential',
    name: '机密文件',
    mode: 'tile',
    rotation: -30,
    opacity: 0.2,
    scale: 0.8,
    tileSpacingX: 250,
    tileSpacingY: 180,
    defaultText: '机密文件 CONFIDENTIAL',
    color: '#ff0000',
  },
  {
    id: 'diagonal-tile',
    name: '斜条平铺',
    mode: 'tile',
    rotation: -30,
    opacity: 0.15,
    scale: 0.6,
    tileSpacingX: 200,
    tileSpacingY: 150,
    defaultText: '© 版权所有',
  },
  {
    id: 'horizontal-tile',
    name: '横条平铺',
    mode: 'tile',
    rotation: 0,
    opacity: 0.15,
    scale: 0.5,
    tileSpacingX: 200,
    tileSpacingY: 150,
    defaultText: '© 版权所有',
  },
  {
    id: 'draft',
    name: '草稿水印',
    mode: 'tile',
    rotation: -45,
    opacity: 0.25,
    scale: 1.2,
    tileSpacingX: 350,
    tileSpacingY: 250,
    defaultText: 'DRAFT 草稿',
    color: '#888888',
  },
];

/**
 * 获取文件扩展名
 */
function getExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext ? ext.toLowerCase() : 'jpg';
}

/**
 * 获取MIME类型
 */
function getMime(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return map[ext] || 'image/jpeg';
}

/**
 * 绘制单个水印到Canvas上下文
 */
function drawSingleWatermark(
  ctx: CanvasRenderingContext2D,
  wm: WatermarkConfig,
  wmImage: HTMLImageElement | null,
  x: number,
  y: number,
  baseScale: number = 1
) {
  ctx.save();
  ctx.globalAlpha = wm.opacity;
  ctx.translate(x, y);
  ctx.rotate((wm.rotation * Math.PI) / 180);
  const s = wm.scale * baseScale;
  ctx.scale(s, s);

  if (wm.type === 'text' && wm.text) {
    const fontSize = wm.fontSize || 32;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = wm.color || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = fontSize / 12;
    ctx.strokeText(wm.text, 0, 0);
    ctx.fillText(wm.text, 0, 0);
  } else if (wm.type === 'image' && wmImage) {
    const w = wmImage.naturalWidth;
    const h = wmImage.naturalHeight;
    ctx.drawImage(wmImage, -w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

/**
 * 将水印绘制到画布上并导出（支持平铺模式）
 */
async function renderWatermark(
  img: HTMLImageElement,
  wm: WatermarkConfig,
  wmImage: HTMLImageElement | null,
  mime: string
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas不可用'));
      return;
    }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    if (wm.mode === 'single') {
      drawSingleWatermark(ctx, wm, wmImage, wm.x * canvas.width, wm.y * canvas.height);
    } else {
      const baseScale = Math.min(canvas.width / 800, canvas.height / 800);
      const spacingX = (wm.tileSpacingX || 200) * baseScale;
      const spacingY = (wm.tileSpacingY || 150) * baseScale;

      const rad = (wm.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const padding = Math.max(canvas.width, canvas.height);

      for (let y = -padding; y < canvas.height + padding; y += spacingY) {
        for (let x = -padding; x < canvas.width + padding; x += spacingX) {
          drawSingleWatermark(ctx, wm, wmImage, x, y, baseScale);
        }
      }
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('导出失败'));
          return;
        }
        resolve({ blob, width: canvas.width, height: canvas.height });
      },
      mime,
      0.92
    );
  });
}

/**
 * 图片水印组件
 */
export function ImageWatermark() {
  const [items, setItems] = useState<WatermarkItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [watermark, setWatermark] = useState<WatermarkConfig>({
    type: 'text',
    mode: 'single',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity: 0.7,
    text: '© 创作工具箱',
    fontSize: 32,
    color: '#ffffff',
    imageUrl: null,
    tileSpacingX: 250,
    tileSpacingY: 180,
  });

  const [rotationStep, setRotationStep] = useState(1);
  const [rotationInput, setRotationInput] = useState('0');
  const [isDraggingWM, setIsDraggingWM] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [wmStartPos, setWmStartPos] = useState({ x: 0.5, y: 0.5 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [wmImageLoaded, setWmImageLoaded] = useState<HTMLImageElement | null>(null);
  const [showGridMenu, setShowGridMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wmImageInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const activeItem = items.find((it) => it.id === activeItemId);

  /**
   * 更新水印配置
   */
  const updateWM = (updates: Partial<WatermarkConfig>) => {
    setWatermark((prev) => {
      const next = { ...prev, ...updates };
      if ('rotation' in updates) {
        setRotationInput(String(updates.rotation));
      }
      return next;
    });
  };

  /**
   * 应用水印模板
   */
  const applyTemplate = (tpl: WatermarkTemplate) => {
    setWatermark((prev) => ({
      ...prev,
      mode: tpl.mode,
      rotation: tpl.rotation,
      opacity: tpl.opacity,
      scale: tpl.scale,
      text: tpl.defaultText || prev.text,
      color: tpl.color || prev.color,
      tileSpacingX: tpl.tileSpacingX || 250,
      tileSpacingY: tpl.tileSpacingY || 180,
      x: 0.5,
      y: 0.5,
    }));
    setRotationInput(String(tpl.rotation));
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: WatermarkItem[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.type === 'image/gif') return;
      const id = Math.random().toString(36).substr(2, 9);
      const url = URL.createObjectURL(file);

      const item: WatermarkItem = {
        id,
        file,
        url,
        width: 0,
        height: 0,
        processedUrl: null,
        processedBlob: null,
        status: 'idle',
      };

      const img = new Image();
      img.onload = () => {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, width: img.naturalWidth, height: img.naturalHeight } : it))
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
   * 处理水印图片上传
   */
  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setWmImageLoaded(img);
      setWatermark((prev) => ({ ...prev, type: 'image', imageUrl: url, scale: 0.2 }));
    };
    img.src = url;

    if (wmImageInputRef.current) wmImageInputRef.current.value = '';
  };

  /**
   * 应用九宫格位置
   */
  const applyGridPosition = (pos: { x: number; y: number }) => {
    updateWM({ x: pos.x, y: pos.y });
    setShowGridMenu(false);
  };

  /**
   * 鼠标坐标转为图片相对坐标
   */
  const getWMPosition = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const img = previewImgRef.current;
      if (!img) return { x: watermark.x, y: watermark.y };

      const imgRect = img.getBoundingClientRect();
      const relX = (clientX - imgRect.left) / imgRect.width;
      const relY = (clientY - imgRect.top) / imgRect.height;

      return {
        x: Math.max(0, Math.min(1, relX)),
        y: Math.max(0, Math.min(1, relY)),
      };
    },
    [watermark.x, watermark.y]
  );

  /**
   * 水印拖拽开始
   */
  const handleWMPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (watermark.mode === 'tile') return;
    e.stopPropagation();
    e.preventDefault();

    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }

    setIsDraggingWM(true);
    setDragStart({ x: cx, y: cy });
    setWmStartPos({ x: watermark.x, y: watermark.y });

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      let mx: number, my: number;
      let shiftKey = false;
      if ('touches' in ev) {
        if (ev.touches.length !== 1) return;
        ev.preventDefault();
        mx = ev.touches[0].clientX;
        my = ev.touches[0].clientY;
      } else {
        mx = ev.clientX;
        my = ev.clientY;
        shiftKey = ev.shiftKey;
      }

      const img = previewImgRef.current;
      if (!img) return;
      const imgRect = img.getBoundingClientRect();
      const dx = (mx - dragStart.x) / imgRect.width / canvasZoom;
      const dy = (my - dragStart.y) / imgRect.height / canvasZoom;

      let newX = wmStartPos.x + dx;
      let newY = wmStartPos.y + dy;

      if (shiftKey) {
        if (Math.abs(newX - wmStartPos.x) > Math.abs(newY - wmStartPos.y)) {
          newY = wmStartPos.y;
        } else {
          newX = wmStartPos.x;
        }
      }

      newX = Math.max(0, Math.min(1, newX));
      newY = Math.max(0, Math.min(1, newY));
      updateWM({ x: newX, y: newY });
    };

    const handleUp = () => {
      setIsDraggingWM(false);
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
   * 画布平移
   */
  const handleCanvasPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-watermark]') && watermark.mode === 'single') return;
    if (!spacePressed && !isFullscreen) return;

    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length === 2) {
        return;
      }
      if (e.touches.length !== 1) return;
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      if (e.button !== 0) return;
      cx = e.clientX;
      cy = e.clientY;
    }

    setIsPanning(true);
    setDragStart({ x: cx - panOffset.x, y: cy - panOffset.y });

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if ('touches' in ev) {
        if (ev.touches.length !== 1) return;
        ev.preventDefault();
        setPanOffset({
          x: ev.touches[0].clientX - dragStart.x,
          y: ev.touches[0].clientY - dragStart.y,
        });
      } else {
        setPanOffset({ x: ev.clientX - dragStart.x, y: ev.clientY - dragStart.y });
      }
    };

    const handleUp = () => {
      setIsPanning(false);
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
   * 滚轮缩放
   */
  const handleWheel = (e: React.WheelEvent) => {
    if (!isFullscreen) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasZoom((z) => Math.max(0.3, z * delta));
  };

  /**
   * 旋转加减
   */
  const rotateBy = (delta: number) => {
    const newRot = Math.round((watermark.rotation + delta) * 100) / 100;
    updateWM({ rotation: newRot });
  };

  /**
   * 一键回正
   */
  const resetRotation = () => {
    updateWM({ rotation: 0 });
  };

  /**
   * 缩放（无上限）
   */
  const scaleBy = (factor: number) => {
    setWatermark((prev) => ({ ...prev, scale: Math.max(0.05, prev.scale * factor) }));
  };

  /**
   * 导出单张
   */
  const exportItem = async (item: WatermarkItem): Promise<WatermarkItem> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const ext = getExtension(item.file.name);
          const mime = getMime(ext);
          const { blob } = await renderWatermark(img, watermark, wmImageLoaded, mime);
          const url = URL.createObjectURL(blob);
          resolve({ ...item, processedUrl: url, processedBlob: blob, status: 'done' });
        } catch {
          resolve({ ...item, status: 'error' });
        }
      };
      img.onerror = () => resolve({ ...item, status: 'error' });
      img.src = item.url;
    });
  };

  /**
   * 导出所有
   */
  const handleExportAll = async () => {
    setIsProcessing(true);
    setItems((prev) => prev.map((it) => ({ ...it, status: 'processing' as const })));

    const results = await Promise.all(items.map((item) => exportItem(item)));
    setItems(results);

    const successCount = results.filter((r) => r.status === 'done').length;
    if (successCount > 0) {
      reportToolUsage('image-watermark');
    }
    setIsProcessing(false);
  };

  /**
   * 下载单张
   */
  const downloadItem = (item: WatermarkItem) => {
    if (!item.processedUrl) return;
    const link = document.createElement('a');
    const name = item.file.name.replace(/\.[^/.]+$/, '');
    const ext = getExtension(item.file.name);
    link.download = `${name}-watermarked.${ext}`;
    link.href = item.processedUrl;
    link.click();
  };

  /**
   * 下载全部
   */
  const downloadAll = () => {
    items
      .filter((it) => it.status === 'done' && it.processedUrl)
      .forEach((item, i) => {
        setTimeout(() => downloadItem(item), i * 200);
      });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item) {
        URL.revokeObjectURL(item.url);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
      }
      const next = prev.filter((it) => it.id !== id);
      if (activeItemId === id) setActiveItemId(next.length > 0 ? next[0].id : null);
      return next;
    });
  };

  const clearAll = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.url);
      if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    });
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

  /**
   * 处理旋转输入框手动输入
   */
  const handleRotationInputChange = (val: string) => {
    setRotationInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && isFinite(num)) {
      updateWM({ rotation: num });
    }
  };

  useEffect(() => {
    setRotationInput(String(watermark.rotation));
  }, [watermark.rotation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
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
  }, []);

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

  const scalePercent = Math.round(watermark.scale * 100);
  const isOversized = watermark.scale > 2;

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-cream-50 flex flex-col'
    : 'space-y-4';

  /**
   * 渲染水印预览
   */
  const renderWatermarkPreview = () => {
    if (!(watermark.type === 'text' ? watermark.text : watermark.imageUrl)) return null;

    const baseStyle: React.CSSProperties = {
      opacity: watermark.opacity,
      transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg) scale(${watermark.scale})`,
      userSelect: 'none',
      pointerEvents: watermark.mode === 'tile' ? 'none' : 'auto',
    };

    if (watermark.mode === 'single') {
      return (
        <div
          data-watermark
          onMouseDown={handleWMPointerDown}
          onTouchStart={handleWMPointerDown}
          className={`absolute select-none ${isDraggingWM ? 'cursor-grabbing' : 'cursor-move'}`}
          style={{
            ...baseStyle,
            left: `${watermark.x * 100}%`,
            top: `${watermark.y * 100}%`,
          }}
        >
          {watermark.type === 'text' ? (
            <span
              style={{
                fontSize: `${watermark.fontSize || 32}px`,
                color: watermark.color,
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5), -1px -1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {watermark.text}
            </span>
          ) : wmImageLoaded ? (
            <img
              src={watermark.imageUrl!}
              alt="水印"
              className="max-w-[300px] max-h-[300px] object-contain pointer-events-none"
              draggable={false}
            />
          ) : null}
        </div>
      );
    }

    const img = previewImgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const container = canvasContainerRef.current;
    if (!container) return null;

    const scaleFactor = canvasZoom;
    const spacingX = (watermark.tileSpacingX || 250) * scaleFactor * 0.5;
    const spacingY = (watermark.tileSpacingY || 180) * scaleFactor * 0.5;

    const tiles: React.ReactNode[] = [];
    for (let y = -rect.height; y < rect.height * 2; y += spacingY) {
      for (let x = -rect.width; x < rect.width * 2; x += spacingX) {
        tiles.push(
          <div
            key={`${x}-${y}`}
            className="absolute whitespace-nowrap pointer-events-none"
            style={{
              ...baseStyle,
              left: `${50 + (x / rect.width) * 100}%`,
              top: `${50 + (y / rect.height) * 100}%`,
              fontSize: watermark.type === 'text' ? `${(watermark.fontSize || 32) * scaleFactor * 0.8}px` : undefined,
              color: watermark.type === 'text' ? watermark.color : undefined,
              fontWeight: 'bold',
              textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {watermark.type === 'text' ? (
              <span>{watermark.text}</span>
            ) : wmImageLoaded ? (
              <img
                src={watermark.imageUrl!}
                alt=""
                className="max-w-[200px] max-h-[200px] object-contain"
                draggable={false}
              />
            ) : null}
          </div>
        );
      }
    }
    return <>{tiles}</>;
  };

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
      <input
        ref={wmImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleWatermarkImageUpload}
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
              <Type size={28} strokeWidth={1.5} className="text-amber-accent" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink-900 mb-2">上传图片添加水印</h3>
            <p className="text-sm text-ink-500 mb-4">支持JPG、PNG、WebP格式，可批量添加文字或图片水印</p>
            <button
              className="px-6 py-2.5 rounded-lg bg-amber-accent text-white text-sm font-medium
                         hover:bg-amber-dark transition-all inline-flex items-center gap-2"
            >
              <Upload size={16} strokeWidth={1.5} />
              选择图片
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 工具栏 */}
          <div
            className={`bg-white ${isFullscreen ? 'border-b border-cream-200 p-3 overflow-x-auto' : 'rounded-xl shadow-card border border-cream-100 p-5'}`}
          >
            <div className="flex flex-wrap items-start gap-3 lg:gap-4">
              {/* 水印模板 */}
              <div className="flex items-center gap-1 bg-cream-100 rounded-lg p-1.5 flex-shrink-0">
                {WATERMARK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1
                               ${watermark.mode === tpl.mode &&
                                 (tpl.id === 'single'
                                   ? watermark.mode === 'single'
                                   : Math.abs(watermark.rotation - tpl.rotation) < 1 && Math.abs(watermark.opacity - tpl.opacity) < 0.05)
                                 ? 'bg-white text-amber-accent shadow-sm'
                                 : 'text-ink-600 hover:text-ink-900'}`}
                    title={tpl.name}
                  >
                    {tpl.id === 'single' ? <Lock size={12} /> : <Layers size={12} />}
                    {tpl.name}
                  </button>
                ))}
              </div>

              <div className="w-px h-8 bg-cream-200 hidden sm:block flex-shrink-0" />

              {/* 水印类型切换 */}
              <div className="flex items-center gap-1 bg-cream-100 rounded-lg p-1.5 flex-shrink-0">
                <button
                  onClick={() => updateWM({ type: 'text' })}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1
                             ${watermark.type === 'text' ? 'bg-white text-amber-accent shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  <Type size={14} strokeWidth={1.5} />
                  文字
                </button>
                <button
                  onClick={() => wmImageInputRef.current?.click()}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1
                             ${watermark.type === 'image' ? 'bg-white text-amber-accent shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  <ImageIcon size={14} strokeWidth={1.5} />
                  图片
                </button>
              </div>

              {/* 文字输入 */}
              {watermark.type === 'text' && (
                <input
                  type="text"
                  value={watermark.text || ''}
                  onChange={(e) => updateWM({ text: e.target.value })}
                  placeholder="输入水印文字"
                  className="px-3 py-2.5 rounded-lg border border-cream-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                             min-w-[120px] max-w-[200px]"
                />
              )}
              {watermark.type === 'image' && (
                <button
                  onClick={() => wmImageInputRef.current?.click()}
                  className="px-3 py-2.5 rounded-lg border border-cream-300 text-sm text-ink-700 hover:bg-cream-50 flex-shrink-0"
                >
                  {wmImageLoaded ? '更换水印图' : '上传水印图'}
                </button>
              )}

              <div className="w-px h-8 bg-cream-200 hidden md:block flex-shrink-0" />

              {/* 透明度 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-ink-500 whitespace-nowrap">透明度</span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={watermark.opacity * 100}
                  onChange={(e) => updateWM({ opacity: parseInt(e.target.value) / 100 })}
                  className="w-20 accent-amber-accent"
                />
                <span className="text-xs text-ink-700 w-8">{Math.round(watermark.opacity * 100)}%</span>
              </div>

              {/* 大小（无限缩放） */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-ink-500 whitespace-nowrap">大小</span>
                <button
                  onClick={() => scaleBy(0.9)}
                  className="p-1 rounded hover:bg-cream-100 text-ink-600"
                >
                  <ZoomOut size={14} />
                </button>
                {isOversized && <Search size={12} className="text-amber-accent" />}
                <span className={`text-xs font-medium w-12 text-center ${isOversized ? 'text-amber-accent' : 'text-ink-700'}`}>
                  {scalePercent}%
                </span>
                <button
                  onClick={() => scaleBy(1.1)}
                  className="p-1 rounded hover:bg-cream-100 text-ink-600"
                >
                  {isOversized ? <Search size={14} className="text-amber-accent" /> : <ZoomIn size={14} />}
                </button>
              </div>

              {/* 旋转控制 */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => rotateBy(-rotationStep)}
                  className="p-1.5 rounded hover:bg-cream-100 text-ink-600"
                  title="逆时针旋转"
                >
                  <Minus size={14} />
                </button>
                <div className="flex items-center gap-1">
                  <RotateCw size={14} className="text-ink-400" />
                  <input
                    type="number"
                    value={rotationInput}
                    onChange={(e) => handleRotationInputChange(e.target.value)}
                    className="w-14 px-1.5 py-1 rounded border border-cream-300 text-center text-xs
                               focus:outline-none focus:ring-1 focus:ring-amber-accent/30 focus:border-amber-accent"
                    step={rotationStep}
                  />
                  <span className="text-xs text-ink-500">°</span>
                </div>
                <select
                  value={rotationStep}
                  onChange={(e) => setRotationStep(parseFloat(e.target.value))}
                  className="px-1 py-1 rounded border border-cream-300 text-xs bg-white
                             focus:outline-none focus:ring-1 focus:ring-amber-accent/30"
                >
                  {ROTATION_STEPS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => rotateBy(rotationStep)}
                  className="p-1.5 rounded hover:bg-cream-100 text-ink-600"
                  title="顺时针旋转"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={resetRotation}
                  className="p-1.5 rounded hover:bg-cream-100 text-moss"
                  title="一键回正（0°）"
                >
                  <RefreshCcw size={14} />
                </button>
              </div>

              <div className="flex-1" />

              {/* 九宫格位置（仅单水印模式） */}
              {watermark.mode === 'single' && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowGridMenu(!showGridMenu)}
                    className="p-2 rounded-lg border border-cream-300 hover:bg-cream-50 text-ink-600"
                    title="九宫格位置"
                  >
                    <Grid3X3 size={16} strokeWidth={1.5} />
                  </button>
                  {showGridMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowGridMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 p-2 bg-white rounded-lg shadow-lg border border-cream-200 z-20">
                        <div className="grid grid-cols-3 gap-1">
                          {GRID_POSITIONS.map((pos, i) => (
                            <button
                              key={i}
                              onClick={() => applyGridPosition(pos)}
                              className="w-8 h-8 rounded border border-cream-200 hover:bg-amber-accent/10 hover:border-amber-accent text-xs text-ink-600"
                              title={pos.name}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg border border-cream-300 hover:bg-cream-50 text-ink-600 flex-shrink-0"
              >
                {isFullscreen ? <Minimize2 size={16} strokeWidth={1.5} /> : <Maximize2 size={16} strokeWidth={1.5} />}
              </button>
            </div>

            {/* 非全屏下的操作按钮 */}
            {!isFullscreen && (
              <div className="flex flex-wrap gap-3 justify-center mt-5 pt-5 border-t border-cream-100">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-3 rounded-lg border border-cream-300 bg-white text-ink-700 text-sm font-medium
                             hover:bg-cream-50 transition-colors flex items-center gap-2"
                >
                  <Upload size={16} strokeWidth={1.5} />
                  添加图片
                </button>
                <button
                  onClick={handleExportAll}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-lg bg-amber-accent text-white text-sm font-medium shadow-sm
                             hover:bg-amber-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <><Loader2 size={16} className="animate-spin" />处理中...</>
                  ) : (
                    <><Check size={16} strokeWidth={1.5} />应用水印（{items.length}张）</>
                  )}
                </button>
                {items.some((it) => it.status === 'done') && (
                  <button
                    onClick={downloadAll}
                    className="px-6 py-3 rounded-lg bg-moss text-white text-sm font-medium shadow-sm
                               hover:bg-moss-light transition-colors flex items-center gap-2"
                  >
                    <Download size={16} strokeWidth={1.5} />
                    下载全部
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="px-5 py-3 rounded-lg border border-brick/30 bg-white text-brick text-sm font-medium
                             hover:bg-brick/5 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
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
            onMouseDown={handleCanvasPointerDown}
            onTouchStart={handleCanvasPointerDown}
            onWheel={handleWheel}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(#e8e4dd 1px, transparent 1px), linear-gradient(90deg, #e8e4dd 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${canvasZoom})`,
                transition: isDraggingWM || isPanning ? 'none' : 'transform 0.2s ease',
              }}
            >
              {activeItem ? (
                <div className="relative shadow-xl">
                  <img
                    ref={previewImgRef}
                    src={activeItem.processedUrl || activeItem.url}
                    alt={activeItem.file.name}
                    className={`max-w-full object-contain select-none rounded
                               ${isFullscreen ? 'max-h-[75vh]' : 'max-h-[480px]'}
                               ${watermark.mode === 'tile' ? 'cursor-default' : isDraggingWM ? 'cursor-grabbing' : spacePressed || isFullscreen ? 'cursor-grab' : 'cursor-default'}`}
                    draggable={false}
                  />
                  {renderWatermarkPreview()}
                </div>
              ) : (
                <div className="text-ink-400">请选择一张图片</div>
              )}
            </div>

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
                    onClick={() => setCanvasZoom((z) => Math.min(3, z + 0.1))}
                    className="p-1 hover:bg-cream-100 rounded"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button onClick={resetView} className="p-1 hover:bg-cream-100 rounded ml-1">
                    <Move size={16} />
                  </button>
                </div>
                <div className="absolute bottom-4 right-4 text-xs text-ink-400 bg-white/90 rounded-lg px-3 py-2 shadow-md max-w-[200px]">
                  {watermark.mode === 'single' ? '拖拽水印移动 · Shift正交' : '平铺水印模式'} · 滚轮/双指缩放 · 空格平移
                </div>
                <div className="absolute top-20 right-4 flex flex-col gap-2">
                  <button
                    onClick={handleExportAll}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-lg bg-moss text-white text-sm font-medium shadow-md
                               hover:bg-moss-light transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Download size={14} />
                    应用下载
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
                      onClick={() => setActiveItemId(item.id)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                                 ${activeItemId === item.id ? 'border-amber-accent shadow-md' : 'border-cream-200'}
                                 ${item.status === 'done' ? 'ring-2 ring-moss ring-offset-1' : ''}`}
                    >
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brick text-white flex items-center justify-center text-xs"
                    >
                      <X size={10} />
                    </button>
                    {item.status === 'done' && item.processedUrl && (
                      <button
                        onClick={() => downloadItem(item)}
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-moss text-white flex items-center justify-center"
                      >
                        <Download size={10} />
                      </button>
                    )}
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
