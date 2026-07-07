# 创作工具箱 - Web 前端

基于 React + TypeScript + Vite + TailwindCSS 构建的一站式创作辅助工具集。

## 功能特性

### 短视频图文处理
- **短视频解析**：支持抖音、快手、小红书无水印视频解析下载
- **文案提取**：AI 提取视频文案内容，金字塔结构总结（一句话摘要、关键要点、完整文案）
- **封面保存**：提取视频高清封面图，一键保存到本地
- **时间戳去除**：自动识别并去除视频中的时间戳水印（开发中）

### 图片处理
- **多宫格切图**：九宫格、四宫格图片生成，支持自定义行列和背景色
- **图片压缩**：在线压缩图片体积，保持画质，支持质量调节和实时预览
- **格式转换**：图片格式互转，支持 PNG/JPG/WebP 等常见格式
- **图片裁剪**：自由裁剪图片，支持多种比例预设

## 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **样式方案**：TailwindCSS 3
- **状态管理**：Zustand
- **路由**：React Router v6
- **图标库**：Lucide React
- **HTTP 客户端**：Fetch API（原生封装）

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问地址：http://localhost:5173

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```text
web/
├── public/                 # 静态资源
│   ├── favicon.svg
│   ├── wechat-qr.png
│   └── wechat-group-qr.png
├── src/
│   ├── api/               # API 请求封装
│   │   └── request.ts
│   ├── assets/            # 静态资源
│   ├── components/        # 组件
│   │   ├── VideoParser.tsx     # 短视频解析
│   │   ├── TextExtractor.tsx   # 文案提取
│   │   ├── CoverSaver.tsx      # 封面保存
│   │   ├── ImageGrid.tsx       # 多宫格切图
│   │   ├── ImageCompress.tsx   # 图片压缩
│   │   ├── ImageConvert.tsx    # 格式转换
│   │   ├── ImageCrop.tsx       # 图片裁剪
│   │   ├── Layout.tsx          # 全局布局
│   │   ├── ToolLayout.tsx      # 工具页面布局
│   │   ├── ToolCard.tsx        # 工具卡片
│   │   ├── Footer.tsx          # 页脚
│   │   ├── ContactModal.tsx    # 联系我们弹窗
│   │   ├── FloatingContact.tsx # 悬浮联系按钮
│   │   ├── NotificationBar.tsx # 通知提示栏
│   │   ├── ImageLightbox.tsx   # 图片灯箱
│   │   ├── PlaceholderTool.tsx # 开发中占位
│   │   └── Empty.tsx           # 空状态
│   ├── data/              # 数据配置
│   │   └── tools.ts
│   ├── hooks/             # 自定义 Hooks
│   │   └── useTheme.ts
│   ├── lib/               # 工具函数
│   │   └── utils.ts
│   ├── pages/             # 页面
│   │   ├── Home.tsx
│   │   └── Settings.tsx
│   ├── store/             # 状态管理
│   │   └── app.ts
│   ├── App.tsx            # 应用主组件
│   ├── main.tsx           # 入口文件
│   ├── index.css          # 全局样式
│   └── vite-env.d.ts      # Vite 类型声明
├── .gitignore
├── README.md
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 开发环境代理

前端开发环境已配置 API 代理，`/api/*` 请求会自动转发到后端：

- 前端地址：`http://localhost:5173`
- 代理目标：`http://127.0.0.1:9527`

如需修改后端地址，编辑 `vite.config.ts` 中的 `server.proxy` 配置。

## 安全说明

- 大模型 API Key 仅保存在浏览器内存中，刷新页面后自动清除
- 密钥不会上传到服务器，所有多模态请求通过后端代理转发
- 图片处理全部在本地浏览器完成，不上传服务器，保护用户隐私

## 相关文档

- 根目录 README：[../README.md](../README.md)
- 变更日志：[../CHANGELOG.md](../CHANGELOG.md)
- 产品需求文档：[../.trae/documents/PRD.md](../.trae/documents/PRD.md)
- 技术架构文档：[../.trae/documents/TechnicalArchitecture.md](../.trae/documents/TechnicalArchitecture.md)
- 排查手册：[../docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
