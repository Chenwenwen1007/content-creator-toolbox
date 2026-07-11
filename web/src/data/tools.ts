import { Video, FileText, Image, Scissors, Grid3X3, Minimize2, RefreshCw, Crop, RotateCw, Type, Eraser, Combine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  icon: LucideIcon;
  path: string;
  status: 'available' | 'coming-soon' | 'beta';
  keywords: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const categories: Category[] = [
  {
    id: 'video-tools',
    name: '短视频图文处理',
    description: '短视频解析、文案提取、封面保存等视频相关工具',
    icon: Video,
    color: 'amber',
  },
  {
    id: 'image-tools',
    name: '图片处理',
    description: '多宫格、图片压缩、格式转换、图片裁剪、旋转、水印、抠图透明',
    icon: Image,
    color: 'moss',
  },
];

export const tools: Tool[] = [
  // 短视频图文处理
  {
    id: 'video-parse',
    name: '短视频解析',
    description: '支持抖音、快手、小红书无水印视频解析下载',
    category: '短视频图文处理',
    categoryId: 'video-tools',
    icon: Video,
    path: '/video-tools/parse',
    status: 'available',
    keywords: ['短视频', '去水印', '下载', '抖音', '快手', '小红书', '解析', '无水印'],
  },
  {
    id: 'text-extract',
    name: '文案提取',
    description: 'AI提取视频文案内容，金字塔结构总结',
    category: '短视频图文处理',
    categoryId: 'video-tools',
    icon: FileText,
    path: '/video-tools/text-extract',
    status: 'available',
    keywords: ['文案', '提取', 'AI', '总结', '语音转文字', '多模态', '豆包'],
  },
  {
    id: 'cover-save',
    name: '封面保存',
    description: '提取视频高清封面图，一键保存到本地',
    category: '短视频图文处理',
    categoryId: 'video-tools',
    icon: Image,
    path: '/video-tools/cover-save',
    status: 'available',
    keywords: ['封面', '保存', '下载', '图片', '封面图'],
  },
  {
    id: 'timestamp-remove',
    name: '时间戳去除',
    description: '自动识别并去除视频中的时间戳水印',
    category: '短视频图文处理',
    categoryId: 'video-tools',
    icon: Scissors,
    path: '/video-tools/timestamp',
    status: 'coming-soon',
    keywords: ['时间戳', '去水印', '去除', '裁剪'],
  },
  // 图片处理
  {
    id: 'image-grid',
    name: '多宫格',
    description: '九宫格、四宫格图片生成，支持自定义行列、比例和背景色',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: Grid3X3,
    path: '/image-tools/grid',
    status: 'available',
    keywords: ['九宫格', '四宫格', '切图', '拼图', '多宫格', '朋友圈', '9宫格', '比例', '尺寸'],
  },
  {
    id: 'image-stitch',
    name: '图片拼接',
    description: '横向/竖向拼接多张图片，支持拖拽排序、间距调节、自定义背景色',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: Combine,
    path: '/image-tools/stitch',
    status: 'available',
    keywords: ['拼接', '长图', '竖图', '横图', '拼图', '合并', '多张合并', '无缝'],
  },
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '在线压缩图片体积，保持画质',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: Minimize2,
    path: '/image-tools/compress',
    status: 'available',
    keywords: ['压缩', '减小体积', '压缩图片', '减小大小', 'kb', 'jpg', 'png', 'webp'],
  },
  {
    id: 'image-convert',
    name: '格式转换',
    description: '图片格式互转，支持PNG/JPG/WebP等',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: RefreshCw,
    path: '/image-tools/convert',
    status: 'available',
    keywords: ['格式转换', '转格式', 'png转', 'jpg', 'png', 'webp', '格式'],
  },
  {
    id: 'image-crop',
    name: '图片裁剪',
    description: '自由裁剪图片，支持多种比例',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: Crop,
    path: '/image-tools/crop',
    status: 'available',
    keywords: ['裁剪', '剪切', '裁切', '比例', '尺寸', '大小'],
  },
  {
    id: 'image-rotate',
    name: '图片旋转',
    description: '拖拽旋转或按钮快速旋转，支持Shift角度吸附，批量处理',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: RotateCw,
    path: '/image-tools/rotate',
    status: 'available',
    keywords: ['旋转', '转动', '90度', '翻转', '角度', '横转竖', '竖转横'],
  },
  {
    id: 'image-watermark',
    name: '图片水印',
    description: '添加文字或图片水印，支持位置/大小/透明度/旋转调整，批量处理',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: Type,
    path: '/image-tools/watermark',
    status: 'available',
    keywords: ['水印', '加水印', '文字水印', '图片水印', 'logo', '版权', '批量水印'],
  },
  {
    id: 'image-remove-bg',
    name: '抠图透明',
    description: '纯色背景抠图、画笔涂抹透明化，支持背景替换，证件照/商品图处理',
    category: '图片处理',
    categoryId: 'image-tools',
    icon: Eraser,
    path: '/image-tools/remove-bg',
    status: 'beta',
    keywords: ['抠图', '去背景', '透明背景', '证件照', '换背景', '橡皮擦', '涂抹'],
  },
];

/**
 * 根据关键词搜索工具
 * @param query 搜索关键词
 * @returns 匹配的工具列表，按匹配度排序
 */
export function searchTools(query: string): Tool[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase().trim();
  return tools
    .map((tool) => {
      let score = 0;
      if (tool.name.toLowerCase().includes(lowerQuery)) score += 10;
      if (tool.description.toLowerCase().includes(lowerQuery)) score += 5;
      if (tool.category.toLowerCase().includes(lowerQuery)) score += 3;
      tool.keywords.forEach((kw) => {
        if (kw.toLowerCase().includes(lowerQuery)) score += 2;
      });
      return score === 0 ? null : { tool, score };
    })
    .filter((item): item is { tool: Tool; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.tool);
}
