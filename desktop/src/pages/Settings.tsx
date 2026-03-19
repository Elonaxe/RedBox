import { useEffect, useMemo, useState } from 'react';
import { Save, RefreshCw, CheckCircle2, AlertCircle, FolderOpen, Wrench, Download, LayoutGrid, Cpu, Database, Trash2, Eye, EyeOff, FlaskConical, Info, Brain, Plus, Star } from 'lucide-react';
import clsx from 'clsx';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import {
  AI_SOURCE_PRESETS,
  type AiSourceConfig,
  DEFAULT_AI_PRESET_ID,
  findAiPresetById,
  inferPresetIdByEndpoint
} from '../config/aiSources';

interface UserMemory {
  id: string;
  content: string;
  type: 'general' | 'preference' | 'fact';
  tags: string[];
  created_at: number;
}

type AiProtocol = 'openai' | 'anthropic' | 'gemini';

interface McpServerConfig {
  id: string;
  name: string;
  enabled: boolean;
  transport: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  oauth?: {
    enabled?: boolean;
    tokenPath?: string;
  };
}

const generateAiSourceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ai_source_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createAiSourceFromPreset = (presetId: string = DEFAULT_AI_PRESET_ID): AiSourceConfig => {
  const preset = findAiPresetById(presetId) || findAiPresetById(DEFAULT_AI_PRESET_ID);
  return {
    id: generateAiSourceId(),
    name: preset?.label || '自定义 AI 源',
    presetId: preset?.id || 'custom',
    baseURL: preset?.baseURL || '',
    apiKey: '',
    model: '',
    protocol: preset?.protocol || 'openai',
  };
};

const parseAiSources = (raw: string | undefined): AiSourceConfig[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => {
        const baseURL = String(item.baseURL || item.baseUrl || '');
        const presetId = String(item.presetId || inferPresetIdByEndpoint(baseURL) || 'custom');
        return {
          id: String(item.id || generateAiSourceId()),
          name: String(item.name || findAiPresetById(presetId)?.label || 'AI 源'),
          presetId,
          baseURL,
          apiKey: String(item.apiKey || item.key || ''),
          model: String(item.model || item.modelName || ''),
          protocol: (String(item.protocol || findAiPresetById(presetId)?.protocol || 'openai') as AiProtocol),
        } satisfies AiSourceConfig;
      });
    const seen = new Set<string>();
    return normalized.filter((source) => {
      if (seen.has(source.id)) return false;
      seen.add(source.id);
      return true;
    });
  } catch {
    return [];
  }
};

const generateMcpServerId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createDefaultMcpServer = (): McpServerConfig => ({
  id: generateMcpServerId(),
  name: 'New MCP Server',
  enabled: true,
  transport: 'stdio',
  command: '',
  args: [],
  env: {},
  url: '',
  oauth: {
    enabled: false,
  },
});

const parseMcpServers = (raw: string | undefined): McpServerConfig[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: String(item.id || generateMcpServerId()),
        name: String(item.name || 'MCP Server'),
        enabled: item.enabled === undefined ? true : Boolean(item.enabled),
        transport: (item.transport === 'sse' || item.transport === 'streamable-http' ? item.transport : 'stdio'),
        command: String(item.command || ''),
        args: Array.isArray(item.args) ? item.args.map((arg) => String(arg || '').trim()).filter(Boolean) : [],
        env: item.env && typeof item.env === 'object'
          ? Object.fromEntries(
              Object.entries(item.env as Record<string, unknown>)
                .map(([key, value]) => [key, String(value || '').trim()])
                .filter(([, value]) => Boolean(value))
            )
          : {},
        url: String(item.url || ''),
        oauth: item.oauth && typeof item.oauth === 'object'
          ? {
              enabled: (item.oauth as Record<string, unknown>).enabled === undefined
                ? undefined
                : Boolean((item.oauth as Record<string, unknown>).enabled),
              tokenPath: String((item.oauth as Record<string, unknown>).tokenPath || ''),
            }
          : undefined,
      }));
  } catch {
    return [];
  }
};

const stringifyEnvRecord = (env?: Record<string, string>): string => {
  if (!env) return '';
  return Object.entries(env)
    .filter(([key, value]) => Boolean(key.trim()) && Boolean(String(value || '').trim()))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
};

const parseEnvText = (raw: string): Record<string, string> => {
  const lines = String(raw || '').split('\n');
  const entries: Array<[string, string]> = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key || !value) continue;
    entries.push([key, value]);
  }
  return Object.fromEntries(entries);
};

