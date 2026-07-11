import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import { ToolLayout } from "@/components/ToolLayout";
import { VideoParser } from "@/components/VideoParser";
import { TextExtractor } from "@/components/TextExtractor";
import { CoverSaver } from "@/components/CoverSaver";
import { ImageGrid } from "@/components/ImageGrid";
import { ImageStitch } from "@/components/ImageStitch";
import { ImageCompress } from "@/components/ImageCompress";
import { ImageConvert } from "@/components/ImageConvert";
import { ImageCrop } from "@/components/ImageCrop";
import { ImageRotate } from "@/components/ImageRotate";
import { ImageWatermark } from "@/components/ImageWatermark";
import { ImageRemoveBg } from "@/components/ImageRemoveBg";
import { PlaceholderTool } from "@/components/PlaceholderTool";
import { NotificationBar } from "@/components/NotificationBar";
import { FloatingContact } from "@/components/FloatingContact";
import { Footer } from "@/components/Footer";
import { Settings as SettingsIcon, Scissors } from "lucide-react";

/**
 * 应用根组件
 * 配置路由导航，包含顶部通知栏、导航栏、页面内容区、底部版权、悬浮联系按钮
 */
export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-cream-50 flex flex-col">
        {/* 顶部通知栏 */}
        <NotificationBar />

        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-cream-200">
          <div className="container xl:max-w-5xl">
            <div className="h-16 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo.jpg" alt="柚米去水印" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-serif text-lg font-semibold text-ink-900">创作工具箱</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  className="p-2 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-cream-100 transition-colors"
                  title="设置"
                >
                  <SettingsIcon size={20} strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容区 */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />

            {/* 短视频图文处理 */}
            <Route
              path="/video-tools/parse"
              element={
                <ToolLayout categoryId="video-tools">
                  <VideoParser />
                </ToolLayout>
              }
            />
            <Route
              path="/video-tools/text-extract"
              element={
                <ToolLayout categoryId="video-tools">
                  <TextExtractor />
                </ToolLayout>
              }
            />
            <Route
              path="/video-tools/cover-save"
              element={
                <ToolLayout categoryId="video-tools">
                  <CoverSaver />
                </ToolLayout>
              }
            />
            <Route
              path="/video-tools/timestamp"
              element={
                <ToolLayout categoryId="video-tools">
                  <PlaceholderTool
                    icon={Scissors}
                    title="时间戳去除"
                    description="自动识别并去除视频中的时间戳水印"
                  />
                </ToolLayout>
              }
            />

            {/* 图片处理 */}
            <Route
              path="/image-tools/grid"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageGrid />
                </ToolLayout>
              }
            />
            <Route
              path="/image-tools/stitch"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageStitch />
                </ToolLayout>
              }
            />
            <Route
              path="/image-tools/compress"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageCompress />
                </ToolLayout>
              }
            />
            <Route
              path="/image-tools/convert"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageConvert />
                </ToolLayout>
              }
            />
            <Route
              path="/image-tools/crop"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageCrop />
                </ToolLayout>
              }
            />
            <Route
              path="/image-tools/rotate"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageRotate />
                </ToolLayout>
              }
            />
            <Route
              path="/image-tools/watermark"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageWatermark />
                </ToolLayout>
              }
            />
            <Route
              path="/image-tools/remove-bg"
              element={
                <ToolLayout categoryId="image-tools">
                  <ImageRemoveBg />
                </ToolLayout>
              }
            />

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="py-20 px-4 text-center">
                  <h2 className="font-serif text-2xl font-bold text-ink-900 mb-2">页面不存在</h2>
                  <p className="text-ink-500 mb-6">
                    <Link to="/" className="text-amber-accent hover:underline">
                      返回首页
                    </Link>
                  </p>
                </div>
              }
            />
          </Routes>
        </main>

        {/* 底部版权 */}
        <Footer />

        {/* 右侧悬浮联系按钮 */}
        <FloatingContact />
      </div>
    </Router>
  );
}
