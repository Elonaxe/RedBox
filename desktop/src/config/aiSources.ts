export interface AiSourcePreset {
  id: string;
  label: string;
  baseURL: string;
  protocol: 'openai' | 'anthropic' | 'gemini';
}

export interface AiSourceConfig {
  id: string;
  name: string;
  presetId: string;
  baseURL: string;
  apiKey: string;
  model: string;
  protocol?: 'openai' | 'anthropic' | 'gemini';
}

export const DEFAULT_AI_PRESET_ID = 'openai';

// Presets aligned with common OpenAI-compatible providers (referencing AionUi design).
export const AI_SOURCE_PRESETS: AiSourcePreset[] = [
  { id: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1', protocol: 'openai' },
  { id: 'anthropic', label: 'Anthropic', baseURL: 'https://api.anthropic.com', protocol: 'anthropic' },
  { id: 'gemini', label: 'Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta', protocol: 'gemini' },
  { id: 'deepseek', label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', protocol: 'openai' },
  { id: 'openrouter', label: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', protocol: 'openai' },
  { id: 'dashscope', label: 'DashScope (Qwen)', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', protocol: 'openai' },
  { id: 'moonshot-cn', label: 'Moonshot (CN)', baseURL: 'https://api.moonshot.cn/v1', protocol: 'openai' },
  { id: 'moonshot-global', label: 'Moonshot (Global)', baseURL: 'https://api.moonshot.ai/v1', protocol: 'openai' },
  { id: 'siliconflow-cn', label: 'SiliconFlow (CN)', baseURL: 'https://api.siliconflow.cn/v1', protocol: 'openai' },
  { id: 'siliconflow', label: 'SiliconFlow', baseURL: 'https://api.siliconflow.com/v1', protocol: 'openai' },
  { id: 'zhipu', label: 'Zhipu', baseURL: 'https://open.bigmodel.cn/api/paas/v4', protocol: 'openai' },
  { id: 'xai', label: 'xAI', baseURL: 'https://api.x.ai/v1', protocol: 'openai' },
  { id: 'ark', label: 'Volcengine Ark', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', protocol: 'openai' },
  { id: 'qianfan', label: 'Qianfan', baseURL: 'https://qianfan.baidubce.com/v2', protocol: 'openai' },
  { id: 'hunyuan', label: 'Hunyuan', baseURL: 'https://api.hunyuan.cloud.tencent.com/v1', protocol: 'openai' },
  { id: 'lingyi', label: 'Lingyi', baseURL: 'https://api.lingyiwanwu.com/v1', protocol: 'openai' },
  { id: 'ppio', label: 'PPIO', baseURL: 'https://api.ppinfra.com/v3/openai', protocol: 'openai' },
  { id: 'modelscope', label: 'ModelScope', baseURL: 'https://api-inference.modelscope.cn/v1', protocol: 'openai' },
  { id: 'custom', label: 'Custom', baseURL: '', protocol: 'openai' },
];

const normalizeEndpoint = (endpoint: string): string => {
  const value = endpoint.trim().replace(/\/+$/, '');
  return value.toLowerCase();
};

export const findAiPresetById = (presetId: string): AiSourcePreset | undefined => {
  return AI_SOURCE_PRESETS.find((preset) => preset.id === presetId);
};

export const inferPresetIdByEndpoint = (endpoint: string): string => {
  const normalized = normalizeEndpoint(endpoint);
  if (!normalized) return DEFAULT_AI_PRESET_ID;

  const exact = AI_SOURCE_PRESETS.find((preset) => {
    if (!preset.baseURL) return false;
    return normalizeEndpoint(preset.baseURL) === normalized;
  });
  if (exact) return exact.id;

  const fuzzy = AI_SOURCE_PRESETS.find((preset) => {
    if (!preset.baseURL) return false;
    const presetHost = normalizeEndpoint(preset.baseURL)
      .replace(/^https?:\/\//, '')
      .split('/')[0];
    return normalized.includes(presetHost);
  });
  return fuzzy?.id || 'custom';
};
