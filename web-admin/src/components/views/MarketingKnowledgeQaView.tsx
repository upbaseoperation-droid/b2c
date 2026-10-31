'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Send,
  FileText,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  Plus,
  ExternalLink,
  MessageSquare,
  Building2,
  Search,
  HelpCircle,
  Clock,
  Scale,
  Calculator,
  Calendar,
  Users,
  ChevronRight,
  Layers,
  X,
} from 'lucide-react';
import {
  Tabs,
  Segmented,
  Panel,
  Button,
  SearchInput,
  Chips,
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
  PageActions,
} from '../ui';
import {
  KNOWLEDGE_CATEGORIES,
  MARKETING_KNOWLEDGE_ARTICLES,
  MARKETING_KNOWLEDGE_FAQS,
  SLA_QUICK_REFERENCE,
  SALARY_GRADE_QUICK_REFERENCE,
  CONTRACT_TAX_QUICK_REFERENCE,
  OBJECTION_SCRIPTS_REFERENCE,
  KnowledgeCategoryId,
  KnowledgeArticle,
  QaSynthesizedResponse,
  synthesizeMarketingKnowledgeAnswer,
  buildRagPromptForMarketingQa,
} from '../../lib/marketingKnowledgeBase';
import {
  loadApiWorkspaceConfig,
  getEffectiveConfigForPurpose,
  API_CONFIG_UPDATED_EVENT,
  recordApiUsageLog,
  calculateExecutionCost,
} from '../../lib/apiKeyConfig';
import { BrandDetail, KocItem, StorePortfolioItem, TabKey, UserProfile } from '../../lib/types';
import { MarketingAcademySection } from './MarketingAcademySection';
import { pushSharedStateToDb } from '../../lib/sharedStateClient';
import { formatVnd, formatVndShort } from '../../lib/format';

const getPerfNowMs = () => performance.now();

interface MarketingKnowledgeQaViewProps {
  currentUser: UserProfile;
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToTab?: (tab: TabKey) => void;
  onSelectBrandContext?: (brandName: string) => void;
  onSelectStoreContext?: (storeName: string) => void;
}

type MainKnowledgeTab = 'hub' | 'academy' | 'library' | 'faqs' | 'tables' | 'qa';
type PlaybookSubTab = 'faqs' | 'objections';
type QuickTableSubTab = 'sla' | 'salary' | 'contracts' | 'calculator';
type TargetRoleFilter = 'ALL' | 'BOOKING' | 'CONTENT' | 'FINANCE_LEGAL' | 'LEADER';

interface QaChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  providerLabel?: string;
  latencyMs?: number;
  synthesized?: QaSynthesizedResponse;
}

const CUSTOM_ARTICLES_STORAGE_KEY = 'upbase_b2c_custom_knowledge_articles_v1';

const ROLE_SUGGESTED_QUESTIONS: { label: string; question: string; category: Exclude<KnowledgeCategoryId, 'ALL'>; role: TargetRoleFilter }[] = [
  {
    label: 'Tính thuế TNCN 10% & mẫu HĐ cá nhân',
    question: 'KOC cá nhân chốt giá thực nhận (Net) là 4.500.000 đ thì trên hợp đồng ghi giá Gross bao nhiêu, khấu trừ thuế thế nào và dùng mẫu hợp đồng số mấy?',
    category: 'CONTRACTS_TAX_LEGAL',
    role: 'FINANCE_LEGAL',
  },
  {
    label: 'Gian hàng không có Leader trình ai?',
    question: 'Gian hàng mình phụ trách không có Trưởng nhóm (Leader) thì trình duyệt kế hoạch tháng cho ai và gồm những gian nào có Leader?',
    category: 'TEAM_ORG_4P',
    role: 'LEADER',
  },
  {
    label: 'Xử lý KOC nhận mẫu quá 5 ngày chưa nộp bài',
    question: 'KOC đã nhận hàng mẫu nhưng quá 5 ngày vẫn chưa gửi kịch bản và video nháp thì xử lý theo quy trình nào?',
    category: 'SLA_PLAYBOOK',
    role: 'BOOKING',
  },
  {
    label: 'Phối hợp 3 bên Growth - B2C - Media & Baseline v1.0',
    question: 'Quy trình phối hợp 3 bên Growth, Marketing B2C và Media khi lập kế hoạch tháng và đóng băng Baseline v1.0 diễn ra như thế nào?',
    category: 'PLANNING_BUDGET',
    role: 'LEADER',
  },
  {
    label: 'Khung lương KL1–KL7 & trần 45%',
    question: 'Chi tiết mức giá của từng khung lương từ KL1 đến KL7 và quy tắc giới hạn ngân sách nhóm KL4 trở lên là gì?',
    category: 'KOC_SALARY_MASTER',
    role: 'BOOKING',
  },
  {
    label: 'Lịch khóa sổ nghiệm thu ngày 2 & mở cổng Kế toán',
    question: 'Lịch khóa sổ nghiệm thu tháng trên File 3.2 và 2 đợt mở cổng chỉnh sửa với Kế toán diễn ra vào ngày nào?',
    category: 'CONTRACTS_TAX_LEGAL',
    role: 'FINANCE_LEGAL',
  },
  {
    label: 'KOC báo giá cao hoặc từ chối cấp mã Spark Ads',
    question: 'Khi KOC báo giá cao hơn ngân sách hoặc từ chối cấp mã quảng cáo Spark Ads thì đàm phán như thế nào?',
    category: 'SLA_PLAYBOOK',
    role: 'BOOKING',
  },
  {
    label: 'Từ khóa cấm trên TikTok Shop & bố cục kịch bản',
    question: 'Những từ khóa nào bị cấm tuyệt đối khi duyệt kịch bản trên TikTok Shop và bố cục kịch bản 4 phần gồm những gì?',
    category: 'CONTENT_CREATIVE',
    role: 'CONTENT',
  },
  {
    label: 'Cấu trúc 6 phần bản Brief B2C chuẩn',
    question: 'Một bản Brief B2C chuẩn gửi KOC gồm những thành phần nào và quy trình phê duyệt brief ra sao?',
    category: 'CONTENT_CREATIVE',
    role: 'CONTENT',
  },
  {
    label: 'Mô hình tâm lý STAR-T làm Hook 3s',
    question: 'Khung 5 động lực tâm lý STAR-T là gì và áp dụng làm Hook 3-5 giây giữ chân người xem trên TikTok như thế nào?',
    category: 'CONTENT_CREATIVE',
    role: 'CONTENT',
  },
  {
    label: 'Sản xuất video kênh tự xây (Self-channel) 12 bước',
    question: 'Quy trình sản xuất video kênh thương hiệu tự xây (Self-channel) gồm bao nhiêu bước và định mức bao nhiêu clip/tháng?',
    category: 'CONTENT_CREATIVE',
    role: 'CONTENT',
  },
  {
    label: 'Booking KOC trên Threads & gắn link Shopee',
    question: 'Chiến thuật xây kênh và booking KOC trên Threads có gì khác TikTok và cách gắn link Shopee thế nào để không bị bóp reach?',
    category: 'SOP_BOOKING',
    role: 'BOOKING',
  },
  {
    label: 'Quy trình xử lý khẩn cấp KOC dính scandal',
    question: 'Khi KOC dính khủng hoảng truyền thông (scandal) hoặc phát ngôn sai lệch thì quy trình 5 bước ứng phó khẩn cấp và thời hạn tắt mã Ads là bao lâu?',
    category: 'SLA_PLAYBOOK',
    role: 'LEADER',
  },
  {
    label: 'Video air bị TikTok tắt tiếng do bản quyền nhạc',
    question: 'Video đã air bị TikTok tắt tiếng do bản quyền âm nhạc thương mại thì xử lý khắc phục thế nào trong 12h?',
    category: 'CONTENT_CREATIVE',
    role: 'CONTENT',
  },
  {
    label: 'Ngân sách thu chi hộ & hồ sơ tạm ứng',
    question: 'Bản chất ngân sách thu chi hộ (Pass-through budget) trong booking B2C là gì và quy chế giải ngân tạm ứng ra sao?',
    category: 'PLANNING_BUDGET',
    role: 'FINANCE_LEGAL',
  },
  {
    label: 'Suất gửi mẫu FOC 0đ & hạch toán không lẫn Paid',
    question: 'Suất gửi mẫu miễn phí (FOC 0đ) do ai phụ trách và quy tắc hạch toán chi phí thế nào để không lẫn vào trần chi phí cứng?',
    category: 'PLANNING_BUDGET',
    role: 'BOOKING',
  },
];

