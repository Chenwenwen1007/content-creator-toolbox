import { create } from 'zustand';

export interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
}

interface AppState {
  models: Record<string, ModelConfig>;
  activeModelId: string;
  setApiKey: (modelId: string, apiKey: string) => void;
  setActiveModel: (modelId: string) => void;
  getActiveModel: () => ModelConfig | null;
}

const defaultModels: Record<string, ModelConfig> = {
  doubao: {
    id: 'doubao',
    name: '豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-seed-1-6-flash-250828',
    apiKey: '',
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    apiKey: '',
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'abab6.5s-chat',
    apiKey: '',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    apiKey: '',
  },
};

/**
 * 应用全局状态管理
 * 存储大模型配置，仅保存在内存中（刷新页面即丢失
 */
export const useAppStore = create<AppState>((set, get) => ({
  models: defaultModels,
  activeModelId: 'doubao',

  /**
   * 设置指定模型的 API Key
   * @param modelId 模型ID
   * @param apiKey API密钥
   */
  setApiKey: (modelId: string, apiKey: string) =>
    set((state) => ({
      models: {
        ...state.models,
        [modelId]: {
          ...state.models[modelId],
          apiKey,
        },
      },
    })),

  /**
   * 设置当前激活的模型
   * @param modelId 模型ID
   */
  setActiveModel: (modelId: string) => set({ activeModelId: modelId }),

  /**
   * 获取当前激活的模型配置
   * @returns 当前模型配置，如果API Key为空则返回null
   */
  getActiveModel: () => {
    const state = get();
    const model = state.models[state.activeModelId];
    if (!model || !model.apiKey) return null;
    return model;
  },
}));
