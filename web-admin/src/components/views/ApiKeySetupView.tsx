'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, ConfirmDialog, Status } from '../ui';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  Play,
  ExternalLink,
  ShieldCheck,
  FileText,
  FileCheck,
  Users,
  BarChart3,
  TrendingUp,
  Layers,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  BookOpen,
  Coins,
  DollarSign,
  Download,
  Search,
  FileSpreadsheet,
  Activity,
  Cpu,
  Sparkles,
} from 'lucide-react';
import {
  ApiProviderId,
  OperationalApiPurposeId,
  ApiWorkspaceConfigState,
  SavedNamedApiKey,
  INITIAL_API_WORKSPACE_CONFIG,
  PROVIDER_MODELS_CATALOG,
  PROVIDER_META,
  loadApiWorkspaceConfig,
  saveApiWorkspaceConfig,
  getEffectiveConfigForPurpose,
  maskApiKey,
  getModelOption,
  calculateExecutionCost,
  loadApiUsageLogs,
  saveApiUsageLogs,
  recordApiUsageLog,
  clearApiUsageLogs,
  getAggregatedUsageMetrics,
  formatApiLogTimestamp,
  ApiUsageLogItem,
  ExecutionCostReport,
  USD_TO_VND_RATE,
  API_USAGE_LOGGED_EVENT,
} from '../../lib/apiKeyConfig';
import { getVietnamDateYmd } from '../../lib/format';
import { UserProfile, StorePortfolioItem } from '../../lib/types';
import { USERS, INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { CloudflareR2SetupPanel } from '../brands/CloudflareR2SetupPanel';
import { ZaloBotManagerView } from './ZaloBotManagerView';
import { StoreStaffSheetSetupView, type StoreSheetSetupTabKey } from './StoreStaffSheetSetupView';

interface ApiKeySetupViewProps {
  currentUser?: UserProfile;
  stores?: StorePortfolioItem[];
  initialTab?: SetupMainTab;
  initialSheetSubTab?: StoreSheetSetupTabKey;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onSelectStoreForListing?: (storeName: string) => void;
}

export type SetupCategory = 'ai-llm' | 'zalo-bot' | 'google-sheets' | 'storage';
export type AiSubTab = 'providers' | 'routing' | 'metrics' | 'playground';
export type SetupMainTab = SetupCategory | AiSubTab;

function resolveSetupTabs(tab?: SetupMainTab): { category: SetupCategory; aiSubTab: AiSubTab } {
  if (!tab || tab === 'ai-llm' || tab === 'providers') {
    return { category: 'ai-llm', aiSubTab: 'providers' };
  }
  if (tab === 'routing' || tab === 'metrics' || tab === 'playground') {
    return { category: 'ai-llm', aiSubTab: tab };
  }
  if (tab === 'zalo-bot' || tab === 'google-sheets' || tab === 'storage') {
    return { category: tab, aiSubTab: 'providers' };
  }
  return { category: 'ai-llm', aiSubTab: 'providers' };
}

const PURPOSE_ICONS: Record<OperationalApiPurposeId, React.ComponentType<{ className?: string }>> = {
  LEGAL_OCR: ShieldCheck,
  SCRIPT_REVIEW: FileText,
  CONTRACT_DRAFTING: FileCheck,
  STAFF_REVIEW: Users,
  PLAN_ADS_ANALYSIS: BarChart3,
  KOC_MATCHING: TrendingUp,
  KOC_HISTORY_EVALUATION: Users,
  KNOWLEDGE_QA: BookOpen,
  BRAND_MARKET_RESEARCH: Search,
  TRAINING_EXAM_GENERATION: BookOpen,
  BRAND_GUIDELINE_EXTRACT: FileText,
  CONTENT_PROPOSAL: Layers,
  CONTENT_PERFORMANCE_REVIEW: BarChart3,
  SELF_VIDEO_ACCEPTANCE: FileText,
};

const DEPT_SCOPE_LABELS: Record<SavedNamedApiKey['departmentScope'], string> = {
  ALL: 'Dùng chung toàn phòng B2C',
  MARKETING_B2C: 'Khối Marketing B2C',
  CONTENT: 'Bộ phận Kịch bản & Content',
  BOOKING: 'Bộ phận Booking KOC',
  GROWTH_ADS: 'Bộ phận Kế hoạch Growth & Ads',
  ACCOUNTING_LEGAL: 'Bộ phận Hợp đồng & Kế toán',
};

export const ApiKeySetupView: React.FC<ApiKeySetupViewProps> = ({
  currentUser,
  stores = INITIAL_STORE_PORTFOLIOS,
  initialTab,
  initialSheetSubTab,
  onNotify,
  onSelectStoreForListing,
}) => {
  const [category, setCategory] = useState<SetupCategory>(() => resolveSetupTabs(initialTab).category);
  const [aiSubTab, setAiSubTab] = useState<AiSubTab>(() => resolveSetupTabs(initialTab).aiSubTab);

  useEffect(() => {
    if (initialTab) {
      const resolved = resolveSetupTabs(initialTab);
      setCategory(resolved.category);
      setAiSubTab(resolved.aiSubTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialSheetSubTab) {
      setCategory('google-sheets');
    }
  }, [initialSheetSubTab]);

  const navigateToTab = (tab: SetupMainTab) => {
    const resolved = resolveSetupTabs(tab);
    setCategory(resolved.category);
    setAiSubTab(resolved.aiSubTab);
  };
  const [config, setConfig] = useState<ApiWorkspaceConfigState>(() => loadApiWorkspaceConfig());

  // State ẩn/hiện khóa API cho 3 nhà cung cấp chính
  const [visibleProviderKeys, setVisibleProviderKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // State kiểm tra kết nối từng nhà cung cấp
  const [testingProvider, setTestingProvider] = useState<Record<string, boolean>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  // State thêm khóa vào Kho khóa riêng (Named Keys)
  const [isAddingNamedKey, setIsAddingNamedKey] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState<Exclude<ApiProviderId, 'INTERNAL'>>('GOOGLE');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyModel, setNewKeyModel] = useState('gemini-3.8-flash');
  const [newKeyDept, setNewKeyDept] = useState<SavedNamedApiKey['departmentScope']>('ALL');
  const [newKeyNotes, setNewKeyNotes] = useState('');

  // State mở rộng cấu hình nâng cao cho từng mục đích ở Tab 2
  const [expandedPurposeId, setExpandedPurposeId] = useState<OperationalApiPurposeId | null>('SCRIPT_REVIEW');
  const [visiblePurposeCustomKey, setVisiblePurposeCustomKey] = useState<Record<string, boolean>>({});

  // State Tab 3: Chạy thử theo mục đích (Playground)
  const [selectedTestPurpose, setSelectedTestPurpose] = useState<OperationalApiPurposeId>('SCRIPT_REVIEW');
  const [overrideTestProvider, setOverrideTestProvider] = useState<'ROUTE_DEFAULT' | ApiProviderId>('ROUTE_DEFAULT');
  const [testInputText, setTestInputText] = useState<string>(
    INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.SCRIPT_REVIEW.sampleInputText
  );
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    providerUsed: string;
    modelUsed: string;
    latencyMs: number;
    usedFallback?: boolean;
    fallbackReason?: string;
    output: string;
    usage?: ExecutionCostReport;
  } | null>(null);

  // State quản lý đo lường Token & Chi phí
  const [usageLogs, setUsageLogs] = useState<ApiUsageLogItem[]>(() => loadApiUsageLogs());
  const [metricFilterProvider, setMetricFilterProvider] = useState<'ALL' | ApiProviderId>('ALL');
  const [metricFilterPurpose, setMetricFilterPurpose] = useState<'ALL' | OperationalApiPurposeId>('ALL');
  const [metricSearchQuery, setMetricSearchQuery] = useState('');

  // State nhập Model tùy biến (Custom Model ID) cho 3 nhà cung cấp
  const [showCustomModelInput, setShowCustomModelInput] = useState<Record<string, boolean>>({});
  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});

  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(loadApiWorkspaceConfig());
    setUsageLogs(loadApiUsageLogs());

    const handleLogsUpdate = (e: Event) => {
      const custom = e as CustomEvent<ApiUsageLogItem[]>;
      if (custom.detail) {
        setUsageLogs(custom.detail);
      } else {
        setUsageLogs(loadApiUsageLogs());
      }
    };

    window.addEventListener(API_USAGE_LOGGED_EVENT, handleLogsUpdate);
    return () => window.removeEventListener(API_USAGE_LOGGED_EVENT, handleLogsUpdate);
  }, []);

  // Tự động lưu mỗi khi cập nhật config
  const updateAndPersistConfig = (updater: (prev: ApiWorkspaceConfigState) => ApiWorkspaceConfigState) => {
    setConfig(prev => {
      const next = updater(prev);
      saveApiWorkspaceConfig(next);
      return next;
    });
  };

  // Thống kê tổng quan
  const purposeList = useMemo(() => Object.values(config.purposeRoutes), [config.purposeRoutes]);

  const providerPurposeCounts = useMemo(() => {
    const counts: Record<ApiProviderId, OperationalApiPurposeId[]> = {
      GOOGLE: [],
      OPENAI: [],
      CLAUDE: [],
      INTERNAL: [],
    };
    purposeList.forEach(p => {
      counts[p.primaryProvider].push(p.purposeId);
    });
    return counts;
  }, [purposeList]);

  const configuredProviderCount = useMemo(() => {
    return (['GOOGLE', 'OPENAI', 'CLAUDE'] as const).filter(
      id => config.providers[id].apiKey.trim().length > 0
    ).length;
  }, [config.providers]);

  // Tổng hợp dữ liệu đo lường Token & Chi phí
  const aggregatedMetrics = useMemo(() => getAggregatedUsageMetrics(usageLogs), [usageLogs]);

  // Bộ lọc nhật ký sử dụng
  const filteredLogs = useMemo(() => {
    return usageLogs.filter(item => {
      if (metricFilterProvider !== 'ALL' && item.provider !== metricFilterProvider) return false;
      if (metricFilterPurpose !== 'ALL' && item.purposeId !== metricFilterPurpose) return false;
      if (metricSearchQuery.trim()) {
        const q = metricSearchQuery.toLowerCase();
        return (
          item.purposeTitle.toLowerCase().includes(q) ||
          item.modelUsed.toLowerCase().includes(q) ||
          item.provider.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [usageLogs, metricFilterProvider, metricFilterPurpose, metricSearchQuery]);

  // Xuất file CSV nhật ký đối soát chi phí
  const handleExportLogsCsv = () => {
    if (filteredLogs.length === 0) {
      onNotify?.('Không có nhật ký để xuất dữ liệu.', 'warning');
      return;
    }
    const headers = [
      'Thời gian',
      'Mục đích nghiệp vụ',
      'Nhà cung cấp',
      'Mô hình',
      'Token vào (Prompt)',
      'Token ra (Completion)',
      'Tổng Token',
      'Chi phí ($ USD)',
      'Chi phí (VNĐ)',
      'Độ trễ (ms)',
      'Trạng thái',
      'Nguồn gọi',
    ];
    const rows = filteredLogs.map(l => [
      `"${formatApiLogTimestamp(l.timestamp)}"`,
      `"${l.purposeTitle.replace(/"/g, '""')}"`,
      `"${PROVIDER_META[l.provider]?.shortName || l.provider}"`,
      `"${l.modelUsed}"`,
      l.promptTokens,
      l.completionTokens,
      l.totalTokens,
      l.costUsd.toFixed(6),
      Math.round(l.costVnd),
      l.latencyMs,
      `"${l.status}"`,
      `"${l.source || 'PLAYGROUND'}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `doi-soat-token-chi-phi-b2c-${getVietnamDateYmd()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify?.('Đã xuất file CSV đối soát chi phí thành công!', 'success');
  };

  // Xóa sạch nhật ký đo lường
  const handleClearAllLogs = () => {
    clearApiUsageLogs();
    setUsageLogs([]);
    onNotify?.('Đã xóa sạch toàn bộ lịch sử đo lường token & chi phí.', 'info');
  };

  const handleCopy = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Kiểm tra kết nối 1 nhà cung cấp (Google / ChatGPT / Claude)
  const handleTestProviderConnection = async (providerId: Exclude<ApiProviderId, 'INTERNAL'>) => {
    const prov = config.providers[providerId];
    setTestingProvider(prev => ({ ...prev, [providerId]: true }));

    try {
      const res = await fetch('/api/integrations/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          provider: providerId,
          model: prov.defaultModel,
          apiKey: prov.apiKey,
          baseUrl: prov.baseUrl,
        }),
      });
      const data = await res.json();
      const nowStr = formatApiLogTimestamp(new Date().toISOString());

      if (data.ok) {
        updateAndPersistConfig(prev => ({
          ...prev,
          providers: {
            ...prev.providers,
            [providerId]: {
              ...prev.providers[providerId],
              lastTestedAt: nowStr,
              lastTestStatus: 'CONNECTED',
              lastTestLatencyMs: data.latencyMs,
              lastTestMessage: data.reply || 'Kết nối thông suốt',
            },
          },
        }));
        onNotify?.(
          `Kết nối ${prov.shortName} (${prov.defaultModel}) thành công trong ${data.latencyMs}ms!`,
          'success'
        );
      } else {
        updateAndPersistConfig(prev => ({
          ...prev,
          providers: {
            ...prev.providers,
            [providerId]: {
              ...prev.providers[providerId],
              lastTestedAt: nowStr,
              lastTestStatus: 'ERROR',
              lastTestLatencyMs: data.latencyMs,
              lastTestMessage: data.error || 'Khóa API không hợp lệ hoặc chưa được cấp quyền',
            },
          },
        }));
        onNotify?.(data.error || `Không thể kết nối ${prov.shortName}`, 'warning');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi mạng khi kiểm tra kết nối';
      onNotify?.(msg, 'error');
    } finally {
      setTestingProvider(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleTestAllProviders = async () => {
    setIsTestingAll(true);
    for (const pid of ['GOOGLE', 'OPENAI', 'CLAUDE'] as const) {
      if (config.providers[pid].apiKey.trim()) {
        await handleTestProviderConnection(pid);
      }
    }
    setIsTestingAll(false);
    const anyKey = (['GOOGLE', 'OPENAI', 'CLAUDE'] as const).some(p => config.providers[p].apiKey.trim());
    if (!anyKey) {
      onNotify?.('Vui lòng dán ít nhất 1 khóa API (Google, ChatGPT hoặc Claude) để kiểm tra kết nối.', 'info');
    }
  };

  // Thêm khóa mới vào Kho khóa riêng
  const handleAddNamedKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      onNotify?.('Vui lòng nhập tên gợi nhớ và mã khóa API.', 'warning');
      return;
    }

    const newItem: SavedNamedApiKey = {
      id: `nk-${Date.now()}`,
      label: newKeyLabel.trim(),
      providerId: newKeyProvider,
      apiKey: newKeyValue.trim(),
      defaultModel: newKeyModel,
      departmentScope: newKeyDept,
      createdAt: getVietnamDateYmd(),
      notes: newKeyNotes.trim() || undefined,
    };

    updateAndPersistConfig(prev => ({
      ...prev,
      namedKeys: [newItem, ...prev.namedKeys],
    }));

    setNewKeyLabel('');
    setNewKeyValue('');
    setNewKeyNotes('');
    setIsAddingNamedKey(false);
    onNotify?.(`Đã thêm khóa "${newItem.label}" vào kho khóa!`, 'success');
  };

  const handleDeleteNamedKey = (id: string) => {
    updateAndPersistConfig(prev => ({
      ...prev,
      namedKeys: prev.namedKeys.filter(k => k.id !== id),
      purposeRoutes: Object.fromEntries(
        Object.entries(prev.purposeRoutes).map(([pKey, route]) => [
          pKey,
          route.namedKeyId === id ? { ...route, namedKeyId: undefined } : route,
        ])
      ) as Record<OperationalApiPurposeId, typeof prev.purposeRoutes.LEGAL_OCR>,
    }));
    onNotify?.('Đã xóa khóa khỏi danh sách.', 'info');
  };

  // Chuyển sang Tab 3 và nạp dữ liệu mẫu của mục đích được chọn
  const handleOpenPlaygroundForPurpose = (purposeId: OperationalApiPurposeId) => {
    const route = config.purposeRoutes[purposeId];
    setSelectedTestPurpose(purposeId);
    setOverrideTestProvider('ROUTE_DEFAULT');
    setTestInputText(route.sampleInputText);
    setTestResult(null);
    navigateToTab('playground');
  };

  // Chạy thử nghiệm ở Tab 3
  const handleRunPlaygroundTest = async () => {
    setIsRunningTest(true);
    setTestResult(null);

    const effective = getEffectiveConfigForPurpose(selectedTestPurpose, config);
    const chosenProvider: ApiProviderId =
      overrideTestProvider === 'ROUTE_DEFAULT' ? effective.primaryProvider : overrideTestProvider;

    let chosenModel = effective.primaryModel;
    let chosenKey = effective.primaryApiKey;
    let chosenBaseUrl = effective.primaryBaseUrl;

    if (overrideTestProvider !== 'ROUTE_DEFAULT') {
      if (overrideTestProvider === 'INTERNAL') {
        chosenModel = 'upbase-local-engine';
        chosenKey = '';
      } else {
        const prov = config.providers[overrideTestProvider];
        chosenModel = prov.defaultModel;
        chosenKey = prov.apiKey;
        chosenBaseUrl = prov.baseUrl;
      }
    }

    try {
      const res = await fetch('/api/integrations/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXECUTE_PURPOSE',
          purposeId: selectedTestPurpose,
          provider: chosenProvider,
          model: chosenModel,
          apiKey: chosenKey,
          baseUrl: chosenBaseUrl,
          fallbackProvider: effective.fallbackProvider,
          fallbackModel: effective.fallbackModel,
          fallbackApiKey: effective.fallbackApiKey,
          systemInstruction: effective.purpose.systemInstruction,
          inputText: testInputText,
          temperature: effective.purpose.temperature,
          maxTokens: effective.purpose.maxTokens,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const usageData: ExecutionCostReport = data.usage || calculateExecutionCost(data.modelUsed || chosenModel, {
          promptTokens: Math.max(1, Math.ceil(testInputText.length / 3.8)),
          completionTokens: Math.max(1, Math.ceil((data.output?.length || 100) / 3.8)),
          totalTokens: Math.max(2, Math.ceil(((testInputText.length + (data.output?.length || 100)) / 3.8))),
        });

        setTestResult({
          ok: true,
          providerUsed: data.providerUsed,
          modelUsed: data.modelUsed,
          latencyMs: data.latencyMs,
          usedFallback: data.usedFallback,
          fallbackReason: data.fallbackReason,
          output: data.output,
          usage: usageData,
        });

        // Ghi lại vào kho Nhật ký Đo lường Token & Chi phí
        recordApiUsageLog({
          purposeId: selectedTestPurpose,
          purposeTitle: config.purposeRoutes[selectedTestPurpose]?.title || selectedTestPurpose,
          provider: data.provider || chosenProvider,
          modelUsed: data.modelUsed || chosenModel,
          promptTokens: usageData.promptTokens,
          completionTokens: usageData.completionTokens,
          totalTokens: usageData.totalTokens,
          costUsd: usageData.costUsd,
          costVnd: usageData.costVnd,
          latencyMs: data.latencyMs,
          status: data.usedFallback ? 'FALLBACK' : 'SUCCESS',
          errorMessage: data.fallbackReason,
          source: 'PLAYGROUND',
        });
      } else {
        setTestResult({
          ok: false,
          providerUsed: PROVIDER_META[chosenProvider].shortName,
          modelUsed: chosenModel,
          latencyMs: 0,
          output: data.error || 'Đã xảy ra lỗi khi gọi API.',
        });
      }
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        providerUsed: PROVIDER_META[chosenProvider].shortName,
        modelUsed: chosenModel,
        latencyMs: 0,
        output: err instanceof Error ? err.message : 'Lỗi kết nối mạng.',
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* ===================================================================== */}
      {/* 1. THANH CHUYỂN DANH MỤC TÍCH HỢP & KẾT NỐI (4 HỆ THỐNG CHÍNH)        */}
      {/* ===================================================================== */}
      <Tabs
        items={[
          { key: 'ai-llm', label: 'Mô hình AI & LLM', count: 3 },
          { key: 'zalo-bot', label: 'Trợ lý Zalo Bot & Webhook' },
          { key: 'google-sheets', label: 'Thiết lập Google Sheet & Phân quyền', count: stores?.length || 69 },
          { key: 'storage', label: 'Kho Lưu Trữ Cloudflare R2' },
        ]}
        value={category}
        onChange={k => setCategory(k as SetupCategory)}
      />

      {/* ===================================================================== */}
      {/* DANH MỤC: TRỢ LÝ ZALO BOT & WEBHOOK NHÓM CHAT                         */}
      {/* ===================================================================== */}
      {category === 'zalo-bot' && (
        <div className="animate-in fade-in duration-150">
          <ZaloBotManagerView
            currentUser={currentUser || USERS[0]}
            onNotify={onNotify}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* DANH MỤC: GOOGLE SHEETS & PHÂN QUYỀN GIAN HÀNG (4 TAB CHUYÊN SÂU)     */}
      {/* ===================================================================== */}
      {category === 'google-sheets' && (
        <div className="animate-in fade-in duration-150">
          <StoreStaffSheetSetupView
            stores={stores}
            initialTab={initialSheetSubTab || 'TABLE'}
            onNotify={onNotify}
            onSelectStoreForListing={onSelectStoreForListing}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* DANH MỤC: KHO LƯU TRỮ CLOUDFLARE R2                                    */}
      {/* ===================================================================== */}
      {category === 'storage' && (
        <div className="animate-in fade-in duration-150">
          <CloudflareR2SetupPanel onNotify={onNotify} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* DANH MỤC: MÔ HÌNH AI & LLM                                             */}
      {/* ===================================================================== */}
      {category === 'ai-llm' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Sub-tab phân cấp 4 khâu vận hành */}
          <Tabs
            items={[
              { key: 'providers', label: '1. Khóa API & Nhà Cung Cấp', count: 3 },
              { key: 'routing', label: '2. Phân Bổ 13 Nghiệp Vụ', count: purposeList.length },
              { key: 'metrics', label: '3. Đo Lường & Chi Phí Token', count: usageLogs.length },
              { key: 'playground', label: '4. Chạy Thử Nghiệp Vụ' },
            ]}
            value={aiSubTab}
            onChange={k => setAiSubTab(k as AiSubTab)}
          />

      {/* SUB-TAB 1: THIẾT LẬP KHÓA API & NHÀ CUNG CẤP */}
      {aiSubTab === 'providers' && (
        <div className="space-y-6 animate-in fade-in duration-150">

        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-soft border border-line text-accent flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">Quản lý Khóa API & Phân Luồng Nghiệp Vụ</h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestAllProviders}
                disabled={isTestingAll}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-surface hover:bg-sunken text-ink border border-line-strong transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-accent ${isTestingAll ? 'animate-spin' : ''}`} />
                <span>Kiểm tra kết nối</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmResetOpen(true)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-surface hover:bg-sunken text-ink-2 border border-line transition flex items-center gap-1.5 cursor-pointer"
                title="Khôi phục bảng phân bổ về mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink-3" />
                <span>Mặc định</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  saveApiWorkspaceConfig(config);
                  onNotify?.('Đã lưu toàn bộ cấu hình khóa API và bảng phân bổ nghiệp vụ!', 'success');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-positive hover:bg-positive text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>

          {/* 3 Thẻ Tóm tắt Nhà Cung Cấp + 1 Thẻ Tổng Mục Đích */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-line">
            {(['GOOGLE', 'OPENAI', 'CLAUDE'] as const).map(pid => {
              const prov = config.providers[pid];
              const meta = PROVIDER_META[pid];
              const hasKey = Boolean(prov.apiKey.trim());
              const assignedCount = providerPurposeCounts[pid].length;

              return (
                <div
                  key={pid}
                  onClick={() => setAiSubTab('providers')}
                  className="p-3.5 rounded-xl bg-surface-subtle border border-line hover:border-line-strong transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs font-semibold text-ink-2">
                      {prov.shortName}
                    </span>
                    <Status
                      tone={
                        prov.lastTestStatus === 'CONNECTED'
                          ? 'positive'
                          : prov.lastTestStatus === 'ERROR'
                            ? 'critical'
                            : hasKey
                              ? 'info'
                              : 'neutral'
                      }
                    >
                      {prov.lastTestStatus === 'CONNECTED'
                        ? `Đã thông (${prov.lastTestLatencyMs}ms)`
                        : hasKey
                          ? 'Đã nhập khóa'
                          : 'Chưa nhập khóa'}
                    </Status>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-xs font-mono font-semibold text-ink truncate">
                      {prov.defaultModel}
                    </div>
                    <div className="text-2xs text-ink-3 shrink-0">
                      Gán cho <strong className="text-ink">{assignedCount} mục đích</strong>
                    </div>
                  </div>

                  <div className="text-2xs text-ink-3 font-mono truncate">
                    {hasKey ? maskApiKey(prov.apiKey) : 'Chưa nhập khóa'}
                  </div>
                </div>
              );
            })}

            <div
              onClick={() => setAiSubTab('routing')}
              className="p-3.5 rounded-xl bg-surface-subtle border border-line hover:border-line-strong transition cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-semibold text-accent">
                  Phân luồng nghiệp vụ
                </span>
                <span className="text-2xs font-semibold text-positive">{purposeList.length}/{purposeList.length} nghiệp vụ</span>
              </div>
              <div className="text-xs font-semibold text-ink">
                Tự động chuyển dự phòng
              </div>
              <div className="text-2xs text-ink-3 leading-snug">
                Google: {providerPurposeCounts.GOOGLE.length} · ChatGPT: {providerPurposeCounts.OPENAI.length} · Claude: {providerPurposeCounts.CLAUDE.length} · Nội bộ: {providerPurposeCounts.INTERNAL.length}
              </div>
            </div>
          </div>
        </div>

      {/* ===================================================================== */}
      {/* TAB 1: THIẾT LẬP KHÓA API (GOOGLE GEMINI · OPENAI CHATGPT · CLAUDE)   */}
      {/* ===================================================================== */}


          {/* 3 Card cấu hình cho Google, ChatGPT, Claude */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {(['GOOGLE', 'OPENAI', 'CLAUDE'] as const).map(pid => {
              const prov = config.providers[pid];
              const meta = PROVIDER_META[pid];
              const models = PROVIDER_MODELS_CATALOG[pid];
              const isVisible = Boolean(visibleProviderKeys[pid]);
              const isTesting = Boolean(testingProvider[pid]);
              const assignedPurposes = providerPurposeCounts[pid].map(id => config.purposeRoutes[id]);

              return (
                <div
                  key={pid}
                  className="bg-surface border border-line rounded-xl overflow-hidden flex flex-col justify-between shadow-2xs"
                >
                  <div className="p-5 space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-line">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.badgeClass}`}>
                            {meta.name}
                          </span>
                        </div>
                      </div>

                      <a
                        href={meta.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-semibold bg-sunken hover:bg-line text-ink-2 transition"
                        title={meta.docsLabel}
                      >
                        <span>Lấy Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Input Khóa API */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-ink-3" />
                          <span>Khóa API (API Key)</span>
                        </label>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={prov.apiKey}
                          onChange={e => {
                            const val = e.target.value;
                            updateAndPersistConfig(prev => ({
                              ...prev,
                              providers: {
                                ...prev.providers,
                                [pid]: {
                                  ...prev.providers[pid],
                                  apiKey: val,
                                  lastTestStatus: 'UNTESTED',
                                },
                              },
                            }));
                          }}
                          placeholder={meta.keyPlaceholder}
                          className="w-full pl-3 pr-20 py-2 text-xs font-mono rounded-lg border border-line-strong bg-canvas text-ink focus:outline-none focus:border-accent focus:bg-surface"
                        />
                        <div className="absolute right-1.5 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleProviderKeys(prev => ({ ...prev, [pid]: !prev[pid] }))
                            }
                            className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
                            title={isVisible ? 'Ẩn khóa API' : 'Hiện khóa API'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {prov.apiKey && (
                            <button
                              type="button"
                              onClick={() => handleCopy(`prov-${pid}`, prov.apiKey)}
                              className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
                              title="Sao chép khóa API"
                            >
                              {copiedId === `prov-${pid}` ? (
                                <Check className="w-3.5 h-3.5 text-positive" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chọn Model Mặc định */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink block">
                        Mô hình xử lý mặc định (Default Model)
                      </label>
                      <select
                        value={prov.defaultModel}
                        onChange={e => {
                          const newModel = e.target.value;
                          updateAndPersistConfig(prev => ({
                            ...prev,
                            providers: {
                              ...prev.providers,
                              [pid]: {
                                ...prev.providers[pid],
                                defaultModel: newModel,
                              },
                            },
                          }));
                        }}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-line-strong bg-surface text-ink focus:outline-none focus:border-accent"
                      >
                        {models.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.label} ({m.id})
                          </option>
                        ))}
                      </select>

                      {/* Đơn giá Token và Tùy biến mã Model */}
                      {(() => {
                        const selectedModelOpt = getModelOption(prov.defaultModel);
                        return (
                          <div className="pt-1 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1 text-2xs">
                              <div className="flex items-center gap-1.5 font-mono text-ink-2 bg-canvas px-2 py-1 rounded border border-line">
                                <Coins className="w-3 h-3 text-warning shrink-0" />
                                <span>Vào: <strong className="text-ink">${selectedModelOpt.inputCostPerMillionUsd}/1M</strong></span>
                                <span>·</span>
                                <span>Ra: <strong className="text-ink">${selectedModelOpt.outputCostPerMillionUsd}/1M</strong></span>
                                <span>·</span>
                                <span className="text-ink-3">Ngữ cảnh: {Math.round(selectedModelOpt.contextWindowTokens / 1000).toLocaleString('vi-VN')}k</span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowCustomModelInput(prev => ({ ...prev, [pid]: !prev[pid] }))
                                }
                                className="text-accent hover:underline font-medium cursor-pointer shrink-0"
                              >
                                {showCustomModelInput[pid] ? 'Đóng nhập tay' : 'Nhập mã Model khác'}
                              </button>
                            </div>

                            {showCustomModelInput[pid] && (
                              <div className="p-2.5 rounded-lg bg-surface-subtle border border-line space-y-1.5 animate-in fade-in duration-100">
                                <label className="text-2xs font-semibold text-ink block">
                                  Nhập mã mô hình tùy chỉnh (Model ID từ {meta.shortName}):
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={customModelInputs[pid] !== undefined ? customModelInputs[pid] : prov.defaultModel}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setCustomModelInputs(prev => ({ ...prev, [pid]: val }));
                                    }}
                                    placeholder="VD: gpt-6.1-sol, gpt-6-astra, claude-opus-5-5, gemini-4-argon..."
                                    className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-line-strong bg-surface text-ink focus:outline-none focus:border-accent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targetModel = (customModelInputs[pid] || '').trim();
                                      if (!targetModel) return;
                                      updateAndPersistConfig(prev => ({
                                        ...prev,
                                        providers: {
                                          ...prev.providers,
                                          [pid]: {
                                            ...prev.providers[pid],
                                            defaultModel: targetModel,
                                          },
                                        },
                                      }));
                                      onNotify?.(`Đã thiết lập mô hình mặc định của ${meta.shortName} thành "${targetModel}"`, 'success');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-ink-2 text-xs font-semibold shrink-0 cursor-pointer"
                                  >
                                    Áp dụng
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Endpoint & Hạn mức chi phí tháng */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-2xs font-semibold text-ink-2 block">
                          Đường dẫn kết nối (Base URL)
                        </label>
                        <input
                          type="text"
                          value={prov.baseUrl || ''}
                          onChange={e => {
                            const val = e.target.value;
                            updateAndPersistConfig(prev => ({
                              ...prev,
                              providers: {
                                ...prev.providers,
                                [pid]: { ...prev.providers[pid], baseUrl: val },
                              },
                            }));
                          }}
                          placeholder={meta.defaultEndpoint}
                          className="w-full px-2.5 py-1.5 text-2xs font-mono rounded-lg border border-line bg-canvas text-ink-2 focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-2xs font-semibold text-ink-2 block">
                          Trần chi phí cảnh báo ($/tháng)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          placeholder="0"
                          value={prov.monthlyBudgetLimitUsd === 0 ? '' : String(prov.monthlyBudgetLimitUsd)}
                          onChange={e => {
                            const cleaned = e.target.value.replace(/^0+(?=\d)/, '');
                            const val = cleaned === '' ? 0 : Math.max(0, Number(cleaned) || 0);
                            updateAndPersistConfig(prev => ({
                              ...prev,
                              providers: {
                                ...prev.providers,
                                [pid]: { ...prev.providers[pid], monthlyBudgetLimitUsd: val },
                              },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-2xs font-mono rounded-lg border border-line bg-canvas text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    {/* Tiến độ sử dụng hạn mức chi phí tháng này */}
                    {(() => {
                      const spentUsd = aggregatedMetrics.byProvider[pid]?.costUsd || 0;
                      const limitUsd = prov.monthlyBudgetLimitUsd || 1;
                      const spentPct = Math.min(100, Math.round((spentUsd / limitUsd) * 100));
                      const isOverbudget = spentUsd > limitUsd;

                      return (
                        <div className="p-2.5 rounded-lg bg-canvas border border-line space-y-1.5 text-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-ink-3">Thực tế đã dùng tháng này:</span>
                            <span className={`font-mono font-semibold ${isOverbudget ? 'text-critical' : 'text-ink'}`}>
                              ${spentUsd.toFixed(4)} / ${prov.monthlyBudgetLimitUsd} ({spentPct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden border border-line">
                            <div
                              className={`h-full rounded-full data-bar ${
                                isOverbudget
                                  ? 'bg-critical'
                                  : spentPct >= 80
                                  ? 'bg-warning'
                                  : 'bg-positive'
                              }`}
                              style={{ width: `${Math.min(100, spentPct)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-2xs text-ink-3">
                            <span>Quy đổi: ≈ {Math.round(spentUsd * USD_TO_VND_RATE).toLocaleString('vi-VN')} đ</span>
                            {isOverbudget ? (
                              <span className="text-critical font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Vượt trần chi phí!
                              </span>
                            ) : (
                              <span>Còn lại: ${(Math.max(0, limitUsd - spentUsd)).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Các mục đích đang sử dụng nhà cung cấp này */}
                    <div className="pt-2 border-t border-line space-y-1.5">
                      <div className="text-2xs font-semibold text-ink-2 flex items-center justify-between">
                        <span>Mục đích nghiệp vụ đang gán ({assignedPurposes.length}):</span>
                        <button
                          type="button"
                          onClick={() => setAiSubTab('routing')}
                          className="text-accent hover:underline font-medium cursor-pointer"
                        >
                          Đổi phân bổ →
                        </button>
                      </div>
                      {assignedPurposes.length === 0 ? (
                        <div className="text-2xs text-ink-3 italic">
                          Chưa gán làm công cụ chính cho mục đích nào (có thể đang làm dự phòng).
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedPurposes.map(p => (
                            <span
                              key={p.purposeId}
                              className="px-2 py-0.5 rounded-md bg-canvas border border-line text-2xs font-medium text-ink"
                            >
                              {p.title.replace(/^\d+\.\s*/, '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Kết quả kiểm tra kết nối gần nhất */}
                    {prov.lastTestMessage && (
                      <div
                        className={`p-2.5 rounded-lg border text-2xs flex items-start gap-2 ${
                          prov.lastTestStatus === 'CONNECTED'
                            ? 'bg-positive-soft border-positive/20 text-positive'
                            : 'bg-warning-soft border-warning/20 text-warning'
                        }`}
                      >
                        {prov.lastTestStatus === 'CONNECTED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-positive shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">
                            {prov.lastTestStatus === 'CONNECTED'
                              ? `Kết nối thành công (${prov.lastTestLatencyMs}ms lúc ${prov.lastTestedAt})`
                              : `Chưa thông kết nối (${prov.lastTestedAt})`}
                          </div>
                          <div className="mt-0.5 opacity-90 break-words whitespace-normal leading-relaxed">{prov.lastTestMessage}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 bg-sunken border-t border-line flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateAndPersistConfig(prev => ({
                          ...prev,
                          providers: {
                            ...prev.providers,
                            [pid]: {
                              ...prev.providers[pid],
                              apiKey: '',
                              lastTestStatus: 'UNTESTED',
                              lastTestMessage: undefined,
                            },
                          },
                        }));
                        onNotify?.(`Đã xóa khóa API của ${prov.shortName}`, 'info');
                      }}
                      disabled={!prov.apiKey}
                      className="px-2.5 py-1.5 rounded-lg text-2xs font-medium text-ink-3 hover:text-critical hover:bg-surface disabled:opacity-40 transition cursor-pointer"
                    >
                      Xóa khóa
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTestProviderConnection(pid)}
                      disabled={isTesting}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-ink text-white hover:bg-ink-2 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Đang kiểm tra...' : `Kiểm tra ${prov.shortName}`}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* KHO KHÓA API RIÊNG THEO PHÒNG BAN / MỤC ĐÍCH (MULTI-KEY VAULT) */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-sunken border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Kho Khóa API Riêng Theo Nhóm Nghiệp Vụ / Tài Khoản Phụ ({config.namedKeys.length})</span>
                </h3>
                
              </div>

              <button
                type="button"
                onClick={() => setIsAddingNamedKey(prev => !prev)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:opacity-95 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm khóa theo mục đích</span>
              </button>
            </div>

            {isAddingNamedKey && (
              <form
                onSubmit={handleAddNamedKey}
                className="p-5 bg-accent-soft/40 border-b border-line space-y-4 text-xs animate-in fade-in duration-150"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-ink">Tên gợi nhớ mục đích khóa *</label>
                    <input
                      type="text"
                      value={newKeyLabel}
                      onChange={e => setNewKeyLabel(e.target.value)}
                      placeholder="VD: Key Claude — Team Content"
                      className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-ink">Nhà cung cấp API *</label>
                    <select
                      value={newKeyProvider}
                      onChange={e => {
                        const p = e.target.value as Exclude<ApiProviderId, 'INTERNAL'>;
                        setNewKeyProvider(p);
                        setNewKeyModel(PROVIDER_MODELS_CATALOG[p][0].id);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink font-medium"
                    >
                      <option value="GOOGLE">Google (Gemini API)</option>
                      <option value="OPENAI">OpenAI (ChatGPT API)</option>
                      <option value="CLAUDE">Anthropic (Claude API)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-ink">Model ưu tiên</label>
                    <select
                      value={newKeyModel}
                      onChange={e => setNewKeyModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink font-medium"
                    >
                      {PROVIDER_MODELS_CATALOG[newKeyProvider].map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-ink">Bộ phận sử dụng</label>
                    <select
                      value={newKeyDept}
                      onChange={e => setNewKeyDept(e.target.value as SavedNamedApiKey['departmentScope'])}
                      className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink font-medium"
                    >
                      {Object.entries(DEPT_SCOPE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-ink">Mã khóa API (API Key) *</label>
                    <input
                      type="password"
                      value={newKeyValue}
                      onChange={e => setNewKeyValue(e.target.value)}
                      placeholder={PROVIDER_META[newKeyProvider].keyPlaceholder}
                      className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-ink">Ghi chú sử dụng</label>
                    <input
                      type="text"
                      value={newKeyNotes}
                      onChange={e => setNewKeyNotes(e.target.value)}
                      placeholder="VD: Dùng riêng cho duyệt kịch bản Kutieskin & La Roche-Posay"
                      className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNamedKey(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-line bg-surface text-ink-2 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-positive hover:bg-positive text-white font-semibold"
                  >
                    Lưu vào Kho khóa
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-canvas border-b border-line text-2xs font-semibold text-ink-3">
                  <tr>
                    <th className="py-3 px-5">Tên khóa & Ghi chú mục đích</th>
                    <th className="py-3 px-4">Nhà cung cấp & Model</th>
                    <th className="py-3 px-4">Bộ phận phụ trách</th>
                    <th className="py-3 px-4 w-[280px]">Nhập / Cập nhật Mã Khóa API</th>
                    <th className="py-3 px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {config.namedKeys.map(nk => {
                    const meta = PROVIDER_META[nk.providerId];
                    const isKeyVis = Boolean(visibleProviderKeys[nk.id]);
                    return (
                      <tr key={nk.id} className="hover:bg-sunken/50 transition">
                        <td className="py-3 px-5">
                          <div className="font-semibold text-ink">{nk.label}</div>
                          {nk.notes && <div className="text-2xs text-ink-3 mt-0.5">{nk.notes}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${meta.badgeClass}`}>
                            {meta.shortName}
                          </span>
                          <div className="text-2xs font-mono text-ink-2 mt-1">{nk.defaultModel}</div>
                        </td>
                        <td className="py-3 px-4 text-2xs text-ink-2 font-medium">
                          {DEPT_SCOPE_LABELS[nk.departmentScope]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative flex items-center">
                            <input
                              type={isKeyVis ? 'text' : 'password'}
                              value={nk.apiKey}
                              onChange={e => {
                                const val = e.target.value;
                                updateAndPersistConfig(prev => ({
                                  ...prev,
                                  namedKeys: prev.namedKeys.map(item =>
                                    item.id === nk.id ? { ...item, apiKey: val } : item
                                  ),
                                }));
                              }}
                              placeholder={meta.keyPlaceholder}
                              className="w-full pl-2.5 pr-8 py-1.5 text-2xs font-mono rounded-md border border-line bg-canvas text-ink focus:outline-none focus:border-accent"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleProviderKeys(prev => ({ ...prev, [nk.id]: !prev[nk.id] }))
                              }
                              className="absolute right-1.5 p-1 text-ink-3 hover:text-ink"
                              title={isKeyVis ? 'Ẩn' : 'Hiện'}
                            >
                              {isKeyVis ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteNamedKey(nk.id)}
                            className="p-1.5 rounded text-ink-3 hover:text-critical hover:bg-critical-soft transition cursor-pointer"
                            title="Xóa khóa này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PHÂN BỔ API THEO MỤC ĐÍCH NGHIỆP VỤ (6 MỤC ĐÍCH B2C)           */}
      {/* ===================================================================== */}
      {/* SUB-TAB 2: BẢNG PHÂN BỔ 13 NGHIỆP VỤ */}
      {aiSubTab === 'routing' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-soft border border-line text-accent flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Bảng Phân Bổ Mô Hình Cho 13 Nghiệp Vụ Vận Hành B2C
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmResetOpen(true)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-surface hover:bg-sunken text-ink-2 border border-line transition flex items-center gap-1.5 cursor-pointer"
                title="Khôi phục bảng phân bổ về mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink-3" />
                <span>Mặc định</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  saveApiWorkspaceConfig(config);
                  onNotify?.('Đã lưu cấu hình phân bổ 13 nghiệp vụ!', 'success');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-positive hover:bg-positive text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {purposeList.map(route => {
              const Icon = PURPOSE_ICONS[route.purposeId] || Sliders;
              const effective = getEffectiveConfigForPurpose(route.purposeId, config);
              const primaryModels = PROVIDER_MODELS_CATALOG[route.primaryProvider] || [];
              const fallbackModels = PROVIDER_MODELS_CATALOG[route.fallbackProvider] || [];
              const isExpanded = expandedPurposeId === route.purposeId;
              const matchingNamedKeys = config.namedKeys.filter(
                k => route.primaryProvider === 'INTERNAL' || k.providerId === route.primaryProvider
              );

              return (
                <div
                  key={route.purposeId}
                  className="bg-surface border border-line rounded-xl overflow-hidden transition hover:border-line-strong"
                >
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Hàng tiêu đề mục đích + Nút chọn nhanh Nhà cung cấp */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 max-w-2xl">
                        <div className="w-9 h-9 rounded-lg bg-accent-soft border border-line text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-ink">{route.title}</h4>
                            <span className="text-2xs font-semibold text-ink-2 -line">
                              {route.departmentTag}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-2xs text-ink-3">Áp dụng tại:</span>
                            {route.usedInScreens.map(sc => (
                              <span
                                key={sc}
                                className=".5 py-0.2 -line text-2xs text-ink-2"
                              >
                                {sc}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Cụm nút chọn nhanh Provider cho Mục đích này */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <div className="inline-flex rounded-lg border border-line bg-sunken p-1 gap-1 max-w-full overflow-x-auto">
                          {(['GOOGLE', 'OPENAI', 'CLAUDE', 'INTERNAL'] as const).map(pid => {
                            const isSelected = route.primaryProvider === pid;
                            const label =
                              pid === 'GOOGLE'
                                ? 'Google Gemini'
                                : pid === 'OPENAI'
                                ? 'ChatGPT'
                                : pid === 'CLAUDE'
                                ? 'Claude'
                                : 'Nội bộ';
                            return (
                              <button
                                key={pid}
                                type="button"
                                onClick={() => {
                                  const defaultModelForPid = PROVIDER_MODELS_CATALOG[pid][0].id;
                                  updateAndPersistConfig(prev => ({
                                    ...prev,
                                    purposeRoutes: {
                                      ...prev.purposeRoutes,
                                      [route.purposeId]: {
                                        ...prev.purposeRoutes[route.purposeId],
                                        primaryProvider: pid,
                                        primaryModel: defaultModelForPid,
                                        namedKeyId: undefined,
                                      },
                                    },
                                  }));
                                }}
                                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-surface text-accent shadow-2xs border border-line'
                                    : 'text-ink-2 hover:text-ink'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenPlaygroundForPurpose(route.purposeId)}
                          className="px-3 py-2 rounded-lg bg-ink text-white hover:bg-ink-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          title="Chạy thử mục đích này với dữ liệu mẫu"
                        >
                          <Play className="w-3.5 h-3.5 text-positive" />
                          <span>Chạy thử</span>
                        </button>
                      </div>
                    </div>

                    {/* Hàng cấu hình Model chính, Nguồn Khóa API và Nhà cung cấp Dự phòng */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-line text-xs">
                      {/* Cột 1: Model chính */}
                      <div className="space-y-1">
                        <label className="text-2xs font-semibold text-ink-2 block">
                          1. Mô hình xử lý chính ({PROVIDER_META[route.primaryProvider].shortName})
                        </label>
                        <select
                          value={route.primaryModel}
                          onChange={e => {
                            const m = e.target.value;
                            updateAndPersistConfig(prev => ({
                              ...prev,
                              purposeRoutes: {
                                ...prev.purposeRoutes,
                                [route.purposeId]: {
                                  ...prev.purposeRoutes[route.purposeId],
                                  primaryModel: m,
                                },
                              },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface text-ink font-medium text-xs"
                        >
                          {primaryModels.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.label} — {m.badge}
                            </option>
                          ))}
                        </select>

                        {/* Đơn giá Token của mô hình này */}
                        {(() => {
                          const modelOpt = getModelOption(route.primaryModel);
                          return (
                            <div className="flex items-center gap-1.5 text-2xs text-ink-3 font-mono pt-0.5">
                              <Coins className="w-3 h-3 text-warning shrink-0" />
                              <span>Vào: <strong className="text-ink">${modelOpt.inputCostPerMillionUsd}/1M</strong></span>
                              <span>·</span>
                              <span>Ra: <strong className="text-ink">${modelOpt.outputCostPerMillionUsd}/1M</strong></span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Cột 2: Chọn khóa API áp dụng cho mục đích này */}
                      <div className="space-y-1">
                        <label className="text-2xs font-semibold text-ink-2 block">
                          2. Khóa API sử dụng cho mục đích này
                        </label>
                        {route.primaryProvider === 'INTERNAL' ? (
                          <div className="px-2.5 py-1.5 rounded-lg border border-line bg-sunken text-ink-3 text-xs">
                            Không cần khóa API (Chạy trực tiếp trên máy chủ)
                          </div>
                        ) : (
                          <select
                            value={
                              route.customApiKeyOverride
                                ? '__CUSTOM_OVERRIDE__'
                                : route.namedKeyId || '__DEFAULT_PROVIDER__'
                            }
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '__DEFAULT_PROVIDER__') {
                                updateAndPersistConfig(prev => ({
                                  ...prev,
                                  purposeRoutes: {
                                    ...prev.purposeRoutes,
                                    [route.purposeId]: {
                                      ...prev.purposeRoutes[route.purposeId],
                                      namedKeyId: undefined,
                                      customApiKeyOverride: undefined,
                                    },
                                  },
                                }));
                              } else if (val === '__CUSTOM_OVERRIDE__') {
                                setExpandedPurposeId(route.purposeId);
                              } else {
                                updateAndPersistConfig(prev => ({
                                  ...prev,
                                  purposeRoutes: {
                                    ...prev.purposeRoutes,
                                    [route.purposeId]: {
                                      ...prev.purposeRoutes[route.purposeId],
                                      namedKeyId: val,
                                      customApiKeyOverride: undefined,
                                    },
                                  },
                                }));
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface text-ink font-medium text-xs"
                          >
                            <option value="__DEFAULT_PROVIDER__">
                              Khóa mặc định của {PROVIDER_META[route.primaryProvider].shortName} (
                              {maskApiKey(config.providers[route.primaryProvider].apiKey)})
                            </option>
                            {matchingNamedKeys.map(nk => (
                              <option key={nk.id} value={nk.id}>
                                Kho khóa: {nk.label} ({maskApiKey(nk.apiKey)})
                              </option>
                            ))}
                            <option value="__CUSTOM_OVERRIDE__">
                              + Nhập khóa API riêng chỉ cho mục đích này...
                            </option>
                          </select>
                        )}
                      </div>

                      {/* Cột 3: Công cụ dự phòng (Fallback) */}
                      <div className="space-y-1">
                        <label className="text-2xs font-semibold text-ink-2 block">
                          3. Công cụ dự phòng (Khi lỗi hoặc hết hạn mức)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={route.fallbackProvider}
                            onChange={e => {
                              const fbPid = e.target.value as ApiProviderId;
                              const fbModel = PROVIDER_MODELS_CATALOG[fbPid][0].id;
                              updateAndPersistConfig(prev => ({
                                ...prev,
                                purposeRoutes: {
                                  ...prev.purposeRoutes,
                                  [route.purposeId]: {
                                    ...prev.purposeRoutes[route.purposeId],
                                    fallbackProvider: fbPid,
                                    fallbackModel: fbModel,
                                  },
                                },
                              }));
                            }}
                            className="w-1/2 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-ink font-medium text-xs"
                          >
                            <option value="INTERNAL">Nội bộ (Offline)</option>
                            <option value="GOOGLE">Google Gemini</option>
                            <option value="OPENAI">ChatGPT (OpenAI)</option>
                            <option value="CLAUDE">Claude (Anthropic)</option>
                          </select>

                          <select
                            value={route.fallbackModel}
                            onChange={e => {
                              const fbM = e.target.value;
                              updateAndPersistConfig(prev => ({
                                ...prev,
                                purposeRoutes: {
                                  ...prev.purposeRoutes,
                                  [route.purposeId]: {
                                    ...prev.purposeRoutes[route.purposeId],
                                    fallbackModel: fbM,
                                  },
                                },
                              }));
                            }}
                            className="w-1/2 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-ink-2 font-mono text-2xs"
                          >
                            {fallbackModels.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Ô cấu hình Câu lệnh (Prompt) hiển thị trực tiếp cho từng phân hệ */}
                    <div className="pt-3 border-t border-line space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="font-semibold text-ink flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-accent" />
                          <span>Câu lệnh chỉ dẫn (System Prompt) áp dụng cho phân hệ này:</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const defaultPrompt =
                              INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[route.purposeId].systemInstruction;
                            updateAndPersistConfig(prev => ({
                              ...prev,
                              purposeRoutes: {
                                ...prev.purposeRoutes,
                                [route.purposeId]: {
                                  ...prev.purposeRoutes[route.purposeId],
                                  systemInstruction: defaultPrompt,
                                },
                              },
                            }));
                            onNotify?.(`Đã khôi phục câu lệnh (Prompt) gốc cho "${route.title}"`, 'info');
                          }}
                          className="px-2 py-1 rounded border border-line bg-sunken hover:bg-line text-2xs font-semibold text-ink-2 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Khôi phục câu lệnh gốc
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={route.systemInstruction}
                        onChange={e => {
                          const val = e.target.value;
                          updateAndPersistConfig(prev => ({
                            ...prev,
                            purposeRoutes: {
                              ...prev.purposeRoutes,
                              [route.purposeId]: {
                                ...prev.purposeRoutes[route.purposeId],
                                systemInstruction: val,
                              },
                            },
                          }));
                        }}
                        placeholder="Nhập câu lệnh chỉ dẫn (Prompt) cho phân hệ nghiệp vụ này..."
                        className="w-full p-2.5 rounded-lg border border-line-strong bg-canvas text-ink text-xs leading-relaxed focus:outline-none focus:border-accent focus:bg-surface"
                      />
                    </div>

                    {/* Thanh trạng thái khóa thực tế & Nút mở rộng Khóa riêng / Tham số nâng cao */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-2xs">
                      <div className="flex items-center gap-2 text-ink-3">
                        <span>Nguồn kết nối hiện tại:</span>
                        <strong className="text-ink font-medium">{effective.keySourceLabel}</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPurposeId(prev => (prev === route.purposeId ? null : route.purposeId))
                        }
                        className="inline-flex items-center gap-1 text-accent font-semibold hover:underline cursor-pointer"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>
                          {isExpanded
                            ? 'Thu gọn cấu hình nâng cao'
                            : 'Cấu hình khóa riêng & tham số nâng cao'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Khung mở rộng: Khóa API riêng cho mục đích này + System Prompt + Temperature */}
                    {isExpanded && (
                      <div className="p-4 rounded-xl bg-sunken border border-line space-y-3 text-xs animate-in fade-in duration-150">
                        {route.primaryProvider !== 'INTERNAL' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1">
                              <label className="font-semibold text-ink block">
                                Khóa API riêng chỉ dành cho mục đích &ldquo;{route.title.replace(/^\d+\.\s*/, '')}&rdquo; (Tùy chọn):
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type={visiblePurposeCustomKey[route.purposeId] ? 'text' : 'password'}
                                  value={route.customApiKeyOverride || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateAndPersistConfig(prev => ({
                                      ...prev,
                                      purposeRoutes: {
                                        ...prev.purposeRoutes,
                                        [route.purposeId]: {
                                          ...prev.purposeRoutes[route.purposeId],
                                          customApiKeyOverride: val || undefined,
                                        },
                                      },
                                    }));
                                  }}
                                  placeholder="Để trống nếu dùng khóa mặc định của nhà cung cấp hoặc Kho khóa..."
                                  className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-line-strong bg-surface text-ink font-mono text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisiblePurposeCustomKey(prev => ({
                                      ...prev,
                                      [route.purposeId]: !prev[route.purposeId],
                                    }))
                                  }
                                  className="absolute right-2 text-ink-3 hover:text-ink"
                                >
                                  {visiblePurposeCustomKey[route.purposeId] ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="font-semibold text-ink block">
                                  Độ linh hoạt câu chữ (Temperature: {route.temperature})
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.1}
                                  value={route.temperature}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    updateAndPersistConfig(prev => ({
                                      ...prev,
                                      purposeRoutes: {
                                        ...prev.purposeRoutes,
                                        [route.purposeId]: {
                                          ...prev.purposeRoutes[route.purposeId],
                                          temperature: val,
                                        },
                                      },
                                    }));
                                  }}
                                  className="w-full mt-2 accent-accent cursor-pointer"
                                />
                                <div className="flex justify-between text-2xs text-ink-3">
                                  <span>0.0 (Chính xác số liệu)</span>
                                  <span>1.0 (Sáng tạo kịch bản)</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="font-semibold text-ink block">
                                  Trần token sinh ra (Max Tokens: {route.maxTokens || 2048})
                                </label>
                                <select
                                  value={route.maxTokens || 2048}
                                  onChange={e => {
                                    const val = parseInt(e.target.value, 10);
                                    updateAndPersistConfig(prev => ({
                                      ...prev,
                                      purposeRoutes: {
                                        ...prev.purposeRoutes,
                                        [route.purposeId]: {
                                          ...prev.purposeRoutes[route.purposeId],
                                          maxTokens: val,
                                        },
                                      },
                                    }));
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-line-strong bg-surface text-ink text-xs font-mono"
                                >
                                  <option value={512}>512 tokens (~380 từ - Tiết kiệm chi phí)</option>
                                  <option value={1024}>1,024 tokens (~760 từ - Gọn gàng)</option>
                                  <option value={2048}>2,048 tokens (~1,500 từ - Tiêu chuẩn B2C)</option>
                                  <option value={4096}>4,096 tokens (~3,000 từ - Báo cáo & phân tích sâu)</option>
                                  <option value={8192}>8,192 tokens (~6,000 từ - Toàn văn dài)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ĐO LƯỜNG TOKEN & CHI PHÍ API (METRICS & BILLING)               */}
      {/* ===================================================================== */}
      {/* SUB-TAB 3: ĐO LƯỜNG & CHI PHÍ TOKEN */}
      {aiSubTab === 'metrics' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Báo cáo Đo lường */}
          <div className="bg-surface border border-line rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 text-accent -line">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-base font-semibold text-ink">
                  Báo Cáo Đo Lường Lượng Token &amp; Chi Phí Thực Tế (USD · VNĐ)
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportLogsCsv}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-surface hover:bg-sunken text-ink border border-line-strong transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Tải bảng tính CSV đối soát chi phí"
              >
                <Download className="w-3.5 h-3.5 text-accent" />
                <span>Xuất file CSV</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllLogs}
                disabled={usageLogs.length === 0}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-surface hover:bg-critical-soft text-ink-3 hover:text-critical border border-line transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                title="Xóa toàn bộ lịch sử đo lường"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa nhật ký</span>
              </button>
            </div>
          </div>

          {/* 4 Thẻ Chỉ Số KPI Đo Lường Chính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng Chi Phí */}
            <div className="bg-surface border border-line rounded-xl p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-2xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider">Tổng Chi Phí Phát Sinh</span>
                <Coins className="w-4 h-4 text-warning" />
              </div>
              <div className="text-2xl font-semibold font-mono text-accent">
                ${aggregatedMetrics.totalCostUsd.toFixed(4)}
              </div>
              <div className="flex items-baseline justify-between text-2xs pt-1 border-t border-line">
                <span className="text-positive font-semibold font-mono">
                  ≈ {Math.round(aggregatedMetrics.totalCostVnd).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-ink-3">$1 = 25.450 đ</span>
              </div>
            </div>

            {/* Card 2: Tổng Token */}
            <div className="bg-surface border border-line rounded-xl p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-2xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider">Tổng Lượng Token</span>
                <Cpu className="w-4 h-4 text-accent" />
              </div>
              <div className="text-2xl font-semibold font-mono text-ink">
                {aggregatedMetrics.totalTokens.toLocaleString('vi-VN')}
              </div>
              <div className="flex items-center justify-between text-2xs pt-1 border-t border-line text-ink-3">
                <span>Vào: <strong className="text-ink font-mono">{aggregatedMetrics.totalPromptTokens.toLocaleString('vi-VN')}</strong></span>
                <span>·</span>
                <span>Ra: <strong className="text-ink font-mono">{aggregatedMetrics.totalCompletionTokens.toLocaleString('vi-VN')}</strong></span>
              </div>
            </div>

            {/* Card 3: Số Lượt Gọi & Tỷ Lệ Thông Suốt */}
            <div className="bg-surface border border-line rounded-xl p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-2xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider">Lượt Gọi &amp; Sẵn Sàng</span>
                <Activity className="w-4 h-4 text-positive" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold font-mono text-ink">
                  {aggregatedMetrics.totalCalls}
                </div>
                <span className="text-xs text-ink-3">lượt gọi</span>
              </div>
              <div className="flex items-center justify-between text-2xs pt-1 border-t border-line">
                <span className="text-positive font-medium">
                  {aggregatedMetrics.successCalls} thành công
                </span>
                {aggregatedMetrics.fallbackCalls > 0 && (
                  <span className="text-warning font-medium">
                    {aggregatedMetrics.fallbackCalls} dự phòng
                  </span>
                )}
                <span className="font-semibold text-ink">
                  {Math.round((aggregatedMetrics.successCalls / (aggregatedMetrics.totalCalls || 1)) * 100)}%
                </span>
              </div>
            </div>

            {/* Card 4: Chi Phí Trung Bình & Độ Trễ */}
            <div className="bg-surface border border-line rounded-xl p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-2xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider">Chi Phí TB / Lượt</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div className="text-2xl font-semibold font-mono text-ink">
                ${aggregatedMetrics.avgCostPerCallUsd.toFixed(5)}
              </div>
              <div className="flex items-center justify-between text-2xs pt-1 border-t border-line text-ink-3">
                <span className="text-positive font-semibold font-mono">
                  ≈ {Math.round(aggregatedMetrics.avgCostPerCallUsd * USD_TO_VND_RATE)} đ/lượt
                </span>
                <span className="font-mono">TB {aggregatedMetrics.avgLatencyMs}ms</span>
              </div>
            </div>
          </div>

          {/* TIẾN ĐỘ HẠN MỨC NGÂN SÁCH THÁNG THEO NHÀ CUNG CẤP */}
          <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>Tiến Độ Sử Dụng Hạn Mức Ngân Sách Tháng Theo Nhà Cung Cấp</span>
                </h4>
                
              </div>
              <span className="text-2xs text-ink-3 .5 -line shrink-0">
                Tháng hiện tại: {new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['GOOGLE', 'OPENAI', 'CLAUDE'] as const).map(pid => {
                const prov = config.providers[pid];
                const meta = PROVIDER_META[pid];
                const spentUsd = aggregatedMetrics.costByProvider[pid] || 0;
                const limitUsd = prov.monthlyBudgetLimitUsd || 1;
                const spentPct = Math.min(100, Math.round((spentUsd / limitUsd) * 100));
                const isOverbudget = spentUsd > limitUsd;

                return (
                  <div
                    key={pid}
                    className="p-4 rounded-xl bg-canvas border border-line space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded text-2xs font-semibold border ${meta.badgeClass}`}>
                          {meta.name}
                        </span>
                        <span className="text-2xs font-mono text-ink-3">
                          Hạn mức: ${prov.monthlyBudgetLimitUsd}/tháng
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <div className={`text-lg font-semibold font-mono ${isOverbudget ? 'text-critical' : 'text-ink'}`}>
                            ${spentUsd.toFixed(4)}
                          </div>
                          <div className="text-2xs text-ink-3 font-mono">
                            ≈ {Math.round(spentUsd * USD_TO_VND_RATE).toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs font-semibold font-mono ${
                              isOverbudget
                                ? 'text-critical'
                                : spentPct >= 80
                                ? 'text-warning'
                                : 'text-positive'
                            }`}
                          >
                            {spentPct}%
                          </span>
                          <div className="text-2xs text-ink-3">đã dùng</div>
                        </div>
                      </div>

                      {/* Thanh Progress */}
                      <div className="w-full h-2 bg-sunken rounded-full overflow-hidden border border-line">
                        <div
                          className={`h-full rounded-full data-bar ${
                            isOverbudget
                              ? 'bg-critical'
                              : spentPct >= 80
                              ? 'bg-warning'
                              : 'bg-positive'
                          }`}
                          style={{ width: `${Math.min(100, spentPct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-line text-2xs flex items-center justify-between">
                      {isOverbudget ? (
                        <span className="text-critical font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Vượt trần ngân sách (${(spentUsd - limitUsd).toFixed(3)})
                        </span>
                      ) : (
                        <span className="text-ink-3">
                          Còn lại: <strong className="text-ink font-mono">${(limitUsd - spentUsd).toFixed(2)}</strong> (≈ {Math.round((limitUsd - spentUsd) * USD_TO_VND_RATE).toLocaleString('vi-VN')} đ)
                        </span>
                      )}
                      <span className="text-ink-3 font-mono">
                        Model: {prov.defaultModel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PHÂN BỔ TOKEN & CHI PHÍ THEO 9 NGHIỆP VỤ B2C */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-line bg-sunken flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  <span>Phân Bổ Lượng Token &amp; Chi Phí Theo {purposeList.length} Nghiệp Vụ B2C</span>
                </h4>
                
              </div>
              <div className="text-2xs font-semibold text-accent bg-accent-soft px-3 py-1 rounded-md border border-line shrink-0">
                {purposeList.length} Nghiệp vụ đang hoạt động
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle border-b border-line text-2xs uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Mục Đích Nghiệp Vụ</th>
                    <th className="py-2.5 px-3 font-semibold">Công Cụ Phân Bổ</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Số Lượt</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Token Vào</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Token Ra</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Tổng Token</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Chi Phí ($ USD)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Chi Phí Quy Đổi (VNĐ)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Tỷ Trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono">
                  {purposeList.map(route => {
                    const metrics = aggregatedMetrics.byPurpose[route.purposeId] || {
                      calls: 0,
                      promptTokens: 0,
                      completionTokens: 0,
                      totalTokens: 0,
                      costUsd: 0,
                      costVnd: 0,
                    };
                    const Icon = PURPOSE_ICONS[route.purposeId] || Sliders;
                    const meta = PROVIDER_META[route.primaryProvider];
                    const sharePct = aggregatedMetrics.totalCostUsd > 0
                      ? Math.round((metrics.costUsd / aggregatedMetrics.totalCostUsd) * 100)
                      : 0;

                    return (
                      <tr key={route.purposeId} className="hover:bg-surface-subtle/50 transition">
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent border border-line flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-ink">{route.title}</div>
                              <div className="text-2xs text-ink-3 font-normal">{route.departmentTag}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-sans">
                          <div className="space-y-0.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-2xs font-semibold border ${meta.badgeClass}`}>
                              {meta.shortName}
                            </span>
                            <div className="text-2xs text-ink-3 font-mono truncate max-w-[130px]">
                              {route.primaryModel}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-semibold text-ink">
                          {metrics.calls}
                        </td>

                        <td className="py-3 px-3 text-right text-ink-3">
                          {metrics.promptTokens.toLocaleString('vi-VN')}
                        </td>

                        <td className="py-3 px-3 text-right text-ink-3">
                          {metrics.completionTokens.toLocaleString('vi-VN')}
                        </td>

                        <td className="py-3 px-3 text-right font-semibold text-ink">
                          {metrics.totalTokens.toLocaleString('vi-VN')}
                        </td>

                        <td className="py-3 px-3 text-right font-semibold text-accent">
                          ${metrics.costUsd.toFixed(4)}
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-positive">
                          {Math.round(metrics.costVnd).toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="inline-block text-2xs font-semibold text-ink-2 -line">
                            {sharePct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* BẢNG ĐƠN GIÁ ĐỊNH MỨC MÔ HÌNH (MODEL RATE CARD CATALOG) */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-line bg-sunken flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Coins className="w-4 h-4 text-warning" />
                  <span>Bảng Đơn Giá Định Mức Của Tất Cả Mô Hình (Model Rate Card)</span>
                </h4>
                
              </div>
              <span className="text-2xs text-ink-3 font-mono">
                1 triệu token ≈ 750.000 từ tiếng Việt
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle border-b border-line text-2xs uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Nhà Cung Cấp</th>
                    <th className="py-2.5 px-3 font-semibold">Tên Mô Hình</th>
                    <th className="py-2.5 px-3 font-semibold">Mã Model ID</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Đơn Giá Vào ($/1M Token)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Đơn Giá Ra ($/1M Token)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Cửa Sổ Ngữ Cảnh</th>
                    <th className="py-2.5 px-4 font-semibold">Đặc Tính Khuyến Nghị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono">
                  {(['GOOGLE', 'OPENAI', 'CLAUDE', 'INTERNAL'] as const).flatMap(pid => {
                    const provMeta = PROVIDER_META[pid];
                    const models = PROVIDER_MODELS_CATALOG[pid];
                    return models.map(m => (
                      <tr key={m.id} className="hover:bg-surface-subtle/50 transition">
                        <td className="py-2.5 px-4 font-sans">
                          <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${provMeta.badgeClass}`}>
                            {provMeta.shortName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-ink">
                          {m.label}
                        </td>
                        <td className="py-2.5 px-3 text-ink-2 font-mono text-2xs">
                          {m.id}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-ink">
                          {m.inputCostPerMillionUsd === 0 ? '0 (Miễn phí)' : `$${m.inputCostPerMillionUsd}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-accent">
                          {m.outputCostPerMillionUsd === 0 ? '0 (Miễn phí)' : `$${m.outputCostPerMillionUsd}`}
                        </td>
                        <td className="py-2.5 px-3 text-right text-ink-3">
                          {(m.contextWindowTokens / 1000).toLocaleString('vi-VN')}k tokens
                        </td>
                        <td className="py-2.5 px-4 font-sans">
                          <span className="inline-block text-2xs font-medium text-ink-2 -line">
                            {m.badge}
                          </span>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* NHẬT KÝ CHI TIẾT & ĐỐI SOÁT GỌI API */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-line bg-sunken flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-positive" />
                  <span>Nhật Ký Chi Tiết &amp; Đối Soát Từng Lượt Gọi API ({filteredLogs.length}/{usageLogs.length})</span>
                </h4>
                
              </div>

              {/* Bộ lọc nhật ký */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Lọc nhà cung cấp */}
                <select
                  value={metricFilterProvider}
                  onChange={e => setMetricFilterProvider(e.target.value as 'ALL' | ApiProviderId)}
                  className="px-2.5 py-1.5 text-2xs rounded-lg border border-line bg-surface text-ink font-medium"
                >
                  <option value="ALL">Tất cả nhà cung cấp</option>
                  <option value="GOOGLE">Google Gemini</option>
                  <option value="OPENAI">OpenAI ChatGPT</option>
                  <option value="CLAUDE">Anthropic Claude</option>
                  <option value="INTERNAL">Bộ xử lý nội bộ</option>
                </select>

                {/* Lọc mục đích */}
                <select
                  value={metricFilterPurpose}
                  onChange={e => setMetricFilterPurpose(e.target.value as 'ALL' | OperationalApiPurposeId)}
                  className="px-2.5 py-1.5 text-2xs rounded-lg border border-line bg-surface text-ink font-medium"
                >
                  <option value="ALL">Tất cả {purposeList.length} nghiệp vụ</option>
                  {purposeList.map(p => (
                    <option key={p.purposeId} value={p.purposeId}>
                      {p.title.replace(/^\d+\.\s*/, '')}
                    </option>
                  ))}
                </select>

                {/* Tìm kiếm */}
                <div className="relative">
                  <Search className="w-3 h-3 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={metricSearchQuery}
                    onChange={e => setMetricSearchQuery(e.target.value)}
                    placeholder="Tìm theo mô hình, từ khóa..."
                    className="pl-7 pr-2.5 py-1 text-2xs rounded-lg border border-line bg-surface text-ink focus:outline-none focus:border-accent w-44"
                  />
                </div>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <Activity className="w-8 h-8 text-ink-3 mx-auto stroke-[1.5]" />
                <div className="text-xs font-semibold text-ink">
                  Không tìm thấy nhật ký gọi API nào
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-subtle border-b border-line text-2xs uppercase tracking-wider text-ink-3 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-4 font-semibold">Thời Gian</th>
                      <th className="py-2 px-3 font-semibold">Nghiệp Vụ</th>
                      <th className="py-2 px-3 font-semibold">Nhà Cung Cấp &amp; Model</th>
                      <th className="py-2 px-3 font-semibold text-right">Token Vào</th>
                      <th className="py-2 px-3 font-semibold text-right">Token Ra</th>
                      <th className="py-2 px-3 font-semibold text-right">Tổng Token</th>
                      <th className="py-2 px-3 font-semibold text-right">Chi Phí ($)</th>
                      <th className="py-2 px-3 font-semibold text-right">Chi Phí (VNĐ)</th>
                      <th className="py-2 px-3 font-semibold text-center">Độ Trễ</th>
                      <th className="py-2 px-4 font-semibold text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono">
                    {filteredLogs.map(item => (
                      <tr key={item.id} className="hover:bg-surface-subtle/50 transition">
                        <td
                          className="py-2 px-4 text-2xs text-ink-2 font-mono whitespace-nowrap"
                          title={`Chuỗi gốc: ${item.timestamp}`}
                        >
                          {formatApiLogTimestamp(item.timestamp)}
                        </td>
                        <td className="py-2 px-3 font-sans text-xs font-medium text-ink max-w-[180px] truncate" title={item.purposeTitle}>
                          {item.purposeTitle}
                        </td>
                        <td className="py-2 px-3 font-sans text-2xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink">
                              {item.provider === 'INTERNAL'
                                ? 'Bộ xử lý nội bộ'
                                : PROVIDER_META[item.provider]?.shortName || item.provider}
                            </span>
                            <span className="text-ink-3 font-mono">({item.modelUsed})</span>
                          </div>
                          {item.errorMessage && (
                            <div className="text-2xs text-warning mt-0.5 truncate max-w-[260px]" title={item.errorMessage}>
                              {item.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-2xs text-ink-3">
                          {item.promptTokens.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 text-right text-2xs text-ink-3">
                          {item.completionTokens.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 text-right text-xs font-semibold text-ink">
                          {item.totalTokens.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 text-right text-xs font-semibold text-accent">
                          ${item.costUsd.toFixed(5)}
                        </td>
                        <td className="py-2 px-3 text-right text-xs font-semibold text-positive">
                          {Math.round(item.costVnd).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-center text-2xs text-ink-3">
                          {item.latencyMs}ms
                        </td>
                        <td className="py-2 px-4 text-center">
                          <Status
                            tone={
                              item.status === 'SUCCESS'
                                ? 'positive'
                                : item.status === 'FALLBACK'
                                  ? 'warning'
                                  : 'critical'
                            }
                          >
                            {item.status === 'SUCCESS'
                              ? 'Thành công'
                              : item.status === 'FALLBACK'
                                ? 'Dự phòng'
                                : 'Lỗi'}
                          </Status>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CHẠY THỬ & KIỂM TRA THEO MỤC ĐÍCH (SANDBOX PLAYGROUND)          */}
      {/* ===================================================================== */}
      {/* SUB-TAB 4: CHẠY THỬ NGHIỆP VỤ */}
      {aiSubTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-150">
          {/* Cột trái: Chọn mục đích + Dữ liệu đầu vào */}
          <div className="lg:col-span-5 bg-surface border border-line rounded-xl p-5 space-y-4">
            <div className="space-y-1 border-b border-line pb-3">
              <h3 className="text-sm font-semibold text-ink">
                1. Chọn mục đích nghiệp vụ cần kiểm tra
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">Mục đích nghiệp vụ:</label>
              <select
                value={selectedTestPurpose}
                onChange={e => {
                  const pid = e.target.value as OperationalApiPurposeId;
                  setSelectedTestPurpose(pid);
                  setTestInputText(config.purposeRoutes[pid].sampleInputText);
                  setTestResult(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink font-semibold text-xs"
              >
                {purposeList.map(p => (
                  <option key={p.purposeId} value={p.purposeId}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Hiển thị cấu hình đang gán cho mục đích này */}
            {(() => {
              const eff = getEffectiveConfigForPurpose(selectedTestPurpose, config);
              const meta = PROVIDER_META[eff.primaryProvider];
              return (
                <div className="p-3 rounded-lg bg-sunken border border-line space-y-1.5 text-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">Công cụ đã phân bổ:</span>
                    <span className={`px-2 py-0.5 rounded font-semibold border ${meta.badgeClass}`}>
                      {meta.shortName} · {eff.primaryModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">Nguồn khóa:</span>
                    <span className="font-medium text-ink">{eff.keySourceLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">Dự phòng khi lỗi:</span>
                    <span className="font-mono text-ink-2">
                      {PROVIDER_META[eff.fallbackProvider].shortName} ({eff.fallbackModel})
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Cho phép chọn ép chạy thử sang nhà cung cấp khác để so sánh */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">
                Chế độ chạy thử (Có thể chọn đổi nhanh để so sánh 3 bên):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'ROUTE_DEFAULT', label: 'Theo phân bổ' },
                  { id: 'GOOGLE', label: 'Google Gemini' },
                  { id: 'OPENAI', label: 'ChatGPT' },
                  { id: 'CLAUDE', label: 'Claude' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOverrideTestProvider(item.id as 'ROUTE_DEFAULT' | ApiProviderId)}
                    className={`px-2.5 py-1.5 rounded-lg text-2xs font-semibold border transition cursor-pointer ${
                      overrideTestProvider === item.id
                        ? 'bg-accent-soft text-accent border-accent'
                        : 'bg-surface text-ink-2 border-line hover:bg-sunken'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nội dung đầu vào */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink">Dữ liệu nghiệp vụ đầu vào:</label>
                <button
                  type="button"
                  onClick={() =>
                    setTestInputText(config.purposeRoutes[selectedTestPurpose].sampleInputText)
                  }
                  className="text-2xs text-accent hover:underline font-medium cursor-pointer"
                >
                  Nạp lại dữ liệu mẫu
                </button>
              </div>
              <textarea
                rows={7}
                value={testInputText}
                onChange={e => setTestInputText(e.target.value)}
                className="w-full p-3 rounded-lg border border-line-strong bg-canvas text-ink text-xs font-mono leading-relaxed focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="button"
              onClick={handleRunPlaygroundTest}
              disabled={isRunningTest || !testInputText.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-positive hover:bg-positive disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer"
            >
              {isRunningTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang gửi yêu cầu xử lý...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Chạy thử nghiệm vụ này</span>
                </>
              )}
            </button>
          </div>

          {/* Cột phải: Kết quả trả về */}
          <div className="lg:col-span-7 bg-surface border border-line rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    2. Kết quả xử lý trả về
                  </h3>
                </div>

                {testResult && (
                  <div className="flex items-center gap-2 text-2xs">
                    <span className=".5 text-positive -positive/20 font-semibold">
                      {testResult.providerUsed} · {testResult.modelUsed}
                    </span>
                    <span className="text-ink-2 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {testResult.latencyMs}ms
                    </span>
                  </div>
                )}
              </div>

              {testResult?.fallbackReason && (
                <div className="p-3 rounded-lg bg-warning-soft border border-warning/20 text-warning text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Lưu ý chuyển luồng dự phòng: </strong>
                    <span>{testResult.fallbackReason}</span>
                  </div>
                </div>
              )}

              {testResult ? (
                <div className="space-y-3">
                  {/* Bảng đo lường Token & Chi phí của lượt chạy thử này */}
                  {testResult.usage && (
                    <div className="p-3 rounded-xl bg-surface-subtle border border-line space-y-2">
                      <div className="flex items-center justify-between text-2xs text-ink-3">
                        <span className="font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-warning" />
                          <span>Đo lường Token &amp; Chi phí lượt gọi này:</span>
                        </span>
                        <span className="font-mono text-ink-3">
                          Tỷ giá: $1 = 25.450 đ
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
                        <div className="p-2 rounded-lg bg-surface border border-line">
                          <div className="text-ink-3">Token vào (Prompt)</div>
                          <div className="text-xs font-mono font-semibold text-ink mt-0.5">
                            {testResult.usage.promptTokens.toLocaleString('vi-VN')}
                          </div>
                          <div className="text-ink-3 font-mono">
                            ${testResult.usage.promptCostUsd.toFixed(6)}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-surface border border-line">
                          <div className="text-ink-3">Token ra (Completion)</div>
                          <div className="text-xs font-mono font-semibold text-ink mt-0.5">
                            {testResult.usage.completionTokens.toLocaleString('vi-VN')}
                          </div>
                          <div className="text-ink-3 font-mono">
                            ${testResult.usage.completionCostUsd.toFixed(6)}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-surface border border-line">
                          <div className="text-ink-3">Tổng lượng Token</div>
                          <div className="text-xs font-mono font-semibold text-ink mt-0.5">
                            {testResult.usage.totalTokens.toLocaleString('vi-VN')}
                          </div>
                          <div className="text-ink-3 font-mono truncate">
                            {testResult.modelUsed}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-accent-soft/40 border border-accent/20">
                          <div className="text-accent font-medium">Chi phí phát sinh</div>
                          <div className="text-xs font-mono font-semibold text-accent mt-0.5">
                            ${testResult.usage.costUsd.toFixed(5)}
                          </div>
                          <div className="text-positive font-semibold font-mono">
                            ≈ {Math.round(testResult.usage.costVnd).toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-canvas border border-line text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
                    {testResult.output}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy('playground-out', testResult.output)}
                      className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-sunken text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedId === 'playground-out' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-positive" />
                          <span className="text-positive">Đã sao chép kết quả</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép kết quả</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 px-4 text-center border border-dashed border-line rounded-xl space-y-2">
                  <Sliders className="w-8 h-8 text-ink-3 mx-auto stroke-[1.5]" />
                  <div className="text-xs font-semibold text-ink">
                    Chưa có kết quả chạy thử
                  </div>
                  <p className="text-2xs text-ink-3 max-w-md mx-auto leading-relaxed">
                    Chọn mục đích nghiệp vụ để kiểm tra kết nối API.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end text-2xs text-ink-3">
              <button
                type="button"
                onClick={() => setAiSubTab('routing')}
                className="text-accent font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Quay lại bảng phân bổ 13 nghiệp vụ</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Dialog xác nhận khôi phục mặc định */}
      <ConfirmDialog
        open={isConfirmResetOpen}
        onCancel={() => setIsConfirmResetOpen(false)}
        onOpenChange={(open) => setIsConfirmResetOpen(open)}
        onConfirm={() => {
          updateAndPersistConfig(prev => ({
            ...INITIAL_API_WORKSPACE_CONFIG,
            // Giữ lại các khóa API người dùng đã nhập để không làm mất key
            providers: {
              GOOGLE: {
                ...INITIAL_API_WORKSPACE_CONFIG.providers.GOOGLE,
                apiKey: prev.providers.GOOGLE.apiKey,
              },
              OPENAI: {
                ...INITIAL_API_WORKSPACE_CONFIG.providers.OPENAI,
                apiKey: prev.providers.OPENAI.apiKey,
              },
              CLAUDE: {
                ...INITIAL_API_WORKSPACE_CONFIG.providers.CLAUDE,
                apiKey: prev.providers.CLAUDE.apiKey,
              },
            },
          }));
          setIsConfirmResetOpen(false);
          onNotify?.('Đã khôi phục bảng phân bổ mục đích về cấu hình chuẩn (vẫn giữ nguyên các khóa API đã nhập).', 'info');
        }}
        title="Khôi phục bảng phân bổ mặc định?"
        description="Đặt lại mô hình mặc định và bảng phân bổ 6 mục đích nghiệp vụ về cấu hình chuẩn (giữ nguyên các khóa API đã lưu)."
        confirmLabel="Khôi phục mặc định"
      />
    </div>
  );
};
