export type AiProtocol = 'openai' | 'anthropic' | 'gemini';

export interface AiSourceConnectionInput {
  apiKey: string;
  baseURL: string;
  presetId?: string;
  protocol?: AiProtocol;
}

export interface AiModelInfo {
  id: string;
}

export interface AiConnectionTestResult {
  success: boolean;
  protocol: AiProtocol;
  models: AiModelInfo[];
  message: string;
}

const GEMINI_HOST_HINTS = ['generativelanguage.googleapis.com', 'aiplatform.googleapis.com', 'googleapis.com'];
const ANTHROPIC_HOST_HINTS = ['anthropic.com'];

const normalizeBaseUrl = (baseURL: string): string => {
  return String(baseURL || '').trim().replace(/\/+$/, '');
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> => {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const safeUrlJoin = (baseURL: string, path: string): string => {
  const normalized = normalizeBaseUrl(baseURL);
  if (!normalized) return path;
  if (normalized.endsWith(path)) return normalized;
  return `${normalized}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const detectAiProtocol = (input: {
  baseURL: string;
  presetId?: string;
  protocol?: string;
}): AiProtocol => {
  const explicit = String(input.protocol || '').trim().toLowerCase();
  if (explicit === 'anthropic' || explicit === 'gemini' || explicit === 'openai') {
    return explicit as AiProtocol;
  }

  const preset = String(input.presetId || '').trim().toLowerCase();
  if (preset === 'anthropic') return 'anthropic';
  if (preset === 'gemini' || preset === 'google') return 'gemini';

  const base = normalizeBaseUrl(input.baseURL).toLowerCase();
  if (ANTHROPIC_HOST_HINTS.some((hint) => base.includes(hint))) {
    return 'anthropic';
  }
  if (GEMINI_HOST_HINTS.some((hint) => base.includes(hint)) && !base.includes('compatible-mode')) {
    return 'gemini';
  }
  return 'openai';
};

const fetchOpenAiModels = async (baseURL: string, apiKey: string): Promise<AiModelInfo[]> => {
  const candidates = [
    safeUrlJoin(baseURL, '/models'),
    safeUrlJoin(baseURL, '/v1/models'),
  ];

  for (const endpoint of candidates) {
    const response = await withTimeout(fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }));

    if (!response.ok) {
      if (response.status === 404) {
        continue;
      }
      const text = await response.text().catch(() => '');
      throw new Error(`OpenAI-compatible API error (${response.status}): ${text || response.statusText}`);
    }

    const data = await response.json() as { data?: Array<{ id?: string }> };
    const models = Array.isArray(data?.data)
      ? data.data
          .map((item) => String(item?.id || '').trim())
          .filter(Boolean)
          .map((id) => ({ id }))
      : [];

    if (models.length > 0) {
      return models;
    }
  }

  return [];
};

const fetchAnthropicModels = async (baseURL: string, apiKey: string): Promise<AiModelInfo[]> => {
  const endpoint = safeUrlJoin(baseURL, '/v1/models');
  const response = await withTimeout(fetch(endpoint, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
  }));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Anthropic API error (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json() as { data?: Array<{ id?: string }> };
  return Array.isArray(data?.data)
    ? data.data
        .map((item) => String(item?.id || '').trim())
        .filter(Boolean)
        .map((id) => ({ id }))
    : [];
};

const fetchGeminiModels = async (baseURL: string, apiKey: string): Promise<AiModelInfo[]> => {
  const normalized = normalizeBaseUrl(baseURL) || 'https://generativelanguage.googleapis.com/v1beta';
  const endpoint = `${safeUrlJoin(normalized, '/models')}?key=${encodeURIComponent(apiKey)}`;
  const response = await withTimeout(fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
    },
  }));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Gemini API error (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json() as { models?: Array<{ name?: string; displayName?: string }> };
  return Array.isArray(data?.models)
    ? data.models
        .map((item) => String(item?.name || item?.displayName || '').replace(/^models\//, '').trim())
        .filter(Boolean)
        .map((id) => ({ id }))
    : [];
};

export async function fetchModelsForAiSource(input: AiSourceConnectionInput): Promise<{ protocol: AiProtocol; models: AiModelInfo[] }> {
  const protocol = detectAiProtocol(input);
  const baseURL = normalizeBaseUrl(input.baseURL);
  const apiKey = String(input.apiKey || '').trim();

  if (!baseURL) {
    throw new Error('Base URL is required');
  }
  if (!apiKey) {
    throw new Error('API Key is required');
  }

  let models: AiModelInfo[] = [];
  if (protocol === 'anthropic') {
    models = await fetchAnthropicModels(baseURL, apiKey);
  } else if (protocol === 'gemini') {
    models = await fetchGeminiModels(baseURL, apiKey);
  } else {
    models = await fetchOpenAiModels(baseURL, apiKey);
  }

  return { protocol, models };
}

export async function testAiSourceConnection(input: AiSourceConnectionInput): Promise<AiConnectionTestResult> {
  const { protocol, models } = await fetchModelsForAiSource(input);
  return {
    success: true,
    protocol,
    models,
    message: `连接成功（${protocol}），可用模型 ${models.length} 个`,
  };
}