function PasswordInput({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={clsx(className, "pr-10")}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'knowledge' | 'tools' | 'memory' | 'experimental'>('general');
  const { flags, updateFlag } = useFeatureFlags();
  const [formData, setFormData] = useState({
    api_endpoint: '',
    api_key: '',
    model_name: '',
    workspace_dir: '',
    transcription_model: '',
    transcription_endpoint: '',
    transcription_key: '',
    embedding_endpoint: '',
    embedding_key: '',
    embedding_model: '',
    image_provider: 'openai-compatible',
    image_endpoint: '',
    image_api_key: '',
    image_model: 'gpt-image-1',
    image_size: '1024x1024',
    image_quality: 'standard',
    redclaw_compact_target_tokens: '256000',
  });
  const [aiSources, setAiSources] = useState<AiSourceConfig[]>([]);
  const [defaultAiSourceId, setDefaultAiSourceId] = useState('');
  const [activeAiSourceId, setActiveAiSourceId] = useState('');
  const [detectedAiProtocol, setDetectedAiProtocol] = useState<AiProtocol>('openai');

  const [availableModels, setAvailableModels] = useState<Array<{ id: string }>>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const defaultAiSource = useMemo(() => {
    if (!aiSources.length) return null;
    return aiSources.find((source) => source.id === defaultAiSourceId) || aiSources[0];
  }, [aiSources, defaultAiSourceId]);

  const activeAiSource = useMemo(() => {
    if (!aiSources.length) return null;
    return aiSources.find((source) => source.id === activeAiSourceId) || defaultAiSource || aiSources[0];
  }, [aiSources, activeAiSourceId, defaultAiSource]);

  // Tools State
  const [ytdlpStatus, setYtdlpStatus] = useState<{ installed: boolean; version?: string; path?: string } | null>(null);
  const [isInstallingTool, setIsInstallingTool] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [mcpStatusMessage, setMcpStatusMessage] = useState('');
  const [isSyncingMcp, setIsSyncingMcp] = useState(false);
  const [mcpTestingId, setMcpTestingId] = useState('');
  const [mcpOauthState, setMcpOauthState] = useState<Record<string, { connected: boolean; tokenPath?: string }>>({});

  // Knowledge State
  const [vectorStats, setVectorStats] = useState<{ vectors: number; documents: number } | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Update State
  const [appVersion, setAppVersion] = useState('');

  // Memory State
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<'general' | 'preference' | 'fact'>('general');
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    checkTools();
    loadVectorStats();
    loadAppVersion();
    if (activeTab === 'memory') loadMemories();

    const handleProgress = (_: unknown, progress: number) => {
      setInstallProgress(progress);
    };
    window.ipcRenderer.on('youtube:install-progress', handleProgress);
    return () => {
      window.ipcRenderer.off('youtube:install-progress', handleProgress);
    };
  }, [activeTab]);

  useEffect(() => {
    setTestStatus('idle');
    setTestMsg('');
    setDetectedAiProtocol((activeAiSource?.protocol || 'openai') as AiProtocol);
  }, [activeAiSourceId, activeAiSource?.protocol]);

  useEffect(() => {
    if (!mcpStatusMessage) return;
    const timer = window.setTimeout(() => setMcpStatusMessage(''), 2800);
    return () => window.clearTimeout(timer);
  }, [mcpStatusMessage]);

  useEffect(() => {
    if (activeTab !== 'tools') return;
    for (const server of mcpServers) {
      void handleRefreshMcpOAuth(server);
    }
  }, [activeTab, mcpServers]);

  useEffect(() => {
    if (!activeAiSource) return;
    let cancelled = false;
    const detect = async () => {
      try {
        const result = await window.ipcRenderer.detectAiProtocol({
          baseURL: activeAiSource.baseURL,
          presetId: activeAiSource.presetId,
          protocol: activeAiSource.protocol,
        });
        if (cancelled || !result?.success || !result.protocol) return;
        setDetectedAiProtocol(result.protocol);
        if (activeAiSource.protocol !== result.protocol) {
          updateAiSource(activeAiSource.id, (source) => ({ ...source, protocol: result.protocol }));
        }
      } catch {
        // ignore detect failures for live typing
      }
    };
    void detect();
    return () => {
      cancelled = true;
    };
  }, [activeAiSource?.id, activeAiSource?.baseURL, activeAiSource?.presetId]);

  const updateAiSource = (sourceId: string, updater: (source: AiSourceConfig) => AiSourceConfig) => {
    setAiSources((prev) => prev.map((source) => (source.id === sourceId ? updater(source) : source)));
  };

  const handleAddAiSource = () => {
    const nextSource = createAiSourceFromPreset(DEFAULT_AI_PRESET_ID);
    setAiSources((prev) => [...prev, nextSource]);
    setActiveAiSourceId(nextSource.id);
    setDefaultAiSourceId((prev) => prev || nextSource.id);
  };

  const handleDeleteAiSource = (sourceId: string) => {
    setAiSources((prev) => {
      const next = prev.filter((source) => source.id !== sourceId);
      if (!next.length) {
        const fallback = createAiSourceFromPreset(DEFAULT_AI_PRESET_ID);
        setActiveAiSourceId(fallback.id);
        setDefaultAiSourceId(fallback.id);
        return [fallback];
      }
      setDefaultAiSourceId((prevDefaultId) => (prevDefaultId === sourceId ? next[0].id : prevDefaultId));
      setActiveAiSourceId((prevActiveId) => (prevActiveId === sourceId ? next[0].id : prevActiveId));
      return next;
    });
  };

  const persistMcpServers = async (nextServers: McpServerConfig[], tip?: string) => {
    setIsSyncingMcp(true);
    try {
      const result = await window.ipcRenderer.mcp.save(nextServers);
      if (!result?.success) {
        setMcpStatusMessage(result?.error || 'MCP 配置保存失败');
        return false;
      }
      setMcpServers((result.servers || nextServers) as McpServerConfig[]);
      if (tip) setMcpStatusMessage(tip);
      return true;
    } catch (error) {
      console.error('Failed to persist MCP servers:', error);
      setMcpStatusMessage('MCP 配置保存失败');
      return false;
    } finally {
      setIsSyncingMcp(false);
    }
  };

  const handleAddMcpServer = async () => {
    const next = [...mcpServers, createDefaultMcpServer()];
    await persistMcpServers(next, '已新增 MCP Server，请完善配置后保存');
  };

  const handleDeleteMcpServer = async (serverId: string) => {
    const next = mcpServers.filter((item) => item.id !== serverId);
    await persistMcpServers(next, '已删除 MCP Server');
  };

  const handleUpdateMcpServer = (serverId: string, updater: (server: McpServerConfig) => McpServerConfig) => {
    setMcpServers((prev) => prev.map((server) => (server.id === serverId ? updater(server) : server)));
  };

  const handleSaveMcpServers = async () => {
    await persistMcpServers(mcpServers, 'MCP 配置已保存');
  };

  const handleDiscoverAndImportMcp = async () => {
    setIsSyncingMcp(true);
    try {
      const result = await window.ipcRenderer.mcp.importLocal();
      if (!result?.success) {
        setMcpStatusMessage(result?.error || '导入本机 MCP 配置失败');
        return;
      }
      setMcpServers((result.servers || []) as McpServerConfig[]);
      setMcpStatusMessage(`已导入 ${result.imported || 0} 个 MCP Server（共 ${result.total || 0} 个）`);
    } catch (error) {
      console.error('Failed to import local MCP configs:', error);
      setMcpStatusMessage('导入本机 MCP 配置失败');
    } finally {
      setIsSyncingMcp(false);
    }
  };

  const handleTestMcpServer = async (server: McpServerConfig) => {
    setMcpTestingId(server.id);
    try {
      const result = await window.ipcRenderer.mcp.test(server);
      setMcpStatusMessage(`${server.name}：${result.message}`);
    } catch (error) {
      console.error('Failed to test MCP server:', error);
      setMcpStatusMessage(`${server.name}：测试失败`);
    } finally {
      setMcpTestingId('');
    }
  };

  const handleRefreshMcpOAuth = async (server: McpServerConfig) => {
    try {
      const result = await window.ipcRenderer.mcp.oauthStatus(server.id);
      if (!result?.success) return;
      setMcpOauthState((prev) => ({
        ...prev,
        [server.id]: {
          connected: Boolean(result.connected),
          tokenPath: result.tokenPath,
        },
      }));
    } catch (error) {
      console.error('Failed to query MCP oauth status:', error);
    }
  };

  const loadMemories = async () => {
    setIsMemoryLoading(true);
    try {
      const data = await window.ipcRenderer.invoke('memory:list') as UserMemory[];
      setMemories(data);
    } catch (e) {
      console.error("Failed to load memories", e);
    } finally {
      setIsMemoryLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    try {
      await window.ipcRenderer.invoke('memory:add', {
        content: newMemoryContent,
        type: newMemoryType,
        tags: []
      });
      setNewMemoryContent('');
      loadMemories();
    } catch (e) {
      console.error("Failed to add memory", e);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('确定要删除这条记忆吗？')) return;
    try {
      await window.ipcRenderer.invoke('memory:delete', id);
      loadMemories();
    } catch (e) {
      console.error("Failed to delete memory", e);
    }
  };

  const loadAppVersion = async () => {
    try {
      const version = await window.ipcRenderer.getAppVersion();
      setAppVersion(version || '');
    } catch (e) {
      console.error('Failed to load app version:', e);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await window.ipcRenderer.getSettings();
      if (settings) {
        let sourceList = parseAiSources(settings.ai_sources_json);
        if (!sourceList.length && (settings.api_endpoint || settings.api_key || settings.model_name)) {
          const inferredPresetId = inferPresetIdByEndpoint(settings.api_endpoint || '');
          sourceList = [{
            id: generateAiSourceId(),
            name: findAiPresetById(inferredPresetId)?.label || '默认 AI 源',
            presetId: inferredPresetId,
            baseURL: settings.api_endpoint || '',
            apiKey: settings.api_key || '',
            model: settings.model_name || '',
            protocol: findAiPresetById(inferredPresetId)?.protocol || 'openai',
          }];
        }
        if (!sourceList.length) {
          sourceList = [createAiSourceFromPreset(DEFAULT_AI_PRESET_ID)];
        }

        const loadedDefaultId = settings.default_ai_source_id || sourceList[0]?.id || '';
        const normalizedDefaultId = sourceList.some((source) => source.id === loadedDefaultId)
          ? loadedDefaultId
          : sourceList[0].id;
        const resolvedDefaultSource = sourceList.find((source) => source.id === normalizedDefaultId) || sourceList[0];

        setAiSources(sourceList);
        setDefaultAiSourceId(normalizedDefaultId);
        setActiveAiSourceId(normalizedDefaultId);
        setDetectedAiProtocol((resolvedDefaultSource?.protocol || findAiPresetById(resolvedDefaultSource?.presetId || '')?.protocol || 'openai') as AiProtocol);
        setMcpServers(parseMcpServers(settings.mcp_servers_json));

        setFormData({
          api_endpoint: resolvedDefaultSource?.baseURL || settings.api_endpoint || '',
          api_key: resolvedDefaultSource?.apiKey || settings.api_key || '',
          model_name: resolvedDefaultSource?.model || settings.model_name || '',
          workspace_dir: settings.workspace_dir || '',
          transcription_model: settings.transcription_model || '',
          transcription_endpoint: settings.transcription_endpoint || '',
          transcription_key: settings.transcription_key || '',
          embedding_endpoint: settings.embedding_endpoint || '',
          embedding_key: settings.embedding_key || '',
          embedding_model: settings.embedding_model || '',
          image_provider: settings.image_provider || 'openai-compatible',
          image_endpoint: settings.image_endpoint || '',
          image_api_key: settings.image_api_key || '',
          image_model: settings.image_model || 'gpt-image-1',
          image_size: settings.image_size || '1024x1024',
          image_quality: settings.image_quality || 'standard',
          redclaw_compact_target_tokens: String(settings.redclaw_compact_target_tokens || 256000),
        });
      } else {
        const fallback = createAiSourceFromPreset(DEFAULT_AI_PRESET_ID);
        setAiSources([fallback]);
        setDefaultAiSourceId(fallback.id);
        setActiveAiSourceId(fallback.id);
        setDetectedAiProtocol('openai');
        setMcpServers([]);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const checkTools = async () => {
    try {
      const status = await window.ipcRenderer.checkYtdlp();
      setYtdlpStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  const loadVectorStats = async () => {
    try {
      const stats = await window.ipcRenderer.invoke('indexing:get-stats') as { totalStats: { vectors: number; documents: number } } | null;
      if (stats && stats.totalStats) {
        setVectorStats(stats.totalStats);
      }
    } catch (e) {
      console.error("Failed to load vector stats", e);
    }
  };

  const handleRebuildIndex = async () => {
    if (!confirm('确定要重建所有索引吗？这可能需要一些时间，且会暂时清空现有向量数据。')) return;

    setIsRebuilding(true);
    try {
      await window.ipcRenderer.invoke('indexing:rebuild-all');
      alert('已触发后台索引重建任务。您可以在侧边栏查看进度。');
      loadVectorStats();
    } catch (e) {
      alert('重建失败: ' + String(e));
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleInstallYtdlp = async () => {
    setIsInstallingTool(true);
    setInstallProgress(0);
    try {
      const res = await window.ipcRenderer.installYtdlp();
      if (res.success) {
        await checkTools();
        alert('安装成功！');
      } else {
        alert('安装失败: ' + res.error);
      }
    } catch (e) {
      alert('安装出错');
    } finally {
      setIsInstallingTool(false);
    }
  };

  const handleUpdateYtdlp = async () => {
    setIsInstallingTool(true);
    try {
      const res = await window.ipcRenderer.updateYtdlp();
      if (res.success) {
        await checkTools();
        alert('更新成功！');
      } else {
        alert('更新失败: ' + res.error);
      }
    } catch (e) {
      alert('更新出错');
    } finally {
      setIsInstallingTool(false);
    }
  };

  const handleTestConnection = async () => {
    const source = activeAiSource || defaultAiSource;
    if (!source?.baseURL || !source?.apiKey) {
      setTestStatus('error');
      setTestMsg('请先填写当前 AI 源的 Endpoint 与 API Key');
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    setTestMsg('');

    try {
      const detectResult = await window.ipcRenderer.detectAiProtocol({
        baseURL: source.baseURL,
        presetId: source.presetId,
        protocol: source.protocol,
      });

      const protocol = detectResult?.protocol || source.protocol || 'openai';
      setDetectedAiProtocol(protocol);
      updateAiSource(source.id, (prev) => ({ ...prev, protocol }));

      const testResult = await window.ipcRenderer.testAiConnection({
        apiKey: source.apiKey,
        baseURL: source.baseURL,
        presetId: source.presetId,
        protocol,
      });

      if (!testResult.success) {
        setAvailableModels([]);
        setTestStatus('error');
        setTestMsg(testResult.message || 'Connection failed');
        return;
      }

      setAvailableModels(testResult.models || []);
      setTestStatus('success');
      setTestMsg(testResult.message || `Connected! Found ${testResult.models?.length || 0} models.`);
    } catch (e: unknown) {
      setTestStatus('error');
      const message = e instanceof Error ? e.message : 'Connection failed';
      setTestMsg(message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    try {
      const sanitizedSources = aiSources.map((source) => ({
        ...source,
        name: source.name.trim(),
        presetId: source.presetId.trim() || 'custom',
        baseURL: source.baseURL.trim(),
        apiKey: source.apiKey.trim(),
        model: source.model.trim(),
        protocol: source.protocol || findAiPresetById(source.presetId)?.protocol || 'openai',
      }));
      const defaultSource = sanitizedSources.find((source) => source.id === defaultAiSourceId) || sanitizedSources[0];
      const parsedCompactTokens = Number(formData.redclaw_compact_target_tokens);
      const compactTargetTokens = Number.isFinite(parsedCompactTokens) && parsedCompactTokens > 0
        ? Math.max(16000, Math.floor(parsedCompactTokens))
        : 256000;

      await window.ipcRenderer.saveSettings({
        ...formData,
        api_endpoint: defaultSource?.baseURL || '',
        api_key: defaultSource?.apiKey || '',
        model_name: defaultSource?.model || '',
        ai_sources_json: JSON.stringify(sanitizedSources),
        default_ai_source_id: defaultSource?.id || '',
        mcp_servers_json: JSON.stringify(mcpServers),
        redclaw_compact_target_tokens: compactTargetTokens,
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const tabs = [
    { id: 'general', label: '常规设置', icon: LayoutGrid },
    { id: 'ai', label: 'AI 模型', icon: Cpu },
    { id: 'memory', label: '用户记忆', icon: Brain },
    { id: 'knowledge', label: '知识库索引', icon: Database },
    { id: 'tools', label: '工具管理', icon: Wrench },
    { id: 'experimental', label: '实验性功能', icon: FlaskConical },
  ] as const;

  return (
    <div className="flex h-full bg-background text-text-primary">
      {/* Sidebar */}
      <div className="w-48 border-r border-border pt-6 pb-4 flex flex-col gap-1 px-3 bg-surface-secondary/20">
        <h1 className="px-3 mb-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">设置</h1>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id ? "bg-surface-secondary text-text-primary" : "text-text-secondary hover:bg-surface-secondary/50 hover:text-text-primary"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-8 py-8 pb-32">
          <form onSubmit={handleSave} className="space-y-10">

            {/* General Tab */}
            {activeTab === 'general' && (
              <section className="space-y-6">
                <h2 className="text-lg font-medium text-text-primary mb-6">常规设置</h2>

                {/* 版本信息与更新 */}
                <div className="bg-surface-secondary/30 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        红盒子 RedBox
                      </h3>
                      <p className="text-xs text-text-tertiary mt-1">
                        当前版本: <span className="font-mono">{appVersion || '加载中...'}</span>
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        自动更新已关闭，请前往 GitHub Releases 手动下载新版本。
                      </p>
                    </div>
                    <a
                      href="https://github.com/Jamailar/RedBox/releases"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 border border-border text-text-primary text-xs font-medium rounded hover:bg-surface-secondary"
                    >
                      <Download className="w-3 h-3" />
                      打开下载页
                    </a>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    数据存储路径
                  </label>
                  <p className="text-[10px] text-text-tertiary mb-2">
                    技能和知识库文件将保存在此目录下。留空则使用默认目录 ~/.redconvert
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="text"
                        value={formData.workspace_dir}
                        onChange={e => setFormData(d => ({ ...d, workspace_dir: e.target.value }))}
                        placeholder="~/.redconvert"
                        className="w-full bg-surface-secondary/30 rounded border border-border pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-2">
                    目录结构：<code className="bg-surface-secondary px-1 rounded">/skills/</code> 技能文件 · <code className="bg-surface-secondary px-1 rounded">/knowledge/notes/</code> 笔记
                  </p>
                </div>
              </section>
            )}

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-10">
                {/* LLM Connection Config */}
                <section className="space-y-6">
                  <h2 className="text-lg font-medium text-text-primary mb-6">AI 模型设置</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-text-primary">聊天 AI 源</h3>
                        <p className="text-[11px] text-text-tertiary mt-1">
                          参考 AionUi 的多平台配置方式，可同时保存多个 AI 源，并指定默认源供全局聊天/Agent 使用。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAiSource}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs hover:bg-surface-secondary transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        新增 AI 源
                      </button>
                    </div>

                    <div className="space-y-2">
                      {aiSources.map((source) => {
                        const preset = findAiPresetById(source.presetId);
                        const isDefault = source.id === defaultAiSourceId;
                        const isActive = source.id === (activeAiSource?.id || '');
                        return (
                          <div
                            key={source.id}
                            onClick={() => setActiveAiSourceId(source.id)}
                            className={clsx(
                              "w-full text-left rounded-lg border p-3 transition-colors cursor-pointer",
                              isActive ? "border-accent-primary bg-surface-secondary/40" : "border-border bg-surface-secondary/20 hover:bg-surface-secondary/30"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-text-primary truncate">{source.name || '未命名 AI 源'}</span>
                                  {isDefault && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600">
                                      <Star className="w-2.5 h-2.5" />
                                      默认
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-text-tertiary mt-1 truncate">
                                  {preset?.label || 'Custom'} · {source.model || '(未设置模型)'}
                                </p>
                                <p className="text-[10px] text-text-tertiary mt-1 truncate">
                                  {source.baseURL || '(未设置 Endpoint)'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAiSource(source.id);
                                }}
                                className="p-1 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="删除 AI 源"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {activeAiSource && (
                      <div className="bg-surface-secondary/20 border border-border rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="group">
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">
                              来源名称
                            </label>
                            <input
                              type="text"
                              value={activeAiSource.name}
                              onChange={(e) => updateAiSource(activeAiSource.id, (source) => ({ ...source, name: e.target.value }))}
                              placeholder="例如：OpenAI 主账号"
                              className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">
                              平台预设
                            </label>
                            <select
                              value={activeAiSource.presetId}
                              onChange={(e) => {
                                const nextPresetId = e.target.value;
                                updateAiSource(activeAiSource.id, (source) => {
                                  const previousPreset = findAiPresetById(source.presetId);
                                  const nextPreset = findAiPresetById(nextPresetId);
                                  const shouldSyncBaseURL = !source.baseURL || (previousPreset?.baseURL && source.baseURL === previousPreset.baseURL);
                                  const shouldSyncName = !source.name || source.name === previousPreset?.label;
                                  return {
                                    ...source,
                                    presetId: nextPresetId,
                                    baseURL: shouldSyncBaseURL ? (nextPreset?.baseURL || '') : source.baseURL,
                                    name: shouldSyncName ? (nextPreset?.label || source.name) : source.name,
                                    protocol: nextPreset?.protocol || source.protocol || 'openai',
                                  };
                                });
                              }}
                              className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                            >
                              {AI_SOURCE_PRESETS.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="group">
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">
                              协议
                            </label>
                            <select
                              value={activeAiSource.protocol || 'openai'}
                              onChange={(e) => {
                                const protocol = (e.target.value as AiProtocol);
                                updateAiSource(activeAiSource.id, (source) => ({ ...source, protocol }));
                                setDetectedAiProtocol(protocol);
                              }}
                              className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                            >
                              <option value="openai">OpenAI Compatible</option>
                              <option value="anthropic">Anthropic Native</option>
                              <option value="gemini">Gemini Native</option>
                            </select>
                          </div>
                        </div>

                        <div className="group">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            API Endpoint (Base URL)
                          </label>
                          <input
                            type="text"
                            value={activeAiSource.baseURL}
                            onChange={(e) => updateAiSource(activeAiSource.id, (source) => ({ ...source, baseURL: e.target.value }))}
                            placeholder="https://api.openai.com/v1"
                            className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                          />
                        </div>

                        <div className="group">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            API Key
                          </label>
                          <PasswordInput
                            value={activeAiSource.apiKey}
                            onChange={(e) => updateAiSource(activeAiSource.id, (source) => ({ ...source, apiKey: e.target.value }))}
                            placeholder="sk-..."
                            className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                          />
                        </div>

                        <div className="group">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            模型名称
                          </label>
                          <input
                            type="text"
                            value={activeAiSource.model}
                            onChange={(e) => updateAiSource(activeAiSource.id, (source) => ({ ...source, model: e.target.value }))}
                            list="model-list"
                            placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                            className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                          />
                          <datalist id="model-list">
                            {availableModels.map((m) => (
                              <option key={m.id} value={m.id} />
                            ))}
                          </datalist>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activeAiSource.id === defaultAiSourceId}
                              onChange={(e) => {
                                if (e.target.checked) setDefaultAiSourceId(activeAiSource.id);
                              }}
                            />
                            设为默认聊天源
                          </label>

                          <div className="flex items-center space-x-4">
                            <button
                              type="button"
                              onClick={handleTestConnection}
                              disabled={isTesting}
                              className="flex items-center px-3 py-1.5 border border-border rounded text-xs hover:bg-surface-secondary transition-colors disabled:opacity-50"
                            >
                              {isTesting ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                              测试连接
                            </button>
                            <span className="text-[11px] text-text-tertiary">
                              当前协议: <span className="font-mono">{detectedAiProtocol}</span>
                            </span>

                            {testStatus === 'success' && (
                              <span className="flex items-center text-xs text-status-success">
                                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                {testMsg}
                              </span>
                            )}
                            {testStatus === 'error' && (
                              <span className="flex items-center text-xs text-status-error">
                                <AlertCircle className="w-3 h-3 mr-1.5" />
                                {testMsg}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      转录模型（视频/音频）
                    </label>
                    <input
                      type="text"
                      value={formData.transcription_model}
                      onChange={e => setFormData(d => ({ ...d, transcription_model: e.target.value }))}
                      placeholder="e.g. whisper-1"
                      className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                    />
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      用于小红书视频转录，默认 whisper-1
                    </p>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      转录 API Endpoint
                    </label>
                    <input
                      type="text"
                      value={formData.transcription_endpoint}
                      onChange={e => setFormData(d => ({ ...d, transcription_endpoint: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      转录 API Key
                    </label>
                    <PasswordInput
                      value={formData.transcription_key}
                      onChange={e => setFormData(d => ({ ...d, transcription_key: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-text-primary mb-4">Embedding 模型设置</h3>

                    <div className="space-y-4">
                      <div className="group">
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          Embedding 模型名称
                        </label>
                        <input
                          type="text"
                          value={formData.embedding_model}
                          onChange={e => setFormData(d => ({ ...d, embedding_model: e.target.value }))}
                          placeholder="e.g. text-embedding-3-small"
                          className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        />
                        <p className="mt-1 text-[11px] text-text-tertiary">
                          默认 text-embedding-3-small
                        </p>
                      </div>

                      <div className="group">
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          Embedding Endpoint
                        </label>
                        <input
                          type="text"
                          value={formData.embedding_endpoint}
                          onChange={e => setFormData(d => ({ ...d, embedding_endpoint: e.target.value }))}
                          placeholder="同上，留空则使用通用 API Endpoint"
                          className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        />
                      </div>

                      <div className="group">
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          Embedding API Key
                        </label>
                        <PasswordInput
                          value={formData.embedding_key}
                          onChange={e => setFormData(d => ({ ...d, embedding_key: e.target.value }))}
                          placeholder="同上，留空则使用通用 API Key"
                          className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-text-primary mb-4">生图模型设置</h3>

                    <div className="space-y-4">
                      <div className="group">
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          生图 Provider
                        </label>
                        <select
                          value={formData.image_provider}
                          onChange={e => setFormData(d => ({ ...d, image_provider: e.target.value }))}
                          className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        >
                          <option value="openai-compatible">OpenAI Compatible</option>
                          <option value="openai">OpenAI</option>
                          <option value="dashscope">DashScope Compatible</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div className="group">
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          生图 API Endpoint
                        </label>
                        <input
                          type="text"
                          value={formData.image_endpoint}
                          onChange={e => setFormData(d => ({ ...d, image_endpoint: e.target.value }))}
                          placeholder="如 https://api.openai.com/v1"
                          className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        />
                      </div>

                      <div className="group">
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          生图 API Key
                        </label>
                        <PasswordInput
                          value={formData.image_api_key}
                          onChange={e => setFormData(d => ({ ...d, image_api_key: e.target.value }))}
                          placeholder="留空则回退使用通用 API Key"
                          className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="group">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            生图模型
                          </label>
                          <input
                            type="text"
                            value={formData.image_model}
                            onChange={e => setFormData(d => ({ ...d, image_model: e.target.value }))}
                            placeholder="gpt-image-1"
                            className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                          />
                        </div>

                        <div className="group">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            默认尺寸
                          </label>
                          <select
                            value={formData.image_size}
                            onChange={e => setFormData(d => ({ ...d, image_size: e.target.value }))}
                            className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                          >
                            <option value="1024x1024">1024x1024</option>
                            <option value="1024x1536">1024x1536</option>
                            <option value="1536x1024">1536x1024</option>
                            <option value="auto">auto</option>
                          </select>
                        </div>

                        <div className="group">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            默认质量
                          </label>
                          <select
                            value={formData.image_quality}
                            onChange={e => setFormData(d => ({ ...d, image_quality: e.target.value }))}
                            className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                          >
                            <option value="standard">standard</option>
                            <option value="high">high</option>
                            <option value="auto">auto</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-text-primary mb-4">RedClaw 上下文压缩策略</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="group">
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          自动压缩阈值（tokens）
                        </label>
                        <input
                          type="number"
                          min={16000}
                          step={1000}
                          value={formData.redclaw_compact_target_tokens}
                          onChange={e => setFormData(d => ({ ...d, redclaw_compact_target_tokens: e.target.value }))}
                          className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                        />
                        <p className="mt-1 text-[11px] text-text-tertiary">
                          默认 256000。RedClaw 对话预计上下文超过该值时会自动 compact。
                        </p>
                      </div>
                    </div>
                  </div>

                </section>
              </div>
            )}

            {/* Memory Tab */}
            {activeTab === 'memory' && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-text-primary mb-2">用户记忆管理</h2>
                  <p className="text-xs text-text-tertiary">
                    AI 会自动从对话中提取并保存关于您的偏好和重要信息。您可以在此手动管理这些记忆。
                  </p>
                </div>

                {/* Add Memory Form */}
                <div className="bg-surface-secondary/30 rounded-lg border border-border p-4">
                  <form onSubmit={handleAddMemory} className="flex gap-2">
                    <select
                      value={newMemoryType}
                      onChange={(e) => setNewMemoryType(e.target.value as any)}
                      className="bg-surface-secondary/50 border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent-primary"
                    >
                      <option value="general">一般</option>
                      <option value="preference">偏好</option>
                      <option value="fact">事实</option>
                    </select>
                    <input
                      type="text"
                      value={newMemoryContent}
                      onChange={(e) => setNewMemoryContent(e.target.value)}
                      placeholder="添加一条新记忆，例如：'我喜欢简洁的代码风格'..."
                      className="flex-1 bg-surface-secondary/50 border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-accent-primary"
                    />
                    <button
                      type="submit"
                      disabled={!newMemoryContent.trim()}
                      className="px-4 py-1.5 bg-accent-primary text-white text-xs font-medium rounded hover:opacity-90 disabled:opacity-50"
                    >
                      添加
                    </button>
                  </form>
                </div>

                {/* Memory List */}
                <div className="space-y-2">
                  {isMemoryLoading ? (
                    <div className="text-center py-8 text-text-tertiary text-xs">加载中...</div>
                  ) : memories.length === 0 ? (
                    <div className="text-center py-8 text-text-tertiary text-xs border border-dashed border-border rounded-lg">
                      暂无记忆数据。AI 会在聊天中自动学习，或者您可以手动添加。
                    </div>
                  ) : (
                    memories.map(memory => (
                      <div key={memory.id} className="group flex items-start justify-between p-3 bg-surface-secondary/20 border border-border rounded-lg hover:border-accent-primary/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                              memory.type === 'preference' ? "bg-purple-500/10 text-purple-500" :
                              memory.type === 'fact' ? "bg-blue-500/10 text-blue-500" :
                              "bg-gray-500/10 text-text-tertiary"
                            )}>
                              {memory.type === 'preference' ? '偏好' : memory.type === 'fact' ? '事实' : '一般'}
                            </span>
                            <span className="text-[10px] text-text-tertiary">
                              {new Date(memory.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary">{memory.content}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Knowledge Tab */}
            {activeTab === 'knowledge' && (
              <section className="space-y-6">
                <h2 className="text-lg font-medium text-text-primary mb-6">知识库索引管理</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-secondary/30 rounded-lg border border-border p-4">
                    <div className="text-xs text-text-tertiary mb-1">已索引文档</div>
                    <div className="text-2xl font-bold text-text-primary">
                      {vectorStats?.documents || 0}
                    </div>
                  </div>
                  <div className="bg-surface-secondary/30 rounded-lg border border-border p-4">
                    <div className="text-xs text-text-tertiary mb-1">向量切片数</div>
                    <div className="text-2xl font-bold text-text-primary">
                      {vectorStats?.vectors || 0}
                    </div>
                  </div>
                </div>

                <div className="bg-surface-secondary/20 rounded-lg border border-border p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    索引操作
                  </h3>
                  <p className="text-xs text-text-tertiary mb-4">
                    如果发现检索结果不准确或知识库内容未更新，可以尝试重建索引。
                    此操作会清空当前所有向量数据并重新扫描知识库文件。
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleRebuildIndex}
                      disabled={isRebuilding}
                      className="flex items-center px-4 py-2 border border-red-200 bg-red-50/50 text-red-600 text-xs font-medium rounded hover:bg-red-100/50 transition-colors disabled:opacity-50"
                    >
                      {isRebuilding ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                      {isRebuilding ? '重建中...' : '重建所有索引'}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <section className="space-y-6">
                <h2 className="text-lg font-medium text-text-primary mb-6">外部工具管理</h2>

                <div className="bg-surface-secondary/30 rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">MCP 数据源中台</h3>
                      <p className="text-xs text-text-tertiary mt-1">
                        管理 MCP Server，并支持从本机常见客户端一键导入配置。
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDiscoverAndImportMcp}
                        disabled={isSyncingMcp}
                        className="px-3 py-1.5 border border-border rounded text-xs hover:bg-surface-secondary transition-colors disabled:opacity-50"
                      >
                        {isSyncingMcp ? '导入中...' : '一键导入本机配置'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMcpServer}
                        disabled={isSyncingMcp}
                        className="px-3 py-1.5 border border-border rounded text-xs hover:bg-surface-secondary transition-colors disabled:opacity-50"
                      >
                        新增 Server
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMcpServers}
                        disabled={isSyncingMcp}
                        className="px-3 py-1.5 bg-accent-primary text-white rounded text-xs hover:opacity-90 disabled:opacity-50"
                      >
                        保存 MCP
                      </button>
                    </div>
                  </div>

                  {mcpStatusMessage && (
                    <div className="text-xs text-text-secondary border border-border rounded px-3 py-2 bg-surface-primary/60">
                      {mcpStatusMessage}
                    </div>
                  )}

                  {mcpServers.length === 0 ? (
                    <div className="text-xs text-text-tertiary border border-dashed border-border rounded-lg px-3 py-5 text-center">
                      暂无 MCP Server。你可以新增一条，或使用“一键导入本机配置”。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mcpServers.map((server) => (
                        <div key={server.id} className="border border-border rounded-lg p-3 bg-surface-primary/40 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-[11px] text-text-tertiary mb-1">名称</label>
                              <input
                                type="text"
                                value={server.name}
                                onChange={(e) => handleUpdateMcpServer(server.id, (item) => ({ ...item, name: e.target.value }))}
                                className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                              />
                              <div className="mt-1 text-[11px] text-text-tertiary font-mono">id: {server.id}</div>
                            </div>
                            <div>
                              <label className="block text-[11px] text-text-tertiary mb-1">传输协议</label>
                              <select
                                value={server.transport}
                                onChange={(e) => handleUpdateMcpServer(server.id, (item) => ({ ...item, transport: e.target.value as McpServerConfig['transport'] }))}
                                className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                              >
                                <option value="stdio">stdio</option>
                                <option value="streamable-http">streamable-http</option>
                                <option value="sse">sse</option>
                              </select>
                            </div>
                            <div className="flex items-end justify-between gap-2">
                              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                                <input
                                  type="checkbox"
                                  checked={server.enabled}
                                  onChange={(e) => handleUpdateMcpServer(server.id, (item) => ({ ...item, enabled: e.target.checked }))}
                                />
                                启用
                              </label>
                              <button
                                type="button"
                                onClick={() => void handleDeleteMcpServer(server.id)}
                                className="px-2.5 py-1.5 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50/70 transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </div>

                          {server.transport === 'stdio' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] text-text-tertiary mb-1">Command</label>
                                <input
                                  type="text"
                                  value={server.command || ''}
                                  onChange={(e) => handleUpdateMcpServer(server.id, (item) => ({ ...item, command: e.target.value }))}
                                  placeholder="npx"
                                  className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-text-tertiary mb-1">Args（空格分隔）</label>
                                <input
                                  type="text"
                                  value={(server.args || []).join(' ')}
                                  onChange={(e) => handleUpdateMcpServer(server.id, (item) => ({
                                    ...item,
                                    args: e.target.value.split(' ').map((arg) => arg.trim()).filter(Boolean),
                                  }))}
                                  placeholder="-y @modelcontextprotocol/server-filesystem /path"
                                  className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-text-tertiary mb-1">Env（每行 KEY=VALUE）</label>
                                <textarea
                                  value={stringifyEnvRecord(server.env)}
                                  onChange={(e) => handleUpdateMcpServer(server.id, (item) => ({
                                    ...item,
                                    env: parseEnvText(e.target.value),
                                  }))}
                                  rows={3}
                                  className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-xs focus:outline-none focus:border-accent-primary transition-colors"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[11px] text-text-tertiary mb-1">URL</label>
                              <input
                                type="text"
                                value={server.url || ''}
                                onChange={(e) => handleUpdateMcpServer(server.id, (item) => ({ ...item, url: e.target.value }))}
                                placeholder="https://your-mcp-host/sse"
                                className="w-full bg-surface-secondary/30 rounded border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] text-text-tertiary">
                              OAuth: {mcpOauthState[server.id]?.connected ? '已连接' : '未连接'}
                              {mcpOauthState[server.id]?.tokenPath ? (
                                <span className="ml-1 font-mono">{mcpOauthState[server.id]?.tokenPath}</span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleRefreshMcpOAuth(server)}
                                className="px-2.5 py-1.5 border border-border rounded text-xs hover:bg-surface-secondary transition-colors"
                              >
                                刷新 OAuth
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleTestMcpServer(server)}
                                disabled={mcpTestingId === server.id}
                                className="px-2.5 py-1.5 border border-border rounded text-xs hover:bg-surface-secondary transition-colors disabled:opacity-50"
                              >
                                {mcpTestingId === server.id ? '测试中...' : '测试连接'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-secondary/30 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                        yt-dlp (YouTube 下载器)
                        {ytdlpStatus?.installed ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/10 text-green-500 font-medium">已安装</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 font-medium">未安装</span>
                        )}
                      </h3>
                      <p className="text-xs text-text-tertiary mt-1">
                        用于智囊团功能的 YouTube 视频信息获取和字幕下载。
                      </p>
                      <div className="mt-2 text-[10px] text-text-tertiary font-mono">
                        {ytdlpStatus?.version && <div>版本: {ytdlpStatus.version}</div>}
                        {ytdlpStatus?.path && <div>路径: {ytdlpStatus.path}</div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!ytdlpStatus?.installed ? (
                        <button
                          type="button"
                          onClick={handleInstallYtdlp}
                          disabled={isInstallingTool}
                          className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary text-white text-xs font-medium rounded hover:opacity-90 disabled:opacity-50"
                        >
                          {isInstallingTool ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          {isInstallingTool ? '安装中...' : '一键安装'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleUpdateYtdlp}
                          disabled={isInstallingTool}
                          className="flex items-center gap-2 px-3 py-1.5 border border-border text-text-primary text-xs font-medium rounded hover:bg-surface-secondary disabled:opacity-50"
                        >
                          {isInstallingTool ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          {isInstallingTool ? '更新中...' : '检查更新'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isInstallingTool && installProgress > 0 && (
                    <div className="mt-4">
                      <div className="h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-primary transition-all duration-300"
                          style={{ width: `${installProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-text-tertiary">下载中...</span>
                        <span className="text-[10px] text-text-tertiary">{installProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Experimental Tab */}
            {activeTab === 'experimental' && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-text-primary mb-2">实验性功能</h2>
                  <p className="text-xs text-text-tertiary">
                    以下功能仍在开发和测试中，可能不稳定或影响性能。请谨慎开启。
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 向量推荐开关 */}
                  <div className="bg-surface-secondary/30 rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                          向量推荐
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 font-medium">
                            实验性
                          </span>
                        </h3>
                        <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed">
                          在稿件编辑器的分栏视图中，根据当前稿件内容的向量相似度对知识库进行智能排序。
                          开启后，与当前内容最相关的素材会优先显示。
                        </p>
                        <p className="text-[10px] text-text-tertiary mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          此功能会调用 Embedding API 计算向量，可能产生额外费用
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateFlag('vectorRecommendation', !flags.vectorRecommendation)}
                        className={clsx(
                          "relative w-11 h-6 rounded-full transition-colors shrink-0",
                          flags.vectorRecommendation ? "bg-accent-primary" : "bg-border"
                        )}
                      >
                        <div
                          className={clsx(
                            "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                            flags.vectorRecommendation ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 预留其他实验性功能位置 */}
                </div>
              </section>
            )}

            {/* Global Save Actions (Visible on all tabs usually, but maybe better inside the form only if relevant) */}
            {/* Actually, it's safer to keep the save button available for settings that need saving (General, AI). Tools operations are immediate. */}
            {(activeTab === 'general' || activeTab === 'ai') && (
              <div className="fixed bottom-0 left-48 right-0 p-4 bg-surface-primary border-t border-border flex items-center justify-between z-10 transition-all">
                <div className="text-xs">
                  {status === 'saved' && <span className="text-status-success">保存成功</span>}
                  {status === 'error' && <span className="text-status-error">保存失败</span>}
                </div>

                <button
                  type="submit"
                  disabled={status === 'saving'}
                  className="flex items-center px-6 py-2 bg-text-primary text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {status === 'saving' ? '保存中...' : '保存配置'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