function renderFormattedAnswer(markdown: string) {
  const lines = markdown.split('\n');
  return (
    <div className="space-y-2 text-sm text-ink leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-semibold text-ink pt-2 border-b border-line pb-1">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs font-semibold text-accent pt-1">
              {line.replace('#### ', '')}
            </h4>
          );
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.slice(2);
          const boldSplit = content.split('**');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 text-xs text-ink-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
              <span>
                {boldSplit.map((part, pIdx) =>
                  pIdx % 2 === 1 ? (
                    <strong key={pIdx} className="font-semibold text-ink">
                      {part}
                    </strong>
                  ) : (
                    <span key={pIdx}>{part}</span>
                  )
                )}
              </span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s+(.*)$/);
          const stepNum = match ? match[1] : '1';
          const stepText = match ? match[2] : line;
          const boldSplit = stepText.split('**');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 text-xs text-ink-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-sunken text-ink font-medium text-2xs shrink-0 mt-0.5 tabular-nums">
                {stepNum}
              </span>
              <span>
                {boldSplit.map((part, pIdx) =>
                  pIdx % 2 === 1 ? (
                    <strong key={pIdx} className="font-semibold text-ink">
                      {part}
                    </strong>
                  ) : (
                    <span key={pIdx}>{part}</span>
                  )
                )}
              </span>
            </div>
          );
        }

        const boldSplit = line.split('**');
        return (
          <p key={idx} className="text-xs text-ink-2">
            {boldSplit.map((part, pIdx) =>
              pIdx % 2 === 1 ? (
                <strong key={pIdx} className="font-semibold text-ink">
                  {part}
                </strong>
              ) : (
                <span key={pIdx}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export const MarketingKnowledgeQaView: React.FC<MarketingKnowledgeQaViewProps> = ({
  currentUser,
  brands = [],
  stores = [],
  kocs = [],
  onNotify,
  onNavigateToTab,
}) => {
  const [activeTab, setActiveTab] = useState<MainKnowledgeTab>('hub');
  const [playbookSubTab, setPlaybookSubTab] = useState<PlaybookSubTab>('faqs');
  const [quickTableSubTab, setQuickTableSubTab] = useState<QuickTableSubTab>('sla');
  const [targetRoleFilter, setTargetRoleFilter] = useState<TargetRoleFilter>('ALL');

  // Ô tìm kiếm toàn cục tại Hub
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Bộ lọc danh mục kiến thức riêng ở tab Kho tài liệu
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategoryId>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Tài liệu bổ sung do Trưởng phòng / Trưởng nhóm thêm mới
  const [customArticles, setCustomArticles] = useState<KnowledgeArticle[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CUSTOM_ARTICLES_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as KnowledgeArticle[]) : [];
    } catch {
      return [];
    }
  });

  // Lắng nghe sự kiện đồng bộ từ DB và Bước 4 khi lưu bài viết thực tế
  useEffect(() => {
    const reloadFromStorage = () => {
      try {
        const saved = localStorage.getItem('upbase_b2c_custom_knowledge_articles_v1');
        if (saved) {
          const parsed = JSON.parse(saved) as KnowledgeArticle[];
          if (Array.isArray(parsed)) {
            setCustomArticles(parsed);
          }
        }
      } catch (e) {
        console.warn('Lỗi khi tải lại tài liệu quy trình:', e);
      }
    };

    const handleArticlesUpdated = (evt: Event) => {
      const customEvt = evt as CustomEvent<KnowledgeArticle[]>;
      if (customEvt.detail && Array.isArray(customEvt.detail)) {
        setCustomArticles(customEvt.detail);
      } else {
        reloadFromStorage();
      }
    };

    window.addEventListener('upbase:custom-knowledge-articles-updated', handleArticlesUpdated);
    window.addEventListener('upbase:knowledge-articles-updated', handleArticlesUpdated);
    window.addEventListener('storage', reloadFromStorage);
    return () => {
      window.removeEventListener('upbase:custom-knowledge-articles-updated', handleArticlesUpdated);
      window.removeEventListener('upbase:knowledge-articles-updated', handleArticlesUpdated);
      window.removeEventListener('storage', reloadFromStorage);
    };
  }, []);

  const allArticles = useMemo(
    () => [...customArticles, ...MARKETING_KNOWLEDGE_ARTICLES],
    [customArticles]
  );

  // Tài liệu đang mở xem ở Tab Kho tài liệu
  const [selectedArticleId, setSelectedArticleId] = useState<string>(MARKETING_KNOWLEDGE_ARTICLES[0].id);

  // Hộp thoại thêm quy định / hướng dẫn mới
  const [isAddArticleModalOpen, setIsAddArticleModalOpen] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [newArticleCode, setNewArticleCode] = useState('QT-B2C-NOIBO-10');
  const [newArticleCategory, setNewArticleCategory] = useState<Exclude<KnowledgeCategoryId, 'ALL'>>('SOP_BOOKING');
  const [newArticleSummary, setNewArticleSummary] = useState('');
  const [newArticleContent, setNewArticleContent] = useState('');

  // Cấu hình kết nối từ apiKeyConfig
  const [apiConfigVersion, setApiConfigVersion] = useState(0);
  useEffect(() => {
    const handler = () => setApiConfigVersion(v => v + 1);
    window.addEventListener(API_CONFIG_UPDATED_EVENT, handler);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, handler);
  }, []);

  const effectiveQaRoute = useMemo(() => {
    void apiConfigVersion;
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose('KNOWLEDGE_QA', cfg);
  }, [apiConfigVersion]);

  const [customQaPrompt] = useState<string>(() => {
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose('KNOWLEDGE_QA', cfg).purpose.systemInstruction;
  });

  // Lịch sử hội thoại hỏi đáp
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const seqIdRef = useRef<number>(1);

  const [messages, setMessages] = useState<QaChatMessage[]>(() => {
    const initialQuestion = ROLE_SUGGESTED_QUESTIONS[0].question;
    const initialSynthesized = synthesizeMarketingKnowledgeAnswer({
      question: initialQuestion,
      brands,
      stores,
      kocs,
    });
    return [
      {
        id: 'msg-init-user',
        role: 'user',
        content: initialQuestion,
        timestamp: '10:30',
      },
      {
        id: 'msg-init-assistant',
        role: 'assistant',
        content: initialSynthesized.answerMarkdown,
        timestamp: '10:30',
        providerLabel: 'Sổ tay chuẩn Upbase B2C',
        latencyMs: 18,
        synthesized: initialSynthesized,
      },
    ];
  });

  // Công cụ tính nhanh Thuế & Khung lương
  const [calcEntity, setCalcEntity] = useState<'INDIVIDUAL' | 'HKD' | 'COMPANY'>('INDIVIDUAL');
  const [calcMode, setCalcMode] = useState<'NET_TO_GROSS' | 'GROSS_TO_NET'>('NET_TO_GROSS');
  const [calcAmountInput, setCalcAmountInput] = useState<string>('4500000');

  const quickTaxCalculation = useMemo(() => {
    const rawAmount = Math.max(0, parseInt(calcAmountInput.replace(/[^0-9]/g, ''), 10) || 0);
    if (calcEntity === 'INDIVIDUAL') {
      if (calcMode === 'NET_TO_GROSS') {
        const net = rawAmount;
        const taxable = net >= 1_800_000;
        const gross = taxable ? Math.round(net / 0.9) : net;
        const tax = gross - net;
        return {
          gross,
          tax,
          net,
          taxNote: taxable ? 'Khấu trừ 10% TNCN tại nguồn (≥ 2tr)' : '0% (Dưới 2 triệu không khấu trừ 10%)',
          templateCode: 'Mẫu 1.1.1 (HĐ) & 1.1.2 (BBNT)',
        };
      } else {
        const gross = rawAmount;
        const taxable = gross >= 2_000_000;
        const tax = taxable ? Math.round(gross * 0.1) : 0;
        const net = gross - tax;
        return {
          gross,
          tax,
          net,
          taxNote: taxable ? 'Khấu trừ 10% TNCN tại nguồn (≥ 2tr)' : '0% (Dưới 2 triệu không khấu trừ 10%)',
          templateCode: 'Mẫu 1.1.1 (HĐ) & 1.1.2 (BBNT)',
        };
      }
    }

    if (calcEntity === 'HKD') {
      const gross = calcMode === 'NET_TO_GROSS' ? Math.round(rawAmount / 0.93) : rawAmount;
      const tax = Math.round(gross * 0.07);
      const net = gross - tax;
      return {
        gross,
        tax,
        net,
        taxNote: 'Thuế khoán HKD 7% (5% GTGT + 2% TNCN)',
        templateCode: 'Mẫu 2.1.1 (HĐ) & 2.1.2 (BBNT)',
      };
    }

    // Doanh nghiệp VAT 8%
    const net = calcMode === 'NET_TO_GROSS' ? rawAmount : Math.round(rawAmount / 1.08);
    const tax = Math.round(net * 0.08);
    const gross = net + tax;
    return {
      gross,
      tax,
      net,
      taxNote: 'Hóa đơn GTGT 8% (Kế toán kiểm soát trần theo Net)',
      templateCode: 'Mẫu 3.1.1 (HĐ) & 3.1.2 (BBNT)',
    };
  }, [calcEntity, calcMode, calcAmountInput]);

  const matchedSalaryGradeForCalc = useMemo(() => {
    const net = quickTaxCalculation.net;
    if (net === 0) return 'TAP UpAffiliate (0 đ)';
    if (net <= 500_000) return 'KL1 (≤ 500.000 đ · Massive Creator)';
    if (net <= 1_500_000) return 'KL2 (500k – 1,5 tr · Massive Creator)';
    if (net <= 3_000_000) return 'KL3 (1,5 tr – 3 tr · Massive Creator)';
    if (net <= 5_000_000) return 'KL4 (3 tr – 5 tr · Micro KOC)';
    if (net <= 10_000_000) return 'KL5 (5 tr – 10 tr · Mid-tier)';
    if (net <= 20_000_000) return 'KL6 (10 tr – 20 tr · Mid-tier cao)';
    return 'KL7 (> 20.000.000 đ · KOL Chuyên nghiệp)';
  }, [quickTaxCalculation.net]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onNotify?.('Đã sao chép nội dung vào khay nhớ tạm', 'success');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Xử lý gửi câu hỏi nghiệp vụ
  const handleAskQuestion = async (customQ?: string) => {
    const q = (customQ || questionInput).trim();
    if (!q || isAsking) return;

    seqIdRef.current += 1;
    const userMsgId = `usr-${seqIdRef.current}`;
    const userMsg: QaChatMessage = {
      id: userMsgId,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customQ) setQuestionInput('');
    setIsAsking(true);

    const localFallback = synthesizeMarketingKnowledgeAnswer({
      question: q,
      brands,
      stores,
      kocs,
    });

    const startTime = getPerfNowMs();
    try {
      if (effectiveQaRoute.hasActiveExternalKey) {
        const ragSystemPrompt = buildRagPromptForMarketingQa({
          question: q,
          brands,
          stores,
        });
        const res = await fetch('/api/integrations/llm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purposeId: 'KNOWLEDGE_QA',
            prompt: `Câu hỏi nghiệp vụ: ${q}`,
            systemInstruction: ragSystemPrompt.systemInstruction,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const latency = Math.round(getPerfNowMs() - startTime);
          const promptTokens = data.promptTokens || 600;
          const completionTokens = data.completionTokens || 350;
          const costReport = calculateExecutionCost(effectiveQaRoute.primaryModel, {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          });

          recordApiUsageLog({
            provider: effectiveQaRoute.primaryProvider,
            modelUsed: effectiveQaRoute.primaryModel,
            purposeId: 'KNOWLEDGE_QA',
            purposeTitle: 'Hỏi đáp nghiệp vụ Marketing',
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            costUsd: costReport.costUsd,
            costVnd: costReport.costVnd,
            status: 'SUCCESS',
            latencyMs: latency,
            source: 'QA',
          });

          seqIdRef.current += 1;
          const assistantMsg: QaChatMessage = {
            id: `asst-${seqIdRef.current}`,
            role: 'assistant',
            content: data.text || localFallback.answerMarkdown,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            providerLabel: `${effectiveQaRoute.primaryModel} (${effectiveQaRoute.primaryProvider})`,
            latencyMs: latency,
            synthesized: localFallback,
          };
          setMessages(prev => [...prev, assistantMsg]);
          return;
        }
      }

      // Phản hồi trực tiếp từ Bộ tổng hợp tri thức nội bộ Upbase B2C
      seqIdRef.current += 1;
      const assistantMsg: QaChatMessage = {
        id: `asst-${seqIdRef.current}`,
        role: 'assistant',
        content: localFallback.answerMarkdown,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        providerLabel: 'Sổ tay chuẩn Upbase B2C',
        latencyMs: 18,
        synthesized: localFallback,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      seqIdRef.current += 1;
      const assistantMsg: QaChatMessage = {
        id: `asst-${seqIdRef.current}`,
        role: 'assistant',
        content: localFallback.answerMarkdown,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        providerLabel: 'Sổ tay chuẩn Upbase B2C',
        latencyMs: 18,
        synthesized: localFallback,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  // Tra cứu toàn cục qua 4 nguồn kiến thức
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedArticles = allArticles.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
    );

    const matchedFaqs = MARKETING_KNOWLEDGE_FAQS.filter(
      f =>
        f.question.toLowerCase().includes(q) ||
        f.shortAnswer.toLowerCase().includes(q) ||
        f.tags.some(t => t.toLowerCase().includes(q))
    );

    const matchedSlas = SLA_QUICK_REFERENCE.filter(
      s =>
        s.code.toLowerCase().includes(q) ||
        s.activity.toLowerCase().includes(q) ||
        s.stage.toLowerCase().includes(q) ||
        s.deadline.toLowerCase().includes(q) ||
        s.pic.toLowerCase().includes(q)
    );

    const matchedObjections = OBJECTION_SCRIPTS_REFERENCE.filter(
      o =>
        o.situation.toLowerCase().includes(q) ||
        o.responseStrategy.toLowerCase().includes(q) ||
        o.sampleMessage.toLowerCase().includes(q)
    );

    const totalMatches =
      matchedArticles.length + matchedFaqs.length + matchedSlas.length + matchedObjections.length;

    return {
      totalMatches,
      articles: matchedArticles,
      faqs: matchedFaqs,
      slas: matchedSlas,
      objections: matchedObjections,
    };
  }, [globalSearchQuery, allArticles]);

  // Lọc tài liệu ở Tab Kho tài liệu
  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allArticles.filter(art => {
      if (selectedCategory !== 'ALL' && art.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        art.title.toLowerCase().includes(q) ||
        art.code.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [allArticles, selectedCategory, searchQuery]);

  const currentArticle = useMemo(() => {
    return (
      filteredArticles.find(a => a.id === selectedArticleId) ||
      allArticles.find(a => a.id === selectedArticleId) ||
      filteredArticles[0] ||
      allArticles[0]
    );
  }, [filteredArticles, allArticles, selectedArticleId]);

  // Lọc FAQs và Kịch bản đàm phán ở Tab 3
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MARKETING_KNOWLEDGE_FAQS.filter(faq => {
      if (selectedCategory !== 'ALL' && faq.category !== selectedCategory) return false;
      if (targetRoleFilter === 'BOOKING' && faq.category !== 'SOP_BOOKING' && faq.category !== 'KOC_SALARY_MASTER') return false;
      if (targetRoleFilter === 'CONTENT' && faq.category !== 'CONTENT_CREATIVE') return false;
      if (targetRoleFilter === 'FINANCE_LEGAL' && faq.category !== 'CONTRACTS_TAX_LEGAL') return false;
      if (targetRoleFilter === 'LEADER' && faq.category !== 'TEAM_ORG_4P' && faq.category !== 'PLANNING_BUDGET') return false;
      if (!q) return true;
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.shortAnswer.toLowerCase().includes(q) ||
        faq.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery, targetRoleFilter]);

  const filteredObjections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return OBJECTION_SCRIPTS_REFERENCE.filter(obj => {
      if (!q) return true;
      return (
        obj.situation.toLowerCase().includes(q) ||
        obj.responseStrategy.toLowerCase().includes(q) ||
        obj.sampleMessage.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  const categoryChipOptions = useMemo(() => {
    return [
      { key: 'ALL' as KnowledgeCategoryId, label: 'Tất cả chủ đề', count: allArticles.length },
      ...KNOWLEDGE_CATEGORIES.map(c => ({
        key: c.id as KnowledgeCategoryId,
        label: c.shortLabel,
        count: allArticles.filter(a => a.category === c.id).length,
      })),
    ];
  }, [allArticles]);

  const handleSaveCustomArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle.trim() || !newArticleContent.trim()) {
      onNotify?.('Vui lòng nhập tiêu đề và nội dung quy định mới.', 'warning');
      return;
    }

    seqIdRef.current += 1;
    const created: KnowledgeArticle = {
      id: `kb-custom-${seqIdRef.current}`,
      code: newArticleCode.trim() || 'QT-B2C-NOIBO',
      title: newArticleTitle.trim(),
      category: newArticleCategory,
      summary: newArticleSummary.trim() || newArticleContent.trim().slice(0, 140),
      sourceDoc: `Cập nhật nội bộ bởi ${currentUser.name}`,
      updatedAt: new Date().toLocaleDateString('vi-VN'),
      applicableRoles: ['Toàn bộ nhân sự B2C'],
      tags: ['nội bộ', 'quy định mới'],
      keyFacts: [
        { label: 'Người ban hành', value: currentUser.name },
        { label: 'Ngày áp dụng', value: new Date().toLocaleDateString('vi-VN') },
      ],
      sections: [
        {
          heading: 'Nội dung quy định & hướng dẫn thực hiện',
          body: newArticleContent
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean),
        },
      ],
      sampleQuestions: [`Quy định về ${newArticleTitle.trim()} như thế nào?`],
    };

    const nextList = [created, ...customArticles];
    setCustomArticles(nextList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_ARTICLES_STORAGE_KEY, JSON.stringify(nextList));
      pushSharedStateToDb('custom-knowledge-articles-v1', nextList);
    }
    setSelectedArticleId(created.id);
    setIsAddArticleModalOpen(false);
    setNewArticleTitle('');
    setNewArticleSummary('');
    setNewArticleContent('');
    setActiveTab('library');
    onNotify?.(`Đã thêm tài liệu "${created.title}" vào Sổ tay phòng B2C`, 'success');
  };

  const handleOpenArticleFromSearch = (articleId: string) => {
    setSelectedArticleId(articleId);
    setActiveTab('library');
    setGlobalSearchQuery('');
  };

  const handleOpenFaqFromSearch = (faqQuery: string) => {
    setSearchQuery(faqQuery);
    setPlaybookSubTab('faqs');
    setActiveTab('faqs');
    setGlobalSearchQuery('');
  };

  const handleOpenSlaFromSearch = () => {
    setQuickTableSubTab('sla');
    setActiveTab('tables');
    setGlobalSearchQuery('');
  };

  const handleOpenObjectionFromSearch = () => {
    setPlaybookSubTab('objections');
    setActiveTab('faqs');
    setGlobalSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* KHUNG TRA CỨU TOÀN CỤC & HÀNH ĐỘNG ĐẦU TRANG */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={e => setGlobalSearchQuery(e.target.value)}
              placeholder="Tra cứu nhanh toàn bộ 18 Chuyên đề, 42 FAQ, 22 mốc SLA, kịch bản đàm phán KOC, thuế TNCN, khung lương..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
            />
            {globalSearchQuery && (
              <button
                type="button"
                onClick={() => setGlobalSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <PageActions>
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => setIsAddArticleModalOpen(true)}
            >
              Thêm quy định
            </Button>
          </PageActions>
        </div>

        {/* BẢNG KẾT QUẢ TRA CỨU TOÀN CỤC TỨC THÌ (HIỂN THỊ KHI CÓ TỪ KHÓA) */}
        {globalSearchResults && (
          <div className="pt-3 border-t border-line space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">
                Tìm thấy {globalSearchResults.totalMatches} kết quả phù hợp cho &ldquo;{globalSearchQuery}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setGlobalSearchQuery('')}
                className="text-2xs font-medium text-ink-3 hover:text-ink cursor-pointer"
              >
                Đóng kết quả
              </button>
            </div>

            {globalSearchResults.totalMatches === 0 ? (
              <p className="text-xs text-ink-3 py-2">
                Không tìm thấy tài liệu, câu hỏi hay mốc SLA nào khớp với từ khóa. Thử tìm với từ khóa chung như &ldquo;thuế&rdquo;, &ldquo;mẫu&rdquo;, &ldquo;lương&rdquo;, &ldquo;lịch&rdquo;, &ldquo;kịch bản&rdquo;.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Khối Chuyên đề quy trình */}
                <div className="p-3 rounded-xl bg-canvas border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-accent flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      Chuyên đề ({globalSearchResults.articles.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {globalSearchResults.articles.slice(0, 4).map(art => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => handleOpenArticleFromSearch(art.id)}
                        className="w-full text-left p-2 rounded-lg bg-surface hover:bg-accent-soft text-xs text-ink transition-colors cursor-pointer border border-line"
                      >
                        <span className="font-code text-2xs text-accent block">{art.code}</span>
                        <span className="font-medium line-clamp-1">{art.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khối Câu hỏi thường gặp FAQ */}
                <div className="p-3 rounded-xl bg-canvas border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-positive flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Câu hỏi FAQ ({globalSearchResults.faqs.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {globalSearchResults.faqs.slice(0, 4).map(faq => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => handleOpenFaqFromSearch(faq.question)}
                        className="w-full text-left p-2 rounded-lg bg-surface hover:bg-positive-soft text-xs text-ink transition-colors cursor-pointer border border-line"
                      >
                        <span className="font-medium line-clamp-1">{faq.question}</span>
                        <span className="text-2xs text-ink-3 line-clamp-1 mt-0.5">{faq.shortAnswer}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khối Mốc cam kết SLA */}
                <div className="p-3 rounded-xl bg-canvas border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-warning flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Thời hạn SLA ({globalSearchResults.slas.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {globalSearchResults.slas.slice(0, 4).map(sla => (
                      <button
                        key={sla.code}
                        type="button"
                        onClick={handleOpenSlaFromSearch}
                        className="w-full text-left p-2 rounded-lg bg-surface hover:bg-warning-soft text-xs text-ink transition-colors cursor-pointer border border-line"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-code text-2xs text-warning">{sla.code}</span>
                          <span className="font-semibold text-2xs text-ink">{sla.deadline}</span>
                        </div>
                        <span className="font-medium line-clamp-1 mt-0.5">{sla.activity}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khối Kịch bản đàm phán KOC */}
                <div className="p-3 rounded-xl bg-canvas border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-ink flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Kịch bản đàm phán ({globalSearchResults.objections.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {globalSearchResults.objections.slice(0, 4).map(obj => (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={handleOpenObjectionFromSearch}
                        className="w-full text-left p-2 rounded-lg bg-surface hover:bg-accent-soft text-xs text-ink transition-colors cursor-pointer border border-line"
                      >
                        <span className="font-medium line-clamp-1">{obj.situation}</span>
                        <span className="text-2xs text-ink-3 line-clamp-1 mt-0.5 italic">&ldquo;{obj.sampleMessage}&rdquo;</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* THANH CHUYỂN 5 PHÂN VÙNG CỦA HUB TRI THỨC */}
      <Tabs<MainKnowledgeTab>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'hub', label: 'Tổng quan Hub tri thức' },
          { key: 'academy', label: 'Trung tâm đào tạo & Khảo thí' },
          { key: 'library', label: 'Kho tài liệu & quy trình', count: allArticles.length },
          {
            key: 'faqs',
            label: 'Câu hỏi thường gặp & Kịch bản',
            count: MARKETING_KNOWLEDGE_FAQS.length + OBJECTION_SCRIPTS_REFERENCE.length,
          },
          { key: 'tables', label: 'Bảng chuẩn SLA & Khung lương', count: 3 },
          { key: 'qa', label: 'Hỏi đáp quy trình B2C', count: messages.filter(m => m.role === 'assistant').length },
        ]}
      />

      {/* =====================================================================
          TAB 1: TỔNG QUAN HUB TRI THỨC (HUB DASHBOARD HOMEPAGE)
          ===================================================================== */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* LƯỚI 4 TRỤ CỘT TRI THỨC B2C */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div
              onClick={() => setActiveTab('library')}
              className="p-5 rounded-xl bg-surface border border-line hover:border-accent hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink group-hover:text-accent transition-colors">
                    18 Chuyên đề nghiệp vụ
                  </h3>
                </div>
              </div>
              <div className="pt-4 border-t border-line mt-4 flex items-center justify-between text-2xs font-semibold text-accent">
                <span>Khám phá tài liệu</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('academy')}
              className="p-5 rounded-xl bg-surface border border-line hover:border-accent hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink group-hover:text-accent transition-colors">
                    Đào tạo & Khảo thí
                  </h3>
                </div>
              </div>
              <div className="pt-4 border-t border-line mt-4 flex items-center justify-between text-2xs font-semibold text-accent">
                <span>Vào trung tâm học tập</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => {
                setPlaybookSubTab('faqs');
                setActiveTab('faqs');
              }}
              className="p-5 rounded-xl bg-surface border border-line hover:border-positive hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-positive-soft text-positive flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink group-hover:text-positive transition-colors">
                    42 Câu hỏi thường gặp
                  </h3>
                </div>
              </div>
              <div className="pt-4 border-t border-line mt-4 flex items-center justify-between text-2xs font-semibold text-positive">
                <span>Xem sổ câu hỏi</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => {
                setQuickTableSubTab('sla');
                setActiveTab('tables');
              }}
              className="p-5 rounded-xl bg-surface border border-line hover:border-warning hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-warning-soft text-warning flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink group-hover:text-warning transition-colors">
                    22 Thời hạn SLA cam kết
                  </h3>
                </div>
              </div>
              <div className="pt-4 border-t border-line mt-4 flex items-center justify-between text-2xs font-semibold text-warning">
                <span>Tra cứu thời hạn</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => {
                setPlaybookSubTab('objections');
                setActiveTab('faqs');
              }}
              className="p-5 rounded-xl bg-surface border border-line hover:border-ink hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sunken text-ink flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink transition-colors">
                    15 Kịch bản đàm phán KOC
                  </h3>
                </div>
              </div>
              <div className="pt-4 border-t border-line mt-4 flex items-center justify-between text-2xs font-semibold text-ink">
                <span>Xem kịch bản mẫu</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* BỘ LỌC THEO VAI TRÒ VẬN HÀNH & GỢI Ý NGHIỆP VỤ */}
          <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                Lọc nội dung theo vai trò vận hành của bạn
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'ALL', label: 'Toàn bộ phòng B2C' },
                  { key: 'BOOKING', label: 'Chuyên viên Booking' },
                  { key: 'CONTENT', label: 'Sáng tạo Nội dung' },
                  { key: 'FINANCE_LEGAL', label: 'Pháp chế & Kế toán' },
                  { key: 'LEADER', label: 'Trưởng nhóm & Quản lý' },
                ].map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setTargetRoleFilter(r.key as TargetRoleFilter)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      targetRoleFilter === r.key
                        ? 'bg-ink text-surface'
                        : 'bg-canvas text-ink-2 hover:bg-sunken'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {ROLE_SUGGESTED_QUESTIONS.filter(
                q => targetRoleFilter === 'ALL' || q.role === targetRoleFilter
              )
                .slice(0, 8)
                .map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveTab('qa');
                      handleAskQuestion(item.question);
                    }}
                    className="p-3 rounded-xl bg-canvas hover:bg-accent-soft hover:border-accent border border-line text-left transition-colors cursor-pointer flex flex-col justify-between gap-2"
                  >
                    <span className="text-xs font-semibold text-ink">{item.label}</span>
                    <span className="text-2xs text-accent font-medium flex items-center gap-1">
                      Hỏi quy trình
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* HÀNG 2: 4 QUY TRÌNH TRỌNG TÂM & BẢNG TÍNH THUẾ TỨC THÌ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái (7/12): 4 Quy trình trọng tâm nhất */}
            <div className="lg:col-span-7 space-y-4">
              <Panel title="4 Quy trình cốt lõi phòng Marketing B2C">
                <div className="divide-y divide-line">
                  {[
                    {
                      id: 'kb-b2c-002',
                      code: 'SOP-PLAN-01',
                      title: 'Quy trình lập kế hoạch E2E 12 bước & Baseline v1.0',
                      desc: 'Từ ngày 20-25 nhận Order 4.1, lập phân rã 4 trụ cột, khóa Baseline v1.0 và cơ chế duyệt ngân sách 2 cấp.',
                      tag: 'Lập kế hoạch',
                    },
                    {
                      id: 'kb-b2c-005',
                      code: 'SOP-QC-01',
                      title: 'Cẩm nang duyệt Kịch bản & Video KOC (110 quy tắc, 7 chặng)',
                      desc: 'Kiểm soát từ khóa cấm TikTok Shop, STAR-T Hook 3s, bản quyền nhạc thương mại và vi phạm điều khoản hợp đồng.',
                      tag: 'Kiểm duyệt kịch bản',
                    },
                    {
                      id: 'kb-b2c-006',
                      code: 'SOP-LEGAL-01',
                      title: 'SLA Hợp đồng pháp chế, Thuế TNCN 10%/HKD 7% & Cắt kỳ ngày 02',
                      desc: 'Lịch khóa nghiệm thu File 3.2 ngày 02, 2 đợt mở cổng Kế toán và công thức tính thuế Net sang Gross cho KOC cá nhân.',
                      tag: 'Thuế & Pháp chế',
                    },
                    {
                      id: 'kb-b2c-001',
                      code: 'POL-ORG-01',
                      title: 'Phân cấp quản trị 69 Gian hàng & 42 Thương hiệu B2C',
                      desc: 'Ranh giới thẩm quyền Brand Guideline vs Store Quota, cơ cấu Leader Tâm phụ trách 8 gian và các gian tự chủ.',
                      tag: 'Cơ cấu tổ chức',
                    },
                  ].map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenArticleFromSearch(item.id)}
                      className="py-4 flex items-start justify-between gap-4 hover:bg-canvas rounded-lg px-2 -mx-2 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-code text-2xs font-semibold text-accent">{item.code}</span>
                          <span className="text-2xs font-medium text-ink-3">· {item.tag}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-ink-3 leading-relaxed">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Cột phải (5/12): Máy tính thuế & Đối soát khung lương */}
            <div className="lg:col-span-5 space-y-4">
              <Panel title="Tính nhanh thuế hợp đồng & Khung lương">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcEntity('INDIVIDUAL')}
                      className={`py-2 px-2 rounded-lg text-2xs font-medium text-center transition-colors cursor-pointer ${
                        calcEntity === 'INDIVIDUAL'
                          ? 'bg-accent text-surface'
                          : 'bg-canvas text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      Cá nhân (10%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcEntity('HKD')}
                      className={`py-2 px-2 rounded-lg text-2xs font-medium text-center transition-colors cursor-pointer ${
                        calcEntity === 'HKD'
                          ? 'bg-accent text-surface'
                          : 'bg-canvas text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      Hộ KD (7%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcEntity('COMPANY')}
                      className={`py-2 px-2 rounded-lg text-2xs font-medium text-center transition-colors cursor-pointer ${
                        calcEntity === 'COMPANY'
                          ? 'bg-accent text-surface'
                          : 'bg-canvas text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      Công ty (8%)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Segmented<'NET_TO_GROSS' | 'GROSS_TO_NET'>
                      value={calcMode}
                      onChange={setCalcMode}
                      items={[
                        { key: 'NET_TO_GROSS', label: 'Net → Gross (HĐ)' },
                        { key: 'GROSS_TO_NET', label: 'Gross → Net (KOC)' },
                      ]}
                    />
                  </div>

                  <Field label="Số tiền thỏa thuận (VNĐ)">
                    <Input
                      value={calcAmountInput}
                      onChange={e => setCalcAmountInput(e.target.value)}
                      placeholder="VD: 4500000"
                    />
                  </Field>

                  <div className="p-4 rounded-xl bg-canvas border border-line space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-2 font-medium">Giá trị ghi trên hợp đồng (Gross):</span>
                      <span className="font-semibold text-ink tabular-nums text-sm">
                        {formatVnd(quickTaxCalculation.gross)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-2 font-medium">Thuế khấu trừ:</span>
                      <span className="font-medium text-warning tabular-nums">
                        {formatVnd(quickTaxCalculation.tax)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-line">
                      <span className="text-ink-2 font-medium">Thực nhận về tài khoản KOC (Net):</span>
                      <span className="font-semibold text-positive tabular-nums text-sm">
                        {formatVnd(quickTaxCalculation.net)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-line space-y-1 text-2xs">
                      <div>
                        <span className="text-ink-3">Khung Creator: </span>
                        <span className="font-medium text-accent">{matchedSalaryGradeForCalc}</span>
                      </div>
                      <div>
                        <span className="text-ink-3">Biểu mẫu chuẩn: </span>
                        <span className="font-code font-medium text-ink">{quickTaxCalculation.templateCode}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Lịch mốc cố định hàng tháng */}
              <Panel title="Lịch mốc cố định hàng tháng">
                <div className="divide-y divide-line text-xs">
                  <div className="py-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">Ngày 10 · 20 · 30</p>
                      <p className="text-2xs text-ink-3">Chu kỳ gửi danh sách đề xuất KOC 3 đợt</p>
                    </div>
                    <span className="text-2xs font-medium text-accent shrink-0">Định kỳ tháng</span>
                  </div>
                  <div className="py-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">Ngày 20 → 25 tháng T-1</p>
                      <p className="text-2xs text-ink-3">Growth giao Plan 4.1 → Khóa Baseline v1.0</p>
                    </div>
                    <span className="text-2xs font-medium text-warning shrink-0">Trước tháng T</span>
                  </div>
                  <div className="py-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">48h gửi mẫu · 5 ngày nộp Demo</p>
                      <p className="text-2xs text-ink-3">SLA xuất kho mẫu & KOC gửi video nháp</p>
                    </div>
                    <span className="text-2xs font-medium text-positive shrink-0">Bắt buộc</span>
                  </div>
                  <div className="py-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">Ngày 02 & Ngày làm việc thứ 5, 11</p>
                      <p className="text-2xs text-ink-3">Khóa nghiệm thu 3.2 & 2 đợt mở cổng Kế toán</p>
                    </div>
                    <span className="text-2xs font-medium text-ink-3 shrink-0">Chốt sổ</span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

            {/* =====================================================================
          TAB: TRUNG TÂM ĐÀO TẠO & KHẢO THÍ SÁT HẠCH (ACADEMY & EXAM ENGINE)
          ===================================================================== */}
      {activeTab === 'academy' && (
        <MarketingAcademySection
          currentUser={currentUser}
          brands={brands}
          stores={stores}
          onNavigateToLibraryArticle={(articleCode) => {
            const matched = allArticles.find(
              (a) =>
                a.code.toLowerCase() === articleCode.toLowerCase() ||
                a.title.toLowerCase().includes(articleCode.toLowerCase())
            );
            if (matched) {
              setSelectedArticleId(matched.id);
            }
            setActiveTab('library');
          }}
          onNotify={onNotify}
        />
      )}

{/* =====================================================================
          TAB 2: KHO TÀI LIỆU & QUY TRÌNH CHUẨN (SOP DOCUMENTATION LIBRARY)
          ===================================================================== */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <Panel>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Tìm theo mã quy trình (QT-B2C...), tiêu đề, từ khóa (weSign, Kalodata, 4.1, FOC, P3)..."
                  className="w-full sm:w-96"
                />
                {searchQuery && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                    Xóa bộ lọc ({filteredArticles.length} kết quả)
                  </Button>
                )}
              </div>
              <Chips
                label="Mảng nghiệp vụ"
                items={categoryChipOptions}
                value={selectedCategory}
                onChange={(k) => setSelectedCategory(k as KnowledgeCategoryId)}
              />
            </div>
          </Panel>

          {filteredArticles.length === 0 ? (
            <Panel>
              <EmptyState
                title="Không tìm thấy tài liệu quy trình phù hợp"
                description="Thử từ khóa khác hoặc chọn lại mảng nghiệp vụ để xem toàn bộ sổ tay phòng B2C."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                    }}
                  >
                    Xem tất cả tài liệu
                  </Button>
                }
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Danh sách tài liệu bên trái (4/12) */}
              <div className="lg:col-span-4 space-y-2">
                {filteredArticles.map(art => {
                  const isSelected = currentArticle?.id === art.id;
                  const catMeta = KNOWLEDGE_CATEGORIES.find(c => c.id === art.category);
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => setSelectedArticleId(art.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-accent-soft/60 border-accent text-ink'
                          : 'bg-surface hover:bg-canvas border-line text-ink'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-code text-2xs font-medium text-accent">
                          {art.code}
                        </span>
                        <span className="text-2xs text-ink-3">
                          {catMeta?.shortLabel || art.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-ink mt-1 line-clamp-2">
                        {art.title}
                      </h3>
                      <p className="text-xs text-ink-3 mt-1 line-clamp-2">
                        {art.summary}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Nội dung chi tiết tài liệu bên phải (8/12) */}
              {currentArticle && (
                <div className="lg:col-span-8">
                  <Panel
                    title={`${currentArticle.code} · ${currentArticle.title}`}
                    actions={
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={MessageSquare}
                          onClick={() => {
                            const sampleQ =
                              currentArticle.sampleQuestions[0] ||
                              `Tóm tắt quy định trong ${currentArticle.title}`;
                            setActiveTab('qa');
                            handleAskQuestion(sampleQ);
                          }}
                        >
                          Hỏi về quy trình này
                        </Button>
                        {currentArticle.relatedTab && onNavigateToTab && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={ExternalLink}
                            onClick={() => onNavigateToTab(currentArticle.relatedTab!)}
                          >
                            {currentArticle.relatedTabLabel || 'Mở màn hình'}
                          </Button>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-6">
                      {/* Hộp thông số cốt lõi của tài liệu */}
                      {currentArticle.keyFacts.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-canvas border border-line">
                          {currentArticle.keyFacts.map((fact, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <span className="text-2xs text-ink-3 block">{fact.label}</span>
                              <span className="text-xs font-semibold text-ink block">{fact.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Các phần nội dung chi tiết */}
                      {currentArticle.sections.map((sec, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                          <h3 className="text-base font-semibold text-ink border-b border-line pb-2">
                            {sec.heading}
                          </h3>
                          {sec.body.map((p, pIdx) => (
                            <p key={pIdx} className="text-sm text-ink-2 leading-relaxed">
                              {p}
                            </p>
                          ))}
                          {sec.bullets && sec.bullets.length > 0 && (
                            <ul className="space-y-2 pl-1">
                              {sec.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="flex items-start gap-3 text-sm text-ink-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {sec.formula && (
                            <div className="p-3 rounded-lg bg-sunken border border-line font-code text-xs text-ink font-medium">
                              Công thức chuẩn: {sec.formula}
                            </div>
                          )}
                          {sec.table && (
                            <div className="overflow-x-auto border border-line rounded-xl">
                              <table className="w-full min-w-[600px] text-left border-collapse">
                                <thead>
                                  <tr className="bg-canvas border-b border-line">
                                    {sec.table.headers.map((h, hIdx) => (
                                      <th
                                        key={hIdx}
                                        className="px-4 py-3 text-2xs font-semibold text-ink-2"
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-line text-xs">
                                  {sec.table.rows.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-canvas">
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          className={`px-4 py-3 align-top ${
                                            cIdx === 0 ? 'font-medium text-ink' : 'text-ink-2'
                                          }`}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {sec.callout && (
                            <div
                              className={`p-4 rounded-xl border ${
                                sec.callout.tone === 'warning'
                                  ? 'bg-warning-soft border-line text-warning'
                                  : sec.callout.tone === 'critical'
                                  ? 'bg-critical-soft border-line text-critical'
                                  : 'bg-accent-soft border-line text-accent'
                              }`}
                            >
                              <p className="text-xs font-semibold">{sec.callout.title}</p>
                              <p className="text-xs text-ink-2 mt-1">{sec.callout.text}</p>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Câu hỏi kiểm tra nhanh cuối bài */}
                      {currentArticle.sampleQuestions.length > 0 && (
                        <div className="pt-4 border-t border-line space-y-2">
                          <span className="text-2xs font-medium text-ink-3 block">
                            Câu hỏi tình huống liên quan (Bấm để chuyển sang Hỏi đáp):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {currentArticle.sampleQuestions.map((sq, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setActiveTab('qa');
                                  handleAskQuestion(sq);
                                }}
                                className="px-3 py-2 rounded-md bg-sunken hover:bg-accent-soft text-xs text-ink-2 hover:text-accent transition-colors cursor-pointer text-left"
                              >
                                {sq}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: TÌNH HUỐNG & CÂU HỎI THƯỜNG GẶP (FAQs & OBJECTION PLAYBOOK)
          ===================================================================== */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Segmented<PlaybookSubTab>
                value={playbookSubTab}
                onChange={setPlaybookSubTab}
                items={[
                  { key: 'faqs', label: `Câu hỏi thường gặp (${MARKETING_KNOWLEDGE_FAQS.length})` },
                  {
                    key: 'objections',
                    label: `Kịch bản đàm phán KOC & Brand (${OBJECTION_SCRIPTS_REFERENCE.length})`,
                  },
                ]}
              />
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Tìm tình huống (thuế 10%, bùng mẫu, giá cao, Spark Ads, không có Leader)..."
                className="w-full sm:w-80"
              />
            </div>
          </Panel>

          {playbookSubTab === 'faqs' ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredFaqs.map(faq => {
                return (
                  <Panel
                    key={faq.id}
                    title={faq.question}
                    actions={
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={copiedId === faq.id ? Check : Copy}
                          onClick={() => handleCopyText(faq.id, `${faq.question}\n\n${faq.shortAnswer}\n${faq.formulaOrRule ? `Quy tắc: ${faq.formulaOrRule}` : ''}`)}
                        >
                          {copiedId === faq.id ? 'Đã chép' : 'Sao chép'}
                        </Button>
                        {faq.relatedTab && onNavigateToTab && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={ArrowRight}
                            onClick={() => onNavigateToTab(faq.relatedTab!)}
                          >
                            {faq.relatedTabLabel || 'Mở màn hình'}
                          </Button>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      <p className="text-sm text-ink font-medium leading-relaxed">
                        {faq.shortAnswer}
                      </p>
                      {faq.formulaOrRule && (
                        <div className="px-3 py-2 rounded-lg bg-sunken border border-line font-code text-xs text-accent font-medium">
                          Quy tắc chuẩn: {faq.formulaOrRule}
                        </div>
                      )}
                      {faq.detailedSteps && faq.detailedSteps.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-2xs font-medium text-ink-3 block">
                            Các bước xử lý chi tiết:
                          </span>
                          {faq.detailedSteps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2 text-xs text-ink-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-canvas border border-line text-ink font-medium text-2xs shrink-0 mt-0.5 tabular-nums">
                                {sIdx + 1}
                              </span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredObjections.map(obj => (
                <Panel
                  key={obj.id}
                  title={obj.situation}
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={copiedId === obj.id ? Check : Copy}
                      onClick={() => handleCopyText(obj.id, obj.sampleMessage)}
                    >
                      {copiedId === obj.id ? 'Đã chép mẫu câu' : 'Chép tin nhắn mẫu'}
                    </Button>
                  }
                >
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-ink-3 font-medium">Nguyên nhân gốc: </span>
                      <span className="text-ink-2">{obj.rootCause}</span>
                    </div>
                    <div>
                      <span className="text-ink-3 font-medium">Chiến thuật đàm phán: </span>
                      <span className="text-ink font-medium">{obj.responseStrategy}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-canvas border border-line space-y-1">
                      <span className="text-2xs font-medium text-accent block">
                        Tin nhắn mẫu gửi Zalo cho KOC / Nhãn hàng:
                      </span>
                      <p className="text-xs text-ink italic leading-relaxed">
                        &ldquo;{obj.sampleMessage}&rdquo;
                      </p>
                    </div>
                    <div className="text-2xs text-ink-3">
                      <span className="font-medium text-ink-2">Phương án dự phòng: </span>
                      {obj.escalationOrFallback}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: BẢNG CHUẨN TRA CỨU NHANH (SLA, KHUNG LƯƠNG KL1-7, 8 MẪU HĐ)
          ===================================================================== */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented<QuickTableSubTab>
                value={quickTableSubTab}
                onChange={setQuickTableSubTab}
                items={[
                  { key: 'sla', label: `22 Mốc SLA cam kết (${SLA_QUICK_REFERENCE.length})` },
                  { key: 'salary', label: `9 Bậc Khung lương KL1–KL7 (${SALARY_GRADE_QUICK_REFERENCE.length})` },
                  { key: 'contracts', label: `8 Biểu mẫu Hợp đồng & Thuế (${CONTRACT_TAX_QUICK_REFERENCE.length})` },
                  { key: 'calculator', label: 'Công cụ tính thuế Net/Gross' },
                ]}
              />
            </div>
          </Panel>

          {quickTableSubTab === 'sla' && (
            <Panel
              title="Bảng 22 mốc SLA cam kết của phòng Marketing B2C"
              flush
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="bg-canvas border-b border-line text-2xs font-semibold text-ink-3">
                      <th className="px-4 py-3">Mã SLA</th>
                      <th className="px-4 py-3">Chặng</th>
                      <th className="px-4 py-3">Hoạt động tác nghiệp</th>
                      <th className="px-4 py-3">Thời hạn quy định (SLA)</th>
                      <th className="px-4 py-3">Người thực hiện</th>
                      <th className="px-4 py-3">Điểm chặn & Xử lý quá hạn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {SLA_QUICK_REFERENCE.map(item => (
                      <tr key={item.code} className="hover:bg-canvas">
                        <td className="px-4 py-3 font-code font-medium text-accent whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{item.stage}</td>
                        <td className="px-4 py-3 font-medium text-ink">{item.activity}</td>
                        <td className="px-4 py-3 font-semibold text-positive whitespace-nowrap">
                          {item.deadline}
                        </td>
                        <td className="px-4 py-3 text-ink-2">{item.pic}</td>
                        <td className="px-4 py-3 text-ink-3">{item.escalationRule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {quickTableSubTab === 'salary' && (
            <Panel
              title="Bảng chuẩn 9 bậc Khung lương Creator (KL1 – KL7 & TAP)"
              flush
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="bg-canvas border-b border-line text-2xs font-semibold text-ink-3">
                      <th className="px-4 py-3">Mã</th>
                      <th className="px-4 py-3">Tên khung lương</th>
                      <th className="px-4 py-3">Khoảng đơn giá Net</th>
                      <th className="px-4 py-3 text-right">Định mức chuẩn</th>
                      <th className="px-4 py-3">Phân nhóm (Segment)</th>
                      <th className="px-4 py-3">Đặc điểm & Quy tắc ngân sách</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {SALARY_GRADE_QUICK_REFERENCE.map(item => (
                      <tr key={item.code} className="hover:bg-canvas">
                        <td className="px-4 py-3 font-code font-semibold text-accent whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                          {item.grade}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap tabular-nums">
                          {item.netRange}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-ink whitespace-nowrap tabular-nums">
                          {item.benchmarkVnd > 0 ? formatVndShort(item.benchmarkVnd) : '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{item.segment}</td>
                        <td className="px-4 py-3 text-ink-2">
                          <p>{item.description}</p>
                          <p className="text-2xs text-ink-3 mt-0.5">{item.budgetRule}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {quickTableSubTab === 'contracts' && (
            <Panel
              title="Bộ 8 Biểu mẫu Hợp đồng & Biên bản nghiệm thu chuẩn Pháp chế"
              flush
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="bg-canvas border-b border-line text-2xs font-semibold text-ink-3">
                      <th className="px-4 py-3">Số hiệu</th>
                      <th className="px-4 py-3">Mã hệ thống</th>
                      <th className="px-4 py-3">Tên biểu mẫu chuẩn</th>
                      <th className="px-4 py-3">Chủ thể</th>
                      <th className="px-4 py-3">Chính sách thuế & Công thức</th>
                      <th className="px-4 py-3">Quy tắc trình ký & Nghiệm thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {CONTRACT_TAX_QUICK_REFERENCE.map(item => (
                      <tr key={item.code} className="hover:bg-canvas">
                        <td className="px-4 py-3 font-code font-semibold text-accent whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="px-4 py-3 font-code text-ink-2 whitespace-nowrap">
                          {item.systemCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          <p>{item.name}</p>
                          <p className="text-2xs text-ink-3 font-code mt-0.5">{item.fileName}</p>
                        </td>
                        <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{item.entityType}</td>
                        <td className="px-4 py-3 text-ink-2">{item.taxRule}</td>
                        <td className="px-4 py-3 text-ink-3">{item.signingRule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {quickTableSubTab === 'calculator' && (
            <div className="max-w-2xl mx-auto">
              <Panel title="Công cụ quy đổi thuế & Giá hợp đồng Gross / Net">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcEntity('INDIVIDUAL')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-colors cursor-pointer ${
                        calcEntity === 'INDIVIDUAL'
                          ? 'bg-ink text-surface'
                          : 'bg-canvas text-ink-2 hover:bg-sunken border border-line'
                      }`}
                    >
                      Cá nhân (TNCN 10%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcEntity('HKD')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-colors cursor-pointer ${
                        calcEntity === 'HKD'
                          ? 'bg-ink text-surface'
                          : 'bg-canvas text-ink-2 hover:bg-sunken border border-line'
                      }`}
                    >
                      Hộ kinh doanh (7%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcEntity('COMPANY')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-colors cursor-pointer ${
                        calcEntity === 'COMPANY'
                          ? 'bg-ink text-surface'
                          : 'bg-canvas text-ink-2 hover:bg-sunken border border-line'
                      }`}
                    >
                      Doanh nghiệp (VAT 8%)
                    </button>
                  </div>

                  <Segmented<'NET_TO_GROSS' | 'GROSS_TO_NET'>
                    value={calcMode}
                    onChange={setCalcMode}
                    items={[
                      { key: 'NET_TO_GROSS', label: 'Net (Thực nhận) → Gross (Giá hợp đồng)' },
                      { key: 'GROSS_TO_NET', label: 'Gross (Giá hợp đồng) → Net (Thực nhận)' },
                    ]}
                  />

                  <Field label="Số tiền đề xuất (VNĐ)">
                    <Input
                      value={calcAmountInput}
                      onChange={e => setCalcAmountInput(e.target.value)}
                      placeholder="VD: 4500000"
                    />
                  </Field>

                  <div className="p-4 rounded-xl bg-canvas border border-line space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-2 font-medium">Giá trị ghi trên hợp đồng (Gross):</span>
                      <span className="font-semibold text-ink tabular-nums text-base">
                        {formatVnd(quickTaxCalculation.gross)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-2 font-medium">Thuế khấu trừ nộp ngân sách:</span>
                      <span className="font-medium text-warning tabular-nums">
                        {formatVnd(quickTaxCalculation.tax)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-line">
                      <span className="text-ink-2 font-medium">Thực nhận về tài khoản KOC (Net):</span>
                      <span className="font-semibold text-positive tabular-nums text-base">
                        {formatVnd(quickTaxCalculation.net)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-line space-y-2 text-2xs">
                      <div>
                        <span className="text-ink-3">Chính sách áp dụng: </span>
                        <span className="font-medium text-ink">{quickTaxCalculation.taxNote}</span>
                      </div>
                      <div>
                        <span className="text-ink-3">Khung thù lao: </span>
                        <span className="font-medium text-accent">{matchedSalaryGradeForCalc}</span>
                      </div>
                      <div>
                        <span className="text-ink-3">Biểu mẫu chuẩn: </span>
                        <span className="font-code font-medium text-ink">{quickTaxCalculation.templateCode}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: HỎI ĐÁP NGHIỆP VỤ B2C (INTERACTIVE Q&A ASSISTANT WORKSPACE)
          ===================================================================== */}
      {activeTab === 'qa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột chính (8/12): Khung hỏi đáp & Trích dẫn quy trình */}
          <div className="lg:col-span-8 space-y-4">
            <Panel
              title="Đặt câu hỏi nghiệp vụ Marketing B2C"
              actions={
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-medium text-ink-3">
                    {effectiveQaRoute.hasActiveExternalKey
                      ? `Kết nối ${effectiveQaRoute.primaryModel}`
                      : 'Sổ tay chuẩn nội bộ'}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => {
                      const firstQ = ROLE_SUGGESTED_QUESTIONS[0].question;
                      const synth = synthesizeMarketingKnowledgeAnswer({
                        question: firstQ,
                        brands,
                        stores,
                        kocs,
                      });
                      seqIdRef.current += 1;
                      const rid = seqIdRef.current;
                      setMessages([
                        {
                          id: `reset-u-${rid}`,
                          role: 'user',
                          content: firstQ,
                          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        },
                        {
                          id: `reset-a-${rid}`,
                          role: 'assistant',
                          content: synth.answerMarkdown,
                          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                          providerLabel: 'Sổ tay chuẩn Upbase B2C',
                          latencyMs: 15,
                          synthesized: synth,
                        },
                      ]);
                      onNotify?.('Đã làm mới phiên hỏi đáp', 'info');
                    }}
                  >
                    Làm mới
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                {/* Gợi ý câu hỏi nhanh theo chủ đề */}
                <div className="pb-3 border-b border-line">
                  <div className="flex flex-wrap gap-2">
                    {ROLE_SUGGESTED_QUESTIONS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAskQuestion(item.question)}
                        disabled={isAsking}
                        className="px-3 py-2 rounded-md bg-sunken hover:bg-accent-soft hover:text-accent text-ink-2 text-2xs font-medium transition-colors text-left cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Luồng hội thoại hỏi đáp */}
                <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                  {messages.map(msg => {
                    if (msg.role === 'user') {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-2xl rounded-xl bg-accent-soft px-4 py-3 text-ink border border-line">
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <span className="text-2xs font-medium text-accent">
                                {currentUser.name} ({currentUser.roleTitle})
                              </span>
                              <span className="text-2xs text-ink-3 tabular-nums">{msg.timestamp}</span>
                            </div>
                            <p className="text-sm font-medium text-ink">{msg.content}</p>
                          </div>
                        </div>
                      );
                    }

                    const synth = msg.synthesized;
                    return (
                      <div key={msg.id} className="rounded-xl bg-surface border border-line p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-accent-soft text-accent">
                              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </span>
                            <span className="text-xs font-semibold text-ink">
                              {msg.providerLabel || 'Sổ tay chuẩn Upbase B2C'}
                            </span>
                            {msg.latencyMs !== undefined && (
                              <span className="text-2xs text-ink-3 tabular-nums">
                                · Phản hồi {msg.latencyMs}ms
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={copiedId === msg.id ? Check : Copy}
                              onClick={() => handleCopyText(msg.id, msg.content)}
                            >
                              {copiedId === msg.id ? 'Đã chép' : 'Sao chép'}
                            </Button>
                          </div>
                        </div>

                        {/* Nội dung câu trả lời đã định dạng */}
                        {renderFormattedAnswer(msg.content)}

                        {/* Thẻ dữ liệu Nhãn hàng / Gian hàng trực tiếp nếu phát hiện trong câu hỏi */}
                        {synth?.detectedLiveEntity && (
                          <div className="p-3 rounded-lg bg-sunken border border-line flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Building2 className="w-4 h-4 text-accent shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink truncate">
                                  Dữ liệu trực tiếp: {synth.detectedLiveEntity.name}
                                </p>
                                <p className="text-2xs text-ink-3 truncate">
                                  {synth.detectedLiveEntity.summary}
                                </p>
                              </div>
                            </div>
                            {onNavigateToTab && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={ArrowRight}
                                onClick={() => onNavigateToTab(synth.detectedLiveEntity!.navigateTab)}
                              >
                                {synth.detectedLiveEntity.navigateLabel}
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Danh sách tài liệu quy trình trích dẫn */}
                        {synth && synth.citations.length > 0 && (
                          <div className="pt-3 border-t border-line space-y-2">
                            <span className="text-2xs font-medium text-ink-3 block">
                              Tài liệu quy trình trích dẫn (Bấm để đọc toàn văn hoặc mở màn hình tác nghiệp):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {synth.citations.map(cit => (
                                <div
                                  key={cit.id}
                                  className="p-3 rounded-lg bg-canvas border border-line flex flex-col justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-code text-2xs font-medium text-accent">
                                        {cit.code}
                                      </span>
                                      <span className="text-2xs text-ink-3 truncate">
                                        · {cit.sourceDoc}
                                      </span>
                                    </div>
                                    <p className="text-xs font-medium text-ink mt-0.5 line-clamp-1">
                                      {cit.title}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedArticleId(cit.id);
                                        setActiveTab('library');
                                      }}
                                      className="text-2xs font-medium text-accent hover:underline cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Xem quy trình</span>
                                    </button>
                                    {cit.relatedTab && onNavigateToTab && (
                                      <button
                                        type="button"
                                        onClick={() => onNavigateToTab(cit.relatedTab!)}
                                        className="text-2xs font-medium text-ink-2 hover:text-ink cursor-pointer inline-flex items-center gap-1 ml-auto"
                                      >
                                        <span>{cit.relatedTabLabel || 'Mở màn hình'}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Gợi ý câu hỏi đào sâu tiếp theo */}
                        {synth && synth.suggestedFollowUps.length > 0 && (
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <span className="text-2xs text-ink-3 mr-1">Hỏi tiếp:</span>
                            {synth.suggestedFollowUps.map((fq, fIdx) => (
                              <button
                                key={fIdx}
                                type="button"
                                onClick={() => handleAskQuestion(fq)}
                                className="px-2 py-1 rounded bg-sunken hover:bg-accent-soft text-2xs text-ink-2 hover:text-accent transition-colors cursor-pointer text-left"
                              >
                                {fq}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Ô nhập câu hỏi */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleAskQuestion();
                  }}
                  className="pt-2 border-t border-line flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={questionInput}
                    onChange={e => setQuestionInput(e.target.value)}
                    placeholder="Nhập câu hỏi nghiệp vụ (VD: Tính thuế cho KOC cá nhân, gian hàng không có Leader trình ai...)"
                    className="flex-1 px-4 py-3 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                    disabled={isAsking}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    icon={Send}
                    disabled={!questionInput.trim() || isAsking}
                  >
                    Gửi
                  </Button>
                </form>
              </div>
            </Panel>
          </div>

          {/* Cột phụ (4/12): Công cụ tính nhanh & Lịch mốc */}
          <div className="lg:col-span-4 space-y-4">
            <Panel title="Tính nhanh thuế hợp đồng & Khung lương">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcEntity('INDIVIDUAL')}
                    className={`py-2 px-2 rounded-lg text-2xs font-medium text-center transition-colors cursor-pointer ${
                      calcEntity === 'INDIVIDUAL'
                        ? 'bg-accent text-surface'
                        : 'bg-canvas text-ink-2 hover:bg-sunken'
                    }`}
                  >
                    Cá nhân (10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcEntity('HKD')}
                    className={`py-2 px-2 rounded-lg text-2xs font-medium text-center transition-colors cursor-pointer ${
                      calcEntity === 'HKD'
                        ? 'bg-accent text-surface'
                        : 'bg-canvas text-ink-2 hover:bg-sunken'
                    }`}
                  >
                    Hộ KD (7%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcEntity('COMPANY')}
                    className={`py-2 px-2 rounded-lg text-2xs font-medium text-center transition-colors cursor-pointer ${
                      calcEntity === 'COMPANY'
                        ? 'bg-accent text-surface'
                        : 'bg-canvas text-ink-2 hover:bg-sunken'
                    }`}
                  >
                    Công ty (8%)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Segmented<'NET_TO_GROSS' | 'GROSS_TO_NET'>
                    value={calcMode}
                    onChange={setCalcMode}
                    items={[
                      { key: 'NET_TO_GROSS', label: 'Net → Gross (HĐ)' },
                      { key: 'GROSS_TO_NET', label: 'Gross → Net (KOC)' },
                    ]}
                  />
                </div>

                <Field label="Số tiền thỏa thuận (VNĐ)">
                  <Input
                    value={calcAmountInput}
                    onChange={e => setCalcAmountInput(e.target.value)}
                    placeholder="VD: 4500000"
                  />
                </Field>

                <div className="p-4 rounded-xl bg-canvas border border-line space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2 font-medium">Giá trị ghi hợp đồng:</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatVnd(quickTaxCalculation.gross)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2 font-medium">Thuế khấu trừ:</span>
                    <span className="font-medium text-warning tabular-nums">
                      {formatVnd(quickTaxCalculation.tax)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="text-ink-2 font-medium">Thực nhận về tài khoản KOC:</span>
                    <span className="font-semibold text-positive tabular-nums">
                      {formatVnd(quickTaxCalculation.net)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-line space-y-1 text-2xs">
                    <div>
                      <span className="text-ink-3">Khung Creator: </span>
                      <span className="font-medium text-accent">{matchedSalaryGradeForCalc}</span>
                    </div>
                    <div>
                      <span className="text-ink-3">Biểu mẫu chuẩn: </span>
                      <span className="font-code font-medium text-ink">{quickTaxCalculation.templateCode}</span>
                    </div>
                  </div>
                </div>

                {onNavigateToTab && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ArrowRight}
                    className="w-full"
                    onClick={() => onNavigateToTab('contracts')}
                  >
                    Mở màn Hợp đồng & thanh toán
                  </Button>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* Modal thêm quy định / hướng dẫn mới vào Sổ tay */}
      <Modal
        open={isAddArticleModalOpen}
        onClose={() => setIsAddArticleModalOpen(false)}
        title="Thêm quy định vào Sổ tay B2C"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddArticleModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveCustomArticle}>
              Lưu quy định
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCustomArticle} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mã quy định / tài liệu">
              <Input
                value={newArticleCode}
                onChange={e => setNewArticleCode(e.target.value)}
                placeholder="VD: QT-B2C-NOIBO-10"
              />
            </Field>
            <Field label="Mảng nghiệp vụ">
              <Select
                value={newArticleCategory}
                onChange={e =>
                  setNewArticleCategory(e.target.value as Exclude<KnowledgeCategoryId, 'ALL'>)
                }
              >
                {KNOWLEDGE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Tiêu đề quy định / hướng dẫn">
            <Input
              value={newArticleTitle}
              onChange={e => setNewArticleTitle(e.target.value)}
              placeholder="VD: Quy định kiểm soát mã vận đơn gửi mẫu dịp Mega Sale 11.11"
            />
          </Field>

          <Field label="Tóm tắt ngắn (1–2 dòng)">
            <Input
              value={newArticleSummary}
              onChange={e => setNewArticleSummary(e.target.value)}
              placeholder="Tóm tắt mục tiêu và đối tượng áp dụng..."
            />
          </Field>

          <Field label="Nội dung chi tiết các bước & quy tắc">
            <Textarea
              rows={6}
              value={newArticleContent}
              onChange={e => setNewArticleContent(e.target.value)}
              placeholder="Nhập các bước thực hiện, mốc thời gian SLA, mức phạt hoặc biểu mẫu áp dụng..."
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
