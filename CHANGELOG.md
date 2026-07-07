# 变更日志

## [v2.0.0] - 2026-07-07

### 新增功能

#### 1. Web 端创作工具箱
新增完整的 Web 前端应用，基于 React + TypeScript + Vite + TailwindCSS 构建，提供一站式创作辅助工具集。

**包含 8 个实用工具：**

| 工具分类 | 工具名称 | 功能说明 |
|---------|---------|---------|
| 短视频图文处理 | 短视频解析 | 支持抖音、快手、小红书无水印视频解析下载 |
| 短视频图文处理 | 文案提取 | AI 提取视频文案内容，金字塔结构总结（一句话摘要、关键要点、完整文案） |
| 短视频图文处理 | 封面保存 | 提取视频高清封面图，一键保存到本地 |
| 短视频图文处理 | 时间戳去除 | 自动识别并去除视频中的时间戳水印（开发中） |
| 图片处理 | 多宫格切图 | 九宫格、四宫格图片生成，支持自定义行列和背景色 |
| 图片处理 | 图片压缩 | 在线压缩图片体积，保持画质，支持质量调节和实时预览 |
| 图片处理 | 格式转换 | 图片格式互转，支持 PNG/JPG/WebP 等常见格式 |
| 图片处理 | 图片裁剪 | 自由裁剪图片，支持多种比例预设 |

**前端特性：**
- 首页大搜索框，支持按关键词搜索工具
- 响应式设计，适配桌面端和移动端
- 精致的 UI 设计，采用暖色调配色方案
- 工具页面左侧分类导航，右侧内容区
- 设置页配置大模型 API Key，密钥仅保存在浏览器内存中
- 联系我们弹窗，展示微信二维码
- 深色/浅色主题切换支持

#### 2. 多模态 AI 文案提取
后端新增多模态分析能力，支持通过大模型视觉能力提取视频文案。

**支持的大模型：**
- 豆包（Doubao）- 字节跳动火山引擎
- Kimi（月之暗面）
- MiniMax
- Gemini（Google）

**返回金字塔结构结果：**
- `summary`：一句话摘要（不超过 50 字）
- `key_points`：关键要点列表（3-5 条）
- `full_text`：尽可能完整的视频文案/台词内容

**技术实现：**
- 豆包使用 responses.create 接口格式
- 其他模型使用 OpenAI 兼容的 chat/completions 接口
- 支持 base64 格式的帧图片数组（1-20 帧）
- 统一的错误处理和响应解析

#### 3. 项目文档
- 新增产品需求文档（PRD.md），定义产品目标、用户画像、功能清单
- 新增技术架构文档（TechnicalArchitecture.md），描述前后端技术选型和模块划分

### 后端变更

#### 新增文件
- `server/api/routes_multimodal.py` - 多模态文案提取路由
- `server/schemas/request.py` - 新增 MultimodalExtractRequest 请求模型
- `server/schemas/response.py` - 新增 MultimodalExtractPayload 响应模型
- `server/utils/exceptions.py` - 新增 MultimodalError 异常类

#### 修改文件
- `server/app.py` - 注册多模态路由
- `config.js` - 调整后端 API 端口从 8001 到 9527

### 前端新增文件

#### 核心文件
- `web/src/App.tsx` - 应用主组件，路由配置
- `web/src/main.tsx` - React 应用入口
- `web/src/index.css` - 全局样式和主题变量
- `web/src/store/app.ts` - 全局状态管理（Zustand）
- `web/src/data/tools.ts` - 工具数据配置和搜索函数
- `web/src/api/request.ts` - API 请求封装

#### 页面组件
- `web/src/pages/Home.tsx` - 首页（搜索 + 分类 + 工具列表）
- `web/src/pages/Settings.tsx` - 设置页（大模型 API 配置）

#### 工具组件
- `web/src/components/VideoParser.tsx` - 短视频解析
- `web/src/components/TextExtractor.tsx` - 文案提取（AI 多模态）
- `web/src/components/CoverSaver.tsx` - 封面保存
- `web/src/components/ImageGrid.tsx` - 多宫格切图
- `web/src/components/ImageCompress.tsx` - 图片压缩
- `web/src/components/ImageConvert.tsx` - 格式转换
- `web/src/components/ImageCrop.tsx` - 图片裁剪

#### 布局组件
- `web/src/components/Layout.tsx` - 全局布局（顶部导航 + 页脚）
- `web/src/components/ToolLayout.tsx` - 工具页面布局（左侧导航 + 右侧内容）
- `web/src/components/ToolCard.tsx` - 工具卡片
- `web/src/components/Footer.tsx` - 页脚

#### 通用组件
- `web/src/components/ContactModal.tsx` - 联系我们弹窗
- `web/src/components/FloatingContact.tsx` - 悬浮联系按钮
- `web/src/components/NotificationBar.tsx` - 通知提示栏
- `web/src/components/ImageLightbox.tsx` - 图片灯箱预览
- `web/src/components/PlaceholderTool.tsx` - 开发中工具占位
- `web/src/components/Empty.tsx` - 空状态组件

#### 配置文件
- `web/package.json` - 项目依赖
- `web/vite.config.ts` - Vite 构建配置
- `web/tailwind.config.js` - TailwindCSS 配置
- `web/tsconfig.json` - TypeScript 配置
- `web/eslint.config.js` - ESLint 配置
- `web/postcss.config.js` - PostCSS 配置

#### 静态资源
- `web/public/favicon.svg` - 网站图标
- `web/public/wechat-qr.png` - 微信个人二维码
- `web/public/wechat-group-qr.png` - 微信群二维码

### 技术栈更新

#### 前端技术栈
- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **样式方案**：TailwindCSS 3
- **状态管理**：Zustand
- **路由**：React Router v6
- **图标库**：Lucide React
- **HTTP 客户端**：Fetch API（原生封装）

#### 后端技术栈
- **Web 框架**：FastAPI
- **HTTP 客户端**：httpx（异步）
- **数据校验**：Pydantic v2

### 部署说明

#### 本地启动 Web 前端
```bash
cd web
npm install
npm run dev
```
访问地址：http://localhost:5173

#### 后端端口调整
默认端口从 8001 调整为 9527，前端开发环境已配置代理：
- 前端请求 `/api/*` → 代理到 `http://127.0.0.1:9527`

### 安全说明
- 大模型 API Key 仅保存在浏览器内存中，刷新页面后自动清除
- 密钥不会上传到服务器，所有多模态请求通过后端代理转发
- 用户数据全部在本地处理，图片上传不会离开浏览器（纯前端工具）
