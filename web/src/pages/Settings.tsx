import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/app';
import { Key, Check, Eye, EyeOff, ArrowLeft } from 'lucide-react';

/**
 * 设置页面
 * 配置大模型 API Key 等设置
 */
export default function Settings() {
  const navigate = useNavigate();
  const { models, activeModelId, setApiKey, setActiveModel } = useAppStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  /**
   * 切换显示/隐藏 API Key
   */
  const toggleShowKey = (modelId: string) => {
    setShowKeys((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  };

  return (
    <div className="py-8 px-4">
      <div className="container xl:max-w-3xl">
        {/* 返回按钮 + 标题 */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-ink-500 hover:text-ink-900 transition-colors mb-4"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="font-serif text-3xl font-bold text-ink-900 mb-2">设置</h1>
          <p className="text-ink-500">配置大模型 API 密钥，密钥仅保存在当前浏览器会话中</p>
        </div>

        {/* API Key 配置 */}
        <div className="bg-white rounded-xl shadow-card border border-cream-100 overflow-hidden">
          <div className="p-5 border-b border-cream-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-accent/10 flex items-center justify-center">
                <Key size={20} className="text-amber-accent" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink-900">大模型 API</h2>
                <p className="text-sm text-ink-500">配置后可使用文案提取等 AI 功能</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-cream-100">
            {Object.values(models).map((model) => (
              <div
                key={model.id}
                className={`p-5 transition-colors ${
                  activeModelId === model.id ? 'bg-amber-accent/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* 选中按钮 */}
                  <button
                    onClick={() => setActiveModel(model.id)}
                    className={`
                      w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0
                      flex items-center justify-center transition-colors
                      ${activeModelId === model.id
                        ? 'border-amber-accent bg-amber-accent'
                        : 'border-ink-300 hover:border-ink-500'
                      }
                    `}
                  >
                    {activeModelId === model.id && (
                      <Check size={12} className="text-white" strokeWidth={3} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-ink-900">{model.name}</h3>
                      <span className="text-xs text-ink-300 font-mono">{model.defaultModel}</span>
                    </div>
                    <p className="text-sm text-ink-500 mb-3">{model.baseUrl}</p>

                    {/* API Key 输入 */}
                    <div className="relative">
                      <input
                        type={showKeys[model.id] ? 'text' : 'password'}
                        value={model.apiKey}
                        onChange={(e) => setApiKey(model.id, e.target.value)}
                        placeholder={`输入 ${model.name} API Key`}
                        className="w-full px-4 py-2.5 pr-12 rounded-lg border border-cream-300 bg-cream-50
                                   text-ink-900 placeholder-ink-300 text-sm font-mono
                                   focus:outline-none focus:ring-2 focus:ring-amber-accent/30 focus:border-amber-accent
                                   focus:bg-white transition-all"
                      />
                      <button
                        onClick={() => toggleShowKey(model.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500 transition-colors"
                      >
                        {showKeys[model.id] ? (
                          <EyeOff size={18} strokeWidth={1.5} />
                        ) : (
                          <Eye size={18} strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-cream-50 border-t border-cream-100">
            <p className="text-xs text-ink-300">
              🔒 密钥仅保存在浏览器内存中，刷新页面后会自动清除，不会上传到服务器
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
