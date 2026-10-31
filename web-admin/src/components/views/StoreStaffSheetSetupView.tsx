'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Copy,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { resolveStoreStaffAssignment, type StorePortfolioItem } from '../../lib/types';
import {
  persistStoreSheetLinks,
  readStoreOverrides,
  resolveStoreSheetLink,
  STORE_SHEET_OVERRIDES_EVENT,
  type StoreSheetLink,
} from '../../lib/storeSheetLinks';
import { INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { StoreSheetLinkModal } from './StoreSheetLinkModal';
import {
  DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY,
  getStaffSheetFieldEditPolicy,
  saveStaffSheetFieldEditPolicy,
  STAFF_LISTING_COLUMNS,
  STAFF_SHEET_CONFIGURABLE_FIELD_GROUPS,
  STAFF_SHEET_READONLY_SYSTEM_COLUMNS,
  STAFF_SHEET_UPDATED_EVENT,
  type StaffListingColumnKey,
  type StaffListingColumnMeta,
  type StaffSheetFieldEditPolicy,
} from '../../lib/staffBrandListingSheet';
import {
  ActionMenu,
  Button,
  ChannelTag,
  Column,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
} from '../ui';

export interface AppsScriptModuleItem {
  id: string;
  name: string;
  triggerType: 'onEdit' | 'onOpen';
  targetColumns: string;
  purpose: string;
  enabled: boolean;
  isBuiltIn?: boolean;
  codeBody: string;
}

export interface StoreAppsScriptMatrixConfig {
  applyAppsScript: boolean;
  enabledModuleIds: string[];
}

function combineAppsScriptModulesClient(modules: AppsScriptModuleItem[]): string {
  const activeModules = modules.filter(m => m && m.enabled);
  const onEditModules = activeModules.filter(m => m.triggerType === 'onEdit');
  const onOpenModules = activeModules.filter(m => m.triggerType === 'onOpen');

  const lines: string[] = [
    '/**',
    ' * Bộ tiện ích Google Apps Script chuẩn UpBase B2C (Tự động sinh từ Web Admin)',
    ` * Số tác vụ đang kích hoạt: ${activeModules.length}/${modules.length}`,
    ...activeModules.map((m, idx) => ` * ${idx + 1}. [${m.triggerType}] ${m.name} (${m.targetColumns})`),
    ' */',
    '',
    'function onEdit(e) {',
    '  if (!e || !e.range) return;',
    '  var sheet = e.range.getSheet();',
    '  var row = e.range.getRow();',
    '  var col = e.range.getColumn();',
    '  if (row <= 3) return;',
    '',
    '  var lastCol = Math.max(sheet.getLastColumn(), col);',
    '  var row3Values = sheet.getRange(3, 1, 1, lastCol).getValues()[0];',
    '  var row1Values = sheet.getRange(1, 1, 1, lastCol).getValues()[0];',
    '',
    '  function normalizeHeader(text) {',
    "    return String(text || '')",
    "      .replace(/[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]/g, '')",
    "      .replace(/\\s*\\(bổ sung thêm\\)/gi, '')",
    '      .trim()',
    '      .toLowerCase();',
    '  }',
    '',
    '  var headerRowIndex = 3;',
    '  var headers = row3Values.map(normalizeHeader);',
    '  var hasBrandColInRow3 = headers.some(function (h) {',
    "    return h === 'brand chọn' || h === 'brand chon' || h === 'brand duyệt' || h === 'kết quả brand';",
    '  });',
    '  if (!hasBrandColInRow3) {',
    '    headerRowIndex = 1;',
    '    headers = row1Values.map(normalizeHeader);',
    '  }',
    '',
    '  function findCol(candidates) {',
    '    for (var i = 0; i < headers.length; i++) {',
    '      if (candidates.indexOf(headers[i]) !== -1) return i + 1;',
    '    }',
    '    return -1;',
    '  }',
    '',
    "  var brandColIdx = findCol(['brand chọn', 'brand chon', 'brand duyệt', 'kết quả brand']);",
    "  var rawValLower = String(e.range.getValue() || '').trim().toLowerCase();",
    '',
    '  var ctx = {',
    '    e: e,',
    '    sheet: sheet,',
    '    row: row,',
    '    col: col,',
    '    lastCol: lastCol,',
    '    headerRowIndex: headerRowIndex,',
    '    headers: headers,',
    '    brandColIdx: brandColIdx,',
    '    rawValLower: rawValLower,',
    '    findCol: findCol',
    '  };',
    '',
  ];

  for (const m of onEditModules) {
    const fnMatch = m.codeBody.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
    const fnName = fnMatch ? fnMatch[1] : `runModule_${m.id}`;
    lines.push(`  try { ${fnName}(ctx); } catch (err) {}`);
  }

  lines.push('}', '');

  for (const m of onEditModules) {
    lines.push(`// --- [${m.id}] ${m.name} ---`);
    lines.push(m.codeBody.trim(), '');
  }

  for (const m of onOpenModules) {
    lines.push(`// --- [${m.id}] ${m.name} ---`);
    lines.push(m.codeBody.trim(), '');
  }

  return lines.join('\n');
}

export interface StoreStaffSheetDraft extends StoreSheetLink {
  storeId: string;
  storeName: string;
  brandName: string;
  platform: string;
  pic: string;
  supportStaff: string[];
}

interface ParsedBulkRow {
  id: string;
  rawStore: string;
  matchedStore?: StorePortfolioItem;
  bookingSheetUrl: string;
  defaultSheetTab: string;
}

export type StoreSheetSetupTabKey =
  | 'TABLE'
  | 'FIELD_PERMISSIONS'
  | 'BULK_PASTE'
  | 'SERVICE_ACCOUNT';

export interface StoreStaffSheetSetupViewProps {
  stores?: StorePortfolioItem[];
  initialTab?: StoreSheetSetupTabKey;
  onSaved?: (updatedByStoreId: Record<string, Partial<StorePortfolioItem>>) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onSelectStoreForListing?: (storeName: string) => void;
}

const normText = (v: string) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const StoreStaffSheetSetupView: React.FC<StoreStaffSheetSetupViewProps> = ({
  stores = INITIAL_STORE_PORTFOLIOS,
  initialTab = 'TABLE',
  onSaved,
  onNotify,
  onSelectStoreForListing,
}) => {
  const [activeTab, setActiveTab] = useState<StoreSheetSetupTabKey>(initialTab);
  const [drafts, setDrafts] = useState<Record<string, StoreStaffSheetDraft>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Bộ lọc bảng danh sách
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [linkStatusFilter, setLinkStatusFilter] = useState<'ALL' | 'HAS_SHEET' | 'MISSING_SHEET'>('ALL');

  // Gian đang mở modal sửa Link Sheet
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  // Phân quyền sửa trường (cột) cho nhân sự trên bảng Listing & Air Video
  const [fieldPolicyDraft, setFieldPolicyDraft] = useState<StaffSheetFieldEditPolicy>(() =>
    getStaffSheetFieldEditPolicy()
  );
  const [fieldPolicyDirty, setFieldPolicyDirty] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldGroupFilter, setFieldGroupFilter] = useState<string>('ALL');

  useEffect(() => {
    const syncPolicy = () => {
      setFieldPolicyDraft(getStaffSheetFieldEditPolicy());
      setFieldPolicyDirty(false);
    };
    window.addEventListener(STAFF_SHEET_UPDATED_EVENT, syncPolicy);
    return () => window.removeEventListener(STAFF_SHEET_UPDATED_EVENT, syncPolicy);
  }, []);

  // Dán hàng loạt
  const [bulkText, setBulkText] = useState('');

  // Cấu hình Google Service Account
  const [saConfigured, setSaConfigured] = useState(false);
  const [saEmail, setSaEmail] = useState('');
  const [saJsonInput, setSaJsonInput] = useState('');
  const [savingSa, setSavingSa] = useState(false);

  // Quản lý Danh mục Tiện ích Tự động hóa Google Sheet (Apps Script) & Ma trận áp dụng theo Gian hàng
  const [appsScriptConfigured, setAppsScriptConfigured] = useState(false);
  const [appsScriptClientIdMasked, setAppsScriptClientIdMasked] = useState<string | null>(null);
  const [oauthClientIdInput, setOauthClientIdInput] = useState('');
  const [oauthClientSecretInput, setOauthClientSecretInput] = useState('');
  const [oauthRefreshTokenInput, setOauthRefreshTokenInput] = useState('');
  const [appsScriptModules, setAppsScriptModules] = useState<AppsScriptModuleItem[]>([]);
  const [defaultAppsScriptModules, setDefaultAppsScriptModules] = useState<AppsScriptModuleItem[]>([]);
  const [storeAppsScriptMatrix, setStoreAppsScriptMatrix] = useState<
    Record<string, StoreAppsScriptMatrixConfig>
  >({});
  const [storeMatrixDirty, setStoreMatrixDirty] = useState(false);
  const [permissionSubView, setPermissionSubView] = useState<
    'ALL' | 'STAFF_FIELDS' | 'APPSCRIPT_MATRIX'
  >('ALL');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixBrandFilter, setMatrixBrandFilter] = useState('ALL');
  const [matrixApplyFilter, setMatrixApplyFilter] = useState<
    'ALL' | 'HAS_SHEET' | 'APPLY_ONLY' | 'DISABLED_ONLY'
  >('ALL');
  const [editingModuleDraft, setEditingModuleDraft] = useState<AppsScriptModuleItem | null>(null);
  const [isAddingNewModule, setIsAddingNewModule] = useState(false);
  const [showRawCodePreview, setShowRawCodePreview] = useState(false);
  const [appsScriptCodeDraft, setAppsScriptCodeDraft] = useState('');
  const [appsScriptInstalledMap, setAppsScriptInstalledMap] = useState<
    Record<
      string,
      {
        spreadsheetId: string;
        scriptId: string;
        storeName?: string;
        sheetUrl?: string;
        enabledModuleIds?: string[];
        installedAt: string;
      }
    >
  >({});
  const [savingAppsScriptOAuth, setSavingAppsScriptOAuth] = useState(false);
  const [pushingAppsScriptBusy, setPushingAppsScriptBusy] = useState(false);
  const [appsScriptBatchResults, setAppsScriptBatchResults] = useState<
    Array<{
      storeName: string;
      sheetUrl: string;
      spreadsheetId: string;
      ok: boolean;
      scriptId?: string;
      mode?: 'CREATED' | 'UPDATED';
      error?: string;
    }>
  >([]);

  const b2cStores = useMemo(
    () => stores.filter(s => s.isB2cManaged !== false && s.storeName),
    [stores]
  );

  const loadDraftsFromStores = useCallback(() => {
    const overrides = readStoreOverrides();
    const nextDrafts: Record<string, StoreStaffSheetDraft> = {};
    for (const st of b2cStores) {
      // Nhân sự chỉ dùng để lọc; nguồn duy nhất là Dữ liệu gốc
      const resolvedStaff = resolveStoreStaffAssignment(st, '');
      nextDrafts[st.id] = {
        storeId: st.id,
        storeName: st.storeName,
        brandName: (st.brandName || st.storeName.split('_')[0] || st.storeName).trim(),
        platform: st.platform || 'TikTok Shop',
        pic: (resolvedStaff.primaryPic || '').trim(),
        supportStaff: resolvedStaff.supportStaff,
        ...resolveStoreSheetLink(st, overrides),
      };
    }
    setDrafts(nextDrafts);
  }, [b2cStores]);

  useEffect(() => {
    loadDraftsFromStores();
    // Link Sheet có thể được sửa từ Dữ liệu gốc
    window.addEventListener(STORE_SHEET_OVERRIDES_EVENT, loadDraftsFromStores);
    return () => window.removeEventListener(STORE_SHEET_OVERRIDES_EVENT, loadDraftsFromStores);
  }, [loadDraftsFromStores]);

  // Kiểm tra trạng thái Google Service Account (tự động khôi phục từ bộ nhớ trình duyệt nếu máy chủ vừa khởi động lại)
  useEffect(() => {
    fetch('/api/booking-list/push-sheet')
      .then(r => r.json())
      .then(async (d: { configured?: boolean; serviceAccountEmail?: string }) => {
        if (d.configured) {
          setSaConfigured(true);
          if (d.serviceAccountEmail) setSaEmail(d.serviceAccountEmail);
          return;
        }
        const cachedJson =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('upbase_b2c_google_sa_config_v1')
            : null;
        if (cachedJson && cachedJson.trim()) {
          const restoreRes = await fetch('/api/booking-list/push-sheet', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceAccountJson: cachedJson.trim() }),
          }).catch(() => null);
          const restored = (await restoreRes?.json().catch(() => null)) as {
            configured?: boolean;
            serviceAccountEmail?: string;
          } | null;
          if (restored?.configured) {
            setSaConfigured(true);
            if (restored.serviceAccountEmail) setSaEmail(restored.serviceAccountEmail);
            return;
          }
        }
        setSaConfigured(false);
      })
      .catch(() => {});

    fetch('/api/booking-list/setup-appscript')
      .then((r) => r.json())
      .then(
        (d: {
          configured?: boolean;
          clientIdMasked?: string | null;
          modules?: AppsScriptModuleItem[];
          defaultModules?: AppsScriptModuleItem[];
          storeMatrix?: Record<string, StoreAppsScriptMatrixConfig>;
          scriptCode?: string;
          installedMap?: Record<
            string,
            {
              spreadsheetId: string;
              scriptId: string;
              storeName?: string;
              sheetUrl?: string;
              enabledModuleIds?: string[];
              installedAt: string;
            }
          >;
        }) => {
          setAppsScriptConfigured(Boolean(d.configured));
          setAppsScriptClientIdMasked(d.clientIdMasked || null);
          if (Array.isArray(d.modules)) setAppsScriptModules(d.modules);
          if (Array.isArray(d.defaultModules)) setDefaultAppsScriptModules(d.defaultModules);
          if (d.storeMatrix && typeof d.storeMatrix === 'object' && Object.keys(d.storeMatrix).length > 0) {
            setStoreAppsScriptMatrix(d.storeMatrix);
          } else if (typeof window !== 'undefined') {
            try {
              const cachedMatrix = window.localStorage.getItem('upbase_store_appscript_matrix_v1');
              if (cachedMatrix) {
                setStoreAppsScriptMatrix(
                  JSON.parse(cachedMatrix) as Record<string, StoreAppsScriptMatrixConfig>
                );
              }
            } catch {
              /* ignore */
            }
          }
          if (d.scriptCode) setAppsScriptCodeDraft(d.scriptCode);
          if (d.installedMap && typeof d.installedMap === 'object') {
            setAppsScriptInstalledMap(d.installedMap);
          }
        }
      )
      .catch(() => {});
  }, []);

  // Danh sách Brand duy nhất
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of Object.values(drafts)) {
      if (d.brandName) set.add(d.brandName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [drafts]);

  // Danh sách Nhân sự đang được phân quyền trong các gian hàng (để lọc nhanh)
  const assignedStaffOptions = useMemo(() => {
    const names = new Set<string>();
    for (const d of Object.values(drafts)) {
      if (d.pic) names.add(d.pic.trim());
      for (const sup of d.supportStaff || []) {
        if (sup) names.add(sup.trim());
      }
    }
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [drafts]);

  // Xử lý Phân quyền Sửa Trường (Cột) cho Nhân sự
  const columnMetaMap = useMemo(() => {
    const map = new Map<StaffListingColumnKey, StaffListingColumnMeta>();
    for (const col of STAFF_LISTING_COLUMNS) {
      map.set(col.key, col);
    }
    return map;
  }, []);

  const handleToggleFieldForRole = (
    roleKey: 'SUPPORT' | 'PRIMARY_PIC' | 'LEADER',
    colKey: StaffListingColumnKey
  ) => {
    setFieldPolicyDraft(prev => {
      const currentList = prev.editableFieldsByRole[roleKey] || [];
      const exists = currentList.includes(colKey);
      const nextList = exists
        ? currentList.filter(k => k !== colKey)
        : [...currentList, colKey];
      return {
        ...prev,
        editableFieldsByRole: {
          ...prev.editableFieldsByRole,
          [roleKey]: nextList,
        },
      };
    });
    setFieldPolicyDirty(true);
  };

  const handleToggleGroupForRole = (
    roleKey: 'SUPPORT' | 'PRIMARY_PIC' | 'LEADER',
    groupFields: StaffListingColumnKey[],
    enableAll: boolean
  ) => {
    setFieldPolicyDraft(prev => {
      const currentSet = new Set(prev.editableFieldsByRole[roleKey] || []);
      for (const f of groupFields) {
        if (enableAll) currentSet.add(f);
        else currentSet.delete(f);
      }
      return {
        ...prev,
        editableFieldsByRole: {
          ...prev.editableFieldsByRole,
          [roleKey]: Array.from(currentSet),
        },
      };
    });
    setFieldPolicyDirty(true);
  };

  const handleResetDefaultFieldPolicy = () => {
    setFieldPolicyDraft({
      ...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY,
      editableFieldsByRole: {
        SUPPORT: [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.SUPPORT],
        PRIMARY_PIC: [...DEFAULT_STAFF_SHEET_SHEET_PIC_FALLBACK()],
        LEADER: [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.LEADER],
      },
    });
    setFieldPolicyDirty(true);
    onNotify?.('Đã đặt lại cấu hình quyền sửa trường mặc định. Bấm "Lưu phân quyền sửa trường" để áp dụng.', 'info');
  };

  function DEFAULT_STAFF_SHEET_SHEET_PIC_FALLBACK() {
    return DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.PRIMARY_PIC;
  }

  const handleSaveFieldPolicy = () => {
    const saved = saveStaffSheetFieldEditPolicy(fieldPolicyDraft);
    setFieldPolicyDraft(saved);
    setFieldPolicyDirty(false);
    onNotify?.(
      'Đã lưu cấu hình Phân quyền Sửa Trường cho Nhân sự. Áp dụng tức thời trên bảng Listing & Air Video.',
      'success'
    );
  };

  const stats = useMemo(() => {
    const all = Object.values(drafts);
    return {
      total: all.length,
      withSheet: all.filter(d => Boolean(d.bookingSheetUrl.trim())).length,
    };
  }, [drafts]);

  const toSheetTarget = (d: StoreStaffSheetDraft) => ({
    storeId: d.storeId,
    storeName: d.storeName,
    brandName: d.brandName,
    platform: d.platform,
    link: {
      bookingSheetUrl: d.bookingSheetUrl,
      planSheetTab: d.planSheetTab,
      defaultSheetTab: d.defaultSheetTab,
      reportSheetTab: d.reportSheetTab,
    },
  });

  const editingDraft = editingStoreId ? drafts[editingStoreId] : undefined;

  const applySavedLinks = (patches: Record<string, StoreSheetLink>) => {
    setDrafts(prev => {
      const next = { ...prev };
      for (const [id, link] of Object.entries(patches)) {
        if (next[id]) next[id] = { ...next[id], ...link };
      }
      return next;
    });
    const updated: Record<string, Partial<StorePortfolioItem>> = {};
    for (const [id, link] of Object.entries(patches)) {
      updated[id] = {
        bookingSheetUrl: link.bookingSheetUrl.trim() || undefined,
        planSheetTab: link.planSheetTab.trim() || undefined,
        defaultSheetTab: link.defaultSheetTab.trim() || undefined,
        reportSheetTab: link.reportSheetTab.trim() || undefined,
      };
    }
    onSaved?.(updated);
  };

  // Lọc danh sách trên bảng
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.values(drafts)
      .filter(d => brandFilter === 'ALL' || d.brandName.toLowerCase() === brandFilter.toLowerCase())
      .filter(d => platformFilter === 'ALL' || d.platform.toLowerCase().includes(platformFilter.toLowerCase()))
      .filter(d => {
        if (staffFilter === 'ALL') return true;
        if (staffFilter === '__UNASSIGNED__') return !d.pic.trim();
        const lowerStaff = staffFilter.toLowerCase();
        return (
          d.pic.toLowerCase() === lowerStaff ||
          (d.supportStaff || []).some(s => s.toLowerCase() === lowerStaff)
        );
      })
      .filter(d => {
        if (linkStatusFilter === 'HAS_SHEET') return Boolean(d.bookingSheetUrl.trim());
        if (linkStatusFilter === 'MISSING_SHEET') return !d.bookingSheetUrl.trim();
        return true;
      })
      .filter(
        d =>
          !q ||
          `${d.storeName} ${d.brandName} ${d.pic} ${(d.supportStaff || []).join(' ')} ${d.bookingSheetUrl} ${d.defaultSheetTab}`
            .toLowerCase()
            .includes(q)
      )
      .sort((a, b) => a.storeName.localeCompare(b.storeName, 'vi'));
  }, [drafts, search, brandFilter, platformFilter, staffFilter, linkStatusFilter]);

  // Phân tích dữ liệu dán hàng loạt từ Excel / Google Sheet
  const parsedBulkRows = useMemo<ParsedBulkRow[]>(() => {
    const lines = bulkText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const matchStore = (rawName: string): StorePortfolioItem | undefined => {
      const target = normText(rawName);
      if (!target) return undefined;
      return (
        b2cStores.find(s => normText(s.storeName) === target || normText(s.id) === target) ||
        b2cStores.find(
          s =>
            normText(s.storeName).includes(target) ||
            target.includes(normText(s.storeName)) ||
            normText(s.brandName) === target
        )
      );
    };

    const results: ParsedBulkRow[] = [];
    lines.forEach((line, idx) => {
      const cells = (line.includes('\t') ? line.split('\t') : line.split(/\s*[|;]\s*/))
        .map(c => c.trim())
        .filter(Boolean);
      if (cells.length === 0) return;
      const firstNorm = normText(cells[0]);
      if (firstNorm === 'gianhang' || firstNorm === 'tengianhang' || firstNorm === 'stt' || firstNorm === 'store') {
        return;
      }

      let rawStore = '';
      let bookingSheetUrl = '';
      let defaultSheetTab = '';

      for (const cell of cells) {
        if (/docs\.google\.com\/spreadsheets/i.test(cell)) {
          bookingSheetUrl = cell;
        } else if (/^https?:\/\//i.test(cell)) {
          // Link gian hàng trên sàn sửa ở Dữ liệu gốc
          continue;
        } else if (!rawStore && matchStore(cell)) {
          rawStore = cell;
        } else if (!rawStore) {
          rawStore = cell;
        } else if (!defaultSheetTab) {
          defaultSheetTab = cell;
        }
      }

      results.push({
        id: `bulk-${idx}`,
        rawStore,
        matchedStore: matchStore(rawStore),
        bookingSheetUrl,
        defaultSheetTab,
      });
    });
    return results;
  }, [bulkText, b2cStores]);

  const handleApplyAndSaveBulk = async () => {
    const matched = parsedBulkRows.filter(r => r.matchedStore);
    if (matched.length === 0) {
      onNotify?.('Chưa tìm thấy dòng nào khớp với tên Gian hàng trong hệ thống.', 'warning');
      return;
    }
    const patches: Record<string, StoreSheetLink> = {};
    for (const row of matched) {
      const cur = drafts[row.matchedStore!.id];
      if (!cur) continue;
      patches[cur.storeId] = {
        bookingSheetUrl: (row.bookingSheetUrl || cur.bookingSheetUrl).trim(),
        planSheetTab: cur.planSheetTab,
        defaultSheetTab: (row.defaultSheetTab || cur.defaultSheetTab).trim(),
        reportSheetTab: cur.reportSheetTab,
      };
    }
    setSaving(true);
    try {
      await persistStoreSheetLinks(patches);
      applySavedLinks(patches);
      onNotify?.(`Đã lưu Link Google Sheet cho ${Object.keys(patches).length} gian hàng.`, 'success');
      setBulkText('');
      setActiveTab('TABLE');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Không lưu được Link Sheet.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServiceAccount = async () => {
    if (!saJsonInput.trim()) return;
    setSavingSa(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountJson: saJsonInput.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        configured?: boolean;
        serviceAccountEmail?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không lưu được cấu hình Google Service Account.');
      }
      setSaConfigured(Boolean(data.configured));
      if (data.serviceAccountEmail) setSaEmail(data.serviceAccountEmail);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('upbase_b2c_google_sa_config_v1', saJsonInput.trim());
        } catch {
          /* ignore */
        }
      }
      setSaJsonInput('');
      onNotify?.(`Đã lưu Google Service Account (${data.serviceAccountEmail}).`, 'success');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Lỗi lưu Service Account.', 'error');
    } finally {
      setSavingSa(false);
    }
  };

  const extractSpreadsheetIdFromUrl = (url: string): string => {
    const m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : '';
  };

  const handleToggleModuleEnabled = (moduleId: string) => {
    setAppsScriptModules(prev => {
      const next = prev.map(m => (m.id === moduleId ? { ...m, enabled: !m.enabled } : m));
      setAppsScriptCodeDraft(combineAppsScriptModulesClient(next));
      return next;
    });
  };

  const handleStartEditModule = (mod: AppsScriptModuleItem) => {
    setIsAddingNewModule(false);
    setEditingModuleDraft({ ...mod });
  };

  const handleStartAddModule = () => {
    const newId = `CUSTOM_SCRIPT_${Date.now().toString().slice(-5)}`;
    setIsAddingNewModule(true);
    setEditingModuleDraft({
      id: newId,
      name: 'Tác vụ Apps Script mới',
      triggerType: 'onEdit',
      targetColumns: 'Brand chọn → Ghi chú',
      purpose: 'Mô tả tác dụng thực tế của Script này khi thao tác trên Google Sheet của Brand.',
      enabled: true,
      isBuiltIn: false,
      codeBody: `function runModule_${newId}(ctx) {\n  // ctx gồm: sheet, row, col, headers, brandColIdx, rawValLower, findCol\n  if (ctx.brandColIdx <= 0 || ctx.col !== ctx.brandColIdx) return;\n}`,
    });
  };

  const handleSaveModuleEdit = () => {
    if (!editingModuleDraft) return;
    if (!editingModuleDraft.name.trim()) {
      onNotify?.('Vui lòng nhập Tên tác vụ Apps Script.', 'warning');
      return;
    }
    const cleaned: AppsScriptModuleItem = {
      ...editingModuleDraft,
      name: editingModuleDraft.name.trim(),
      targetColumns: editingModuleDraft.targetColumns.trim() || 'Toàn bộ Sheet',
      purpose: editingModuleDraft.purpose.trim(),
      codeBody: editingModuleDraft.codeBody.trim(),
    };
    setAppsScriptModules(prev => {
      const exists = prev.some(m => m.id === cleaned.id);
      const next = exists
        ? prev.map(m => (m.id === cleaned.id ? cleaned : m))
        : [...prev, cleaned];
      setAppsScriptCodeDraft(combineAppsScriptModulesClient(next));
      return next;
    });
    setEditingModuleDraft(null);
    setIsAddingNewModule(false);
    onNotify?.(
      `Đã cập nhật tác vụ "${cleaned.name}". Bấm "Lưu Danh mục Script & Cấu hình" để lưu lên máy chủ.`,
      'info'
    );
  };

  const handleDeleteModule = (moduleId: string) => {
    setAppsScriptModules(prev => {
      const next = prev.filter(m => m.id !== moduleId);
      setAppsScriptCodeDraft(combineAppsScriptModulesClient(next));
      return next;
    });
    onNotify?.('Đã xóa tác vụ Apps Script khỏi danh mục.', 'info');
  };

  const handleResetDefaultModules = () => {
    if (defaultAppsScriptModules.length === 0) return;
    const cloned = defaultAppsScriptModules.map(m => ({ ...m }));
    setAppsScriptModules(cloned);
    setAppsScriptCodeDraft(combineAppsScriptModulesClient(cloned));
    onNotify?.(`Đã khôi phục ${cloned.length} tác vụ Apps Script mặc định.`, 'info');
  };

  const defaultEnabledModuleIds = useMemo(
    () => appsScriptModules.filter(m => m.enabled).map(m => m.id),
    [appsScriptModules]
  );

  const getStoreMatrixConfig = useCallback(
    (storeId: string): StoreAppsScriptMatrixConfig => {
      const existing = storeAppsScriptMatrix[storeId];
      if (existing) {
        return {
          applyAppsScript: existing.applyAppsScript,
          enabledModuleIds: Array.isArray(existing.enabledModuleIds)
            ? existing.enabledModuleIds
            : defaultEnabledModuleIds,
        };
      }
      return {
        applyAppsScript: true,
        enabledModuleIds: defaultEnabledModuleIds,
      };
    },
    [storeAppsScriptMatrix, defaultEnabledModuleIds]
  );

  const filteredMatrixStores = useMemo(() => {
    const q = matrixSearch.trim().toLowerCase();
    return Object.values(drafts)
      .filter(
        d =>
          matrixBrandFilter === 'ALL' ||
          d.brandName.toLowerCase() === matrixBrandFilter.toLowerCase()
      )
      .filter(d => {
        if (matrixApplyFilter === 'HAS_SHEET') return Boolean(d.bookingSheetUrl.trim());
        const cfg = getStoreMatrixConfig(d.storeId);
        if (matrixApplyFilter === 'APPLY_ONLY') return cfg.applyAppsScript;
        if (matrixApplyFilter === 'DISABLED_ONLY') return !cfg.applyAppsScript;
        return true;
      })
      .filter(
        d =>
          !q ||
          `${d.storeName} ${d.brandName} ${d.platform} ${d.pic}`.toLowerCase().includes(q)
      )
      .sort((a, b) => a.storeName.localeCompare(b.storeName, 'vi'));
  }, [drafts, matrixSearch, matrixBrandFilter, matrixApplyFilter, getStoreMatrixConfig]);

  const handleToggleStoreApplyAppsScript = (storeId: string) => {
    setStoreAppsScriptMatrix(prev => {
      const cur = prev[storeId] || {
        applyAppsScript: true,
        enabledModuleIds: defaultEnabledModuleIds,
      };
      return {
        ...prev,
        [storeId]: {
          ...cur,
          applyAppsScript: !cur.applyAppsScript,
        },
      };
    });
    setStoreMatrixDirty(true);
  };

  const handleToggleStoreModuleInMatrix = (storeId: string, moduleId: string) => {
    setStoreAppsScriptMatrix(prev => {
      const cur = prev[storeId] || {
        applyAppsScript: true,
        enabledModuleIds: defaultEnabledModuleIds,
      };
      const exists = cur.enabledModuleIds.includes(moduleId);
      const nextIds = exists
        ? cur.enabledModuleIds.filter(id => id !== moduleId)
        : [...cur.enabledModuleIds, moduleId];
      return {
        ...prev,
        [storeId]: {
          applyAppsScript: cur.applyAppsScript,
          enabledModuleIds: nextIds,
        },
      };
    });
    setStoreMatrixDirty(true);
  };

  const handleBatchSetFilteredStoresAppsScript = (apply: boolean) => {
    if (filteredMatrixStores.length === 0) return;
    setStoreAppsScriptMatrix(prev => {
      const next = { ...prev };
      for (const st of filteredMatrixStores) {
        const cur = next[st.storeId] || {
          applyAppsScript: true,
          enabledModuleIds: defaultEnabledModuleIds,
        };
        next[st.storeId] = {
          ...cur,
          applyAppsScript: apply,
        };
      }
      return next;
    });
    setStoreMatrixDirty(true);
  };

  const handleBatchToggleModuleColumnForFilteredStores = (
    moduleId: string,
    enable: boolean
  ) => {
    if (filteredMatrixStores.length === 0) return;
    setStoreAppsScriptMatrix(prev => {
      const next = { ...prev };
      for (const st of filteredMatrixStores) {
        const cur = next[st.storeId] || {
          applyAppsScript: true,
          enabledModuleIds: defaultEnabledModuleIds,
        };
        const set = new Set(cur.enabledModuleIds);
        if (enable) set.add(moduleId);
        else set.delete(moduleId);
        next[st.storeId] = {
          ...cur,
          enabledModuleIds: Array.from(set),
        };
      }
      return next;
    });
    setStoreMatrixDirty(true);
  };

  const handleSaveAppsScriptOAuthConfig = async (customModules?: AppsScriptModuleItem[]) => {
    setSavingAppsScriptOAuth(true);
    const modulesToSave = customModules ?? appsScriptModules;
    try {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            'upbase_store_appscript_matrix_v1',
            JSON.stringify(storeAppsScriptMatrix)
          );
        } catch {
          /* ignore */
        }
      }
      const res = await fetch('/api/booking-list/setup-appscript', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(oauthClientIdInput.trim() ? { clientId: oauthClientIdInput.trim() } : {}),
          ...(oauthClientSecretInput.trim() ? { clientSecret: oauthClientSecretInput.trim() } : {}),
          ...(oauthRefreshTokenInput.trim() ? { refreshToken: oauthRefreshTokenInput.trim() } : {}),
          modules: modulesToSave,
          storeMatrix: storeAppsScriptMatrix,
          ...(appsScriptCodeDraft.trim() ? { customScriptCode: appsScriptCodeDraft.trim() } : {}),
          verifyToken: Boolean(
            oauthClientIdInput.trim() || oauthClientSecretInput.trim() || oauthRefreshTokenInput.trim()
          ),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        configured?: boolean;
        clientIdMasked?: string | null;
        modules?: AppsScriptModuleItem[];
        storeMatrix?: Record<string, StoreAppsScriptMatrixConfig>;
        scriptCode?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Không lưu được cấu hình Google Apps Script API.');
      }
      setAppsScriptConfigured(Boolean(data.configured));
      if (data.clientIdMasked) setAppsScriptClientIdMasked(data.clientIdMasked);
      if (Array.isArray(data.modules)) setAppsScriptModules(data.modules);
      if (data.storeMatrix && typeof data.storeMatrix === 'object') {
        setStoreAppsScriptMatrix(data.storeMatrix);
      }
      if (data.scriptCode) setAppsScriptCodeDraft(data.scriptCode);
      setStoreMatrixDirty(false);
      setOauthClientIdInput('');
      setOauthClientSecretInput('');
      setOauthRefreshTokenInput('');
      onNotify?.(
        'Đã lưu Danh mục Tiện ích, Ma trận áp dụng Apps Script và cấu hình OAuth2 thành công.',
        'success'
      );
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Lỗi lưu cấu hình Google Apps Script API.',
        'error'
      );
    } finally {
      setSavingAppsScriptOAuth(false);
    }
  };

  const handleDeployAppsScriptToTargets = async (
    targets: Array<{
      storeId?: string;
      storeName: string;
      sheetUrl: string;
      applyAppsScript?: boolean;
      moduleIds?: string[];
    }>
  ) => {
    const validTargets = targets.filter((t) => Boolean(t.sheetUrl?.trim()));
    if (validTargets.length === 0) {
      onNotify?.('Chưa có gian hàng nào gắn Link Google Sheet để cài đặt Apps Script.', 'warning');
      return;
    }
    if (!appsScriptConfigured) {
      setActiveTab('SERVICE_ACCOUNT');
      onNotify?.(
        'Vui lòng nhập cấu hình Google OAuth2 (Client ID, Client Secret, Refresh Token) ở tab Kết nối Google trước khi cài đặt Apps Script lên Sheet.',
        'warning'
      );
      return;
    }
    setPushingAppsScriptBusy(true);
    setAppsScriptBatchResults([]);
    try {
      const enrichedTargets = validTargets.map(t => {
        if (!t.storeId) return t;
        const cfg = getStoreMatrixConfig(t.storeId);
        return {
          ...t,
          applyAppsScript: t.applyAppsScript ?? cfg.applyAppsScript,
          moduleIds: t.moduleIds ?? cfg.enabledModuleIds,
        };
      });

      const res = await fetch('/api/booking-list/setup-appscript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: enrichedTargets,
          modules: appsScriptModules,
          storeMatrix: storeAppsScriptMatrix,
          scriptCode: appsScriptCodeDraft,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        successCount?: number;
        failCount?: number;
        results?: Array<{
          storeName: string;
          sheetUrl: string;
          spreadsheetId: string;
          ok: boolean;
          scriptId?: string;
          mode?: 'CREATED' | 'UPDATED';
          enabledCount?: number;
          error?: string;
        }>;
        installedMap?: Record<
          string,
          {
            spreadsheetId: string;
            scriptId: string;
            storeName?: string;
            sheetUrl?: string;
            enabledModuleIds?: string[];
            installedAt: string;
          }
        >;
        error?: string;
      } | null;

      if (data?.installedMap && typeof data.installedMap === 'object') {
        setAppsScriptInstalledMap(data.installedMap);
      }
      if (Array.isArray(data?.results)) {
        setAppsScriptBatchResults(data.results);
      }

      if (!res.ok || !data?.ok) {
        onNotify?.(
          data?.error ||
            data?.results?.[0]?.error ||
            'Không thể cài đặt Apps Script lên file Google Sheet.',
          'error'
        );
        return;
      }

      onNotify?.(
        `Đã cài đặt / cập nhật Apps Script theo Ma trận cho ${data.successCount}/${enrichedTargets.length} gian hàng${
          data.failCount ? ` (${data.failCount} lỗi)` : ''
        }.`,
        data.failCount ? 'warning' : 'success'
      );
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Lỗi kết nối khi cài đặt Apps Script.',
        'error'
      );
    } finally {
      setPushingAppsScriptBusy(false);
    }
  };

  // Bảng chỉ để xem; sửa trong modal
  const tableColumns = useMemo<Column<StoreStaffSheetDraft>[]>(
    () => [
      {
        key: 'store',
        header: 'Gian hàng',
        width: 240,
        render: row => (
          <div className="space-y-0.5">
            <div className="font-semibold text-ink">{row.storeName}</div>
            <div className="flex items-center gap-2 text-2xs text-ink-3">
              <span className="font-medium text-ink-2">{row.brandName}</span>
              <span>·</span>
              <ChannelTag channel={row.platform} />
            </div>
          </div>
        ),
      },
      {
        key: 'sheetUrl',
        header: 'Google Sheet',
        width: 200,
        render: row => {
          const sheetId = extractSpreadsheetIdFromUrl(row.bookingSheetUrl);
          return row.bookingSheetUrl.trim() ? (
            <a
              href={row.bookingSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex max-w-full items-center gap-2 text-xs text-ink-2 hover:text-accent"
              title={row.bookingSheetUrl}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-mono text-2xs">{sheetId ? `…${sheetId.slice(-8)}` : 'Mở file'}</span>
            </a>
          ) : (
            <span className="text-xs text-ink-3">—</span>
          );
        },
      },
      {
        key: 'sheetTab',
        header: 'Tab Plan · Listing · Kết quả',
        width: 260,
        render: row => {
          const tabs = [row.planSheetTab, row.defaultSheetTab, row.reportSheetTab];
          return row.bookingSheetUrl.trim() ? (
            <span className="text-xs text-ink-2">
              {tabs.map((t, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-ink-4"> · </span>}
                  {t ? <span>{t}</span> : <span className="text-ink-3">mặc định</span>}
                </React.Fragment>
              ))}
            </span>
          ) : (
            <span className="text-xs text-ink-3">—</span>
          );
        },
      },
      {
        key: 'status',
        header: 'Trạng thái',
        width: 190,
        render: row => {
          const hasSheet = Boolean(row.bookingSheetUrl.trim());
          const sheetId = extractSpreadsheetIdFromUrl(row.bookingSheetUrl);
          const scriptMeta = sheetId ? appsScriptInstalledMap[sheetId] : undefined;
          const matrixCfg = getStoreMatrixConfig(row.storeId);
          return (
            <div className="flex flex-wrap items-center gap-1">
              {hasSheet ? <Status tone="positive">Đã gắn Sheet</Status> : <Status tone="neutral">Chưa gắn</Status>}
              {hasSheet &&
                (!matrixCfg.applyAppsScript ? null : scriptMeta ? (
                  <Status tone="info">
                    Script ({scriptMeta.enabledModuleIds?.length ?? matrixCfg.enabledModuleIds.length})
                  </Status>
                ) : (
                  <Status tone="warning">Chưa cài Script</Status>
                ))}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        width: 150,
        align: 'right',
        render: row => {
          const hasSheet = Boolean(row.bookingSheetUrl.trim());
          const sheetId = extractSpreadsheetIdFromUrl(row.bookingSheetUrl);
          const scriptMeta = sheetId ? appsScriptInstalledMap[sheetId] : undefined;
          const matrixCfg = getStoreMatrixConfig(row.storeId);
          const menuItems = [
            ...(hasSheet && matrixCfg.applyAppsScript
              ? [
                  {
                    label: scriptMeta ? 'Cập nhật Apps Script' : 'Cài Apps Script',
                    icon: Code2,
                    onSelect: () =>
                      void handleDeployAppsScriptToTargets([
                        { storeId: row.storeId, storeName: row.storeName, sheetUrl: row.bookingSheetUrl },
                      ]),
                  },
                ]
              : []),
            ...(onSelectStoreForListing
              ? [
                  {
                    label: 'Mở Listing',
                    icon: ExternalLink,
                    onSelect: () => onSelectStoreForListing(row.storeName),
                  },
                ]
              : []),
          ];
          return (
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
              <Button size="sm" variant="ghost" icon={Edit3} onClick={() => setEditingStoreId(row.storeId)}>
                Sửa
              </Button>
              {menuItems.length > 0 && <ActionMenu items={menuItems} />}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSelectStoreForListing, appsScriptInstalledMap, pushingAppsScriptBusy, getStoreMatrixConfig]
  );

  // Định nghĩa cột cho bảng xem trước Dán hàng loạt
  const bulkColumns = useMemo<Column<ParsedBulkRow>[]>(
    () => [
      {
        key: 'rawStore',
        header: 'Tên gian hàng dán vào',
        render: r => <span className="text-ink-2">{r.rawStore}</span>,
      },
      {
        key: 'matched',
        header: 'Gian hàng khớp trên hệ thống',
        render: r =>
          r.matchedStore ? (
            <Status tone="positive">{r.matchedStore.storeName}</Status>
          ) : (
            <Status tone="warning">Chưa khớp tên gian hàng</Status>
          ),
      },
      {
        key: 'sheetUrl',
        header: 'Link Google Sheet',
        render: r => <span className="block max-w-[280px] truncate text-ink-2">{r.bookingSheetUrl || '—'}</span>,
      },
      {
        key: 'extra',
        header: 'Tab Listing',
        render: r => <span className="block max-w-[220px] truncate text-ink-2">{r.defaultSheetTab || '—'}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat label="Gian hàng B2C" value={stats.total} note={`${brandOptions.length} thương hiệu`} />
        <Stat
          label="Đã gắn Google Sheet"
          value={`${stats.withSheet}/${stats.total}`}
          tone={stats.withSheet === stats.total ? 'positive' : 'warning'}
          progress={{ value: stats.withSheet, max: Math.max(1, stats.total) }}
        />
        <Stat
          label="Đã cài Apps Script"
          value={`${
            Object.values(drafts).filter(d => {
              const id = extractSpreadsheetIdFromUrl(d.bookingSheetUrl);
              return Boolean(id && appsScriptInstalledMap[id]);
            }).length
          }/${stats.withSheet}`}
          note="Trên số gian đã gắn Sheet"
        />
        <Stat
          label="Kết nối Google Sheets API"
          value={saConfigured ? 'Sẵn sàng' : 'Chưa gắn Key'}
          tone={saConfigured ? 'positive' : 'warning'}
          note={saConfigured ? undefined : 'Cấu hình ở tab Kết nối Google'}
        />
      </StatRow>

      {saEmail && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-xs text-ink-2">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span>Mỗi file Google Sheet cần chia sẻ quyền Editor cho</span>
          <code className="rounded bg-sunken px-2 py-0.5 font-mono text-ink">{saEmail}</code>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-accent hover:underline cursor-pointer"
            onClick={() => {
              void navigator.clipboard?.writeText(saEmail);
              onNotify?.('Đã sao chép email.', 'info');
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Sao chép
          </button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'TABLE', label: 'Gian hàng', count: filteredRows.length },
          {
            key: 'FIELD_PERMISSIONS',
            label: 'Quyền sửa trường',
            count: fieldPolicyDraft.editableFieldsByRole.SUPPORT.length,
          },
          { key: 'BULK_PASTE', label: 'Dán từ Excel' },
          {
            key: 'SERVICE_ACCOUNT',
            label: 'Kết nối Google',
            count: appsScriptModules.filter(m => m.enabled).length || undefined,
          },
        ]}
        actions={
          activeTab === 'FIELD_PERMISSIONS' ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={RotateCcw}
                onClick={handleResetDefaultFieldPolicy}
              >
                Khôi phục mặc định
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Save}
                onClick={handleSaveFieldPolicy}
              >
                {fieldPolicyDirty ? 'Lưu phân quyền sửa trường (Có thay đổi)' : 'Lưu phân quyền sửa trường'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {activeTab === 'TABLE' && (
        <Panel flush>
          <div className="p-4 sm:p-4 border-b border-line">
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Tìm tên gian hàng, thương hiệu, nhân sự, link sheet...',
              }}
              resultCount={filteredRows.length}
              filters={
                <>
                  <Select
                    value={brandFilter}
                    onChange={e => setBrandFilter(e.target.value)}
                    className="w-[175px]"
                  >
                    <option value="ALL">Tất cả Brand ({brandOptions.length})</option>
                    {brandOptions.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={platformFilter}
                    onChange={e => setPlatformFilter(e.target.value)}
                    className="w-[155px]"
                  >
                    <option value="ALL">Tất cả sàn</option>
                    <option value="TikTok">TikTok Shop</option>
                    <option value="Shopee">Shopee Mall</option>
                    <option value="Lazada">Lazada</option>
                  </Select>
                  <Select
                    value={staffFilter}
                    onChange={e => setStaffFilter(e.target.value)}
                    className="w-[205px]"
                  >
                    <option value="ALL">Tất cả nhân sự (PIC / Hỗ trợ)</option>
                    <option value="__UNASSIGNED__">Chưa phân công PIC</option>
                    {assignedStaffOptions.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={linkStatusFilter}
                    onChange={e =>
                      setLinkStatusFilter(
                        e.target.value as 'ALL' | 'HAS_SHEET' | 'MISSING_SHEET'
                      )
                    }
                    className="w-[175px]"
                  >
                    <option value="ALL">Mọi trạng thái Link</option>
                    <option value="HAS_SHEET">Đã có Link Sheet</option>
                    <option value="MISSING_SHEET">Chưa có Link Sheet</option>
                  </Select>
                </>
              }
            />
          </div>

          <DataTable
            columns={tableColumns}
            rows={filteredRows}
            rowKey={r => r.storeId}
            stickyLast
            onRowClick={r => setEditingStoreId(r.storeId)}
            empty={
              <EmptyState
                title="Không tìm thấy gian hàng phù hợp"
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setBrandFilter('ALL');
                      setPlatformFilter('ALL');
                      setStaffFilter('ALL');
                      setLinkStatusFilter('ALL');
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                }
              />
            }
          />
        </Panel>
      )}

      {activeTab === 'FIELD_PERMISSIONS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={permissionSubView === 'ALL' ? 'primary' : 'secondary'}
                onClick={() => setPermissionSubView('ALL')}
              >
                Hiện cả 2 bảng ma trận
              </Button>
              <Button
                size="sm"
                variant={permissionSubView === 'STAFF_FIELDS' ? 'primary' : 'secondary'}
                onClick={() => setPermissionSubView('STAFF_FIELDS')}
              >
                1. Phân quyền Sửa Trường cho Nhân sự (47 Cột)
              </Button>
              <Button
                size="sm"
                variant={permissionSubView === 'APPSCRIPT_MATRIX' ? 'primary' : 'secondary'}
                onClick={() => setPermissionSubView('APPSCRIPT_MATRIX')}
              >
                2. Ma trận Áp dụng Apps Script theo Gian hàng ({
                  Object.values(drafts).filter(d => getStoreMatrixConfig(d.storeId).applyAppsScript).length
                }/{stats.total})
              </Button>
            </div>
            <div className="flex items-center gap-2 text-2xs text-ink-3">
              <span>
                Gian hàng áp dụng Script:{' '}
                <strong className="text-ink">
                  {Object.values(drafts).filter(d => getStoreMatrixConfig(d.storeId).applyAppsScript).length}
                </strong>
                /{stats.total}
              </span>
            </div>
          </div>

          {permissionSubView !== 'APPSCRIPT_MATRIX' && (
          <>
          <Panel
            title="Quy tắc bảo vệ dòng & khóa trường trên Bảng Listing / Google Sheet"
            actions={
              <div className="flex items-center gap-2">
                {fieldPolicyDirty ? (
                  <Status tone="warning">Chưa lưu thay đổi</Status>
                ) : (
                  <Status tone="positive">Đang áp dụng</Status>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  icon={RotateCcw}
                  onClick={handleResetDefaultFieldPolicy}
                >
                  Khôi phục mặc định
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={Save}
                  onClick={handleSaveFieldPolicy}
                >
                  Lưu phân quyền sửa trường
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="1. Phạm vi dòng của Nhân viên hỗ trợ (Booking Support)">
                <Select
                  value={fieldPolicyDraft.supportRowScope}
                  onChange={e => {
                    setFieldPolicyDraft(prev => ({
                      ...prev,
                      supportRowScope:
                        e.target.value === 'ALL_STORE_ROWS'
                          ? 'ALL_STORE_ROWS'
                          : 'OWN_ROWS_ONLY',
                    }));
                    setFieldPolicyDirty(true);
                  }}
                >
                  <option value="OWN_ROWS_ONLY">
                    Chỉ được sửa các dòng KOC do chính mình thêm (Khuyên dùng)
                  </option>
                  <option value="ALL_STORE_ROWS">
                    Được sửa mọi dòng KOC trong gian hàng được phân công hỗ trợ
                  </option>
                </Select>
              </Field>

              <Field label="2. Khóa trường đề xuất sau khi Brand duyệt (Brand chọn = Yes)">
                <Select
                  value={fieldPolicyDraft.lockProposalAfterBrandApproved ? 'LOCK' : 'UNLOCK'}
                  onChange={e => {
                    setFieldPolicyDraft(prev => ({
                      ...prev,
                      lockProposalAfterBrandApproved: e.target.value === 'LOCK',
                    }));
                    setFieldPolicyDirty(true);
                  }}
                >
                  <option value="LOCK">
                    Tự động khóa trường Đề xuất & Giá Net với Support/PIC khi Brand chọn = Yes
                  </option>
                  <option value="UNLOCK">
                    Cho phép sửa lại trường Đề xuất & Giá Net kể cả sau khi Brand đã duyệt
                  </option>
                </Select>
              </Field>

              <Field label="3. Quyền bấm Đẩy dữ liệu lên Google Sheet">
                <Select
                  value={fieldPolicyDraft.allowSupportPushToSheet ? 'ALLOW_SUPPORT' : 'PIC_ONLY'}
                  onChange={e => {
                    setFieldPolicyDraft(prev => ({
                      ...prev,
                      allowSupportPushToSheet: e.target.value === 'ALLOW_SUPPORT',
                    }));
                    setFieldPolicyDirty(true);
                  }}
                >
                  <option value="PIC_ONLY">
                    Chỉ PIC Chính của gian hàng, Leader và Quản trị viên được đẩy lên Sheet
                  </option>
                  <option value="ALLOW_SUPPORT">
                    Cho phép cả Nhân viên hỗ trợ (Booking Support) bấm đẩy lên Sheet
                  </option>
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel
            title="Ma trận Phân quyền Sửa từng Trường (Cột) theo Cấp Nhân sự"
            flush
          >
            <div className="p-4 sm:p-4 border-b border-line space-y-3">
              <FilterBar
                search={{
                  value: fieldSearch,
                  onChange: setFieldSearch,
                  placeholder: 'Tìm tên cột, mã cột Excel (VD: N, U, BA, Giá net, Brand chọn, Link air)...',
                }}
                filters={
                  <Select
                    value={fieldGroupFilter}
                    onChange={e => setFieldGroupFilter(e.target.value)}
                    className="w-[310px]"
                  >
                    <option value="ALL">Tất cả 5 nhóm nghiệp vụ (47 trường cấu hình)</option>
                    {STAFF_SHEET_CONFIGURABLE_FIELD_GROUPS.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.fields.length} cột)
                      </option>
                    ))}
                  </Select>
                }
              />

              {/* Bật / tắt nhanh theo nhóm nghiệp vụ */}
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-5">
                {STAFF_SHEET_CONFIGURABLE_FIELD_GROUPS.map(group => {
                  const supCount = group.fields.filter(f =>
                    fieldPolicyDraft.editableFieldsByRole.SUPPORT.includes(f)
                  ).length;
                  const picCount = group.fields.filter(f =>
                    fieldPolicyDraft.editableFieldsByRole.PRIMARY_PIC.includes(f)
                  ).length;
                  const leaderCount = group.fields.filter(f =>
                    fieldPolicyDraft.editableFieldsByRole.LEADER.includes(f)
                  ).length;
                  const total = group.fields.length;

                  return (
                    <div
                      key={group.id}
                      className="rounded-md border border-line bg-sunken/70 p-3 space-y-2 text-2xs"
                    >
                      <div className="font-semibold text-ink leading-snug">{group.title}</div>
                      <div className="flex items-center justify-between gap-1 text-ink-2">
                        <span>Hỗ trợ ({supCount}/{total}):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleGroupForRole('SUPPORT', group.fields, true)}
                            className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-accent-soft hover:text-accent"
                          >
                            Mở hết
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupForRole('SUPPORT', group.fields, false)}
                            className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-sunken text-ink-3"
                          >
                            Khóa
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-ink-2">
                        <span>PIC Chính ({picCount}/{total}):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleGroupForRole('PRIMARY_PIC', group.fields, true)}
                            className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-accent-soft hover:text-accent"
                          >
                            Mở hết
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupForRole('PRIMARY_PIC', group.fields, false)}
                            className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-sunken text-ink-3"
                          >
                            Khóa
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-ink-2">
                        <span>Leader ({leaderCount}/{total}):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleGroupForRole('LEADER', group.fields, true)}
                            className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-accent-soft hover:text-accent"
                          >
                            Mở hết
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupForRole('LEADER', group.fields, false)}
                            className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-sunken text-ink-3"
                          >
                            Khóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DataTable
              rowKey={r => r.key}
              rows={STAFF_SHEET_CONFIGURABLE_FIELD_GROUPS.filter(
                g => fieldGroupFilter === 'ALL' || g.id === fieldGroupFilter
              ).flatMap(g =>
                g.fields
                  .map(fKey => {
                    const meta = columnMetaMap.get(fKey);
                    if (!meta) return null;
                    return {
                      ...meta,
                      groupId: g.id,
                      groupTitle: g.title,
                      groupBadge: g.badge,
                    };
                  })
                  .filter((item): item is NonNullable<typeof item> => {
                    if (!item) return false;
                    const q = fieldSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      item.header.toLowerCase().includes(q) ||
                      item.excelCol.toLowerCase().includes(q) ||
                      item.key.toLowerCase().includes(q) ||
                      item.groupTitle.toLowerCase().includes(q)
                    );
                  })
              )}
              columns={[
                {
                  key: 'excelCol',
                  header: 'Cột Sheet',
                  width: 90,
                  render: row => (
                    <span className="inline-flex items-center rounded border border-line bg-sunken px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                      Cột {row.excelCol}
                    </span>
                  ),
                },
                {
                  key: 'field',
                  header: 'Trường dữ liệu trên Bảng & Google Sheet',
                  width: 280,
                  render: row => (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-ink">{row.header}</div>
                      <div className="text-2xs text-ink-3 font-mono">{row.key}</div>
                    </div>
                  ),
                },
                {
                  key: 'group',
                  header: 'Nhóm nghiệp vụ',
                  width: 210,
                  render: row => (
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-ink-2">{row.groupBadge}</div>
                      <div className="text-2xs text-ink-3">
                        {row.inBrandWorkingFile ? 'Có trong 32 cột gửi Brand' : 'Cột nội bộ / Nghiệm thu'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'support',
                  header: `Nhân viên hỗ trợ (${fieldPolicyDraft.editableFieldsByRole.SUPPORT.length}/47)`,
                  width: 190,
                  align: 'center',
                  render: row => {
                    const checked = fieldPolicyDraft.editableFieldsByRole.SUPPORT.includes(row.key);
                    return (
                      <label className="inline-flex items-center justify-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleFieldForRole('SUPPORT', row.key)}
                          className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0"
                        />
                        <span className={`text-xs font-medium ${checked ? 'text-ink' : 'text-ink-3'}`}>
                          {checked ? 'Được sửa' : 'Chỉ xem'}
                        </span>
                      </label>
                    );
                  },
                },
                {
                  key: 'pic',
                  header: `PIC Chính gian hàng (${fieldPolicyDraft.editableFieldsByRole.PRIMARY_PIC.length}/47)`,
                  width: 190,
                  align: 'center',
                  render: row => {
                    const checked = fieldPolicyDraft.editableFieldsByRole.PRIMARY_PIC.includes(row.key);
                    return (
                      <label className="inline-flex items-center justify-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleFieldForRole('PRIMARY_PIC', row.key)}
                          className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0"
                        />
                        <span className={`text-xs font-medium ${checked ? 'text-ink' : 'text-ink-3'}`}>
                          {checked ? 'Được sửa' : 'Chỉ xem'}
                        </span>
                      </label>
                    );
                  },
                },
                {
                  key: 'leader',
                  header: `Leader sơ duyệt (${fieldPolicyDraft.editableFieldsByRole.LEADER.length}/47)`,
                  width: 180,
                  align: 'center',
                  render: row => {
                    const checked = fieldPolicyDraft.editableFieldsByRole.LEADER.includes(row.key);
                    return (
                      <label className="inline-flex items-center justify-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleFieldForRole('LEADER', row.key)}
                          className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0"
                        />
                        <span className={`text-xs font-medium ${checked ? 'text-ink' : 'text-ink-3'}`}>
                          {checked ? 'Được sửa' : 'Chỉ xem'}
                        </span>
                      </label>
                    );
                  },
                },
                {
                  key: 'admin',
                  header: 'Quản trị viên (Admin)',
                  width: 150,
                  align: 'center',
                  render: () => <Status tone="positive">Toàn quyền</Status>,
                },
              ]}
            />

            <div className="p-4 border-t border-line bg-sunken/60 flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-ink-3 shrink-0" />
                <span>
                  <strong>{STAFF_SHEET_READONLY_SYSTEM_COLUMNS.length} cột công thức & định danh tự động</strong>{' '}
                  (<code>Mã dòng Row ID</code>, <code>ngay_dien</code>, <code>Tháng</code>, <code>nhan_su_dien</code>, <code>Store</code>, <code>Link kênh</code>, <code>Tệp Booking</code>, <code>Phí kèm thuế</code>, <code>Mã BO</code>, <code>ROI 30d</code>...) luôn được hệ thống khóa tự động để tránh nhân sự gõ đè hỏng công thức Google Sheet.
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={Save}
                onClick={handleSaveFieldPolicy}
              >
                Lưu phân quyền sửa trường
              </Button>
            </div>
          </Panel>
          </>
          )}

          {permissionSubView !== 'STAFF_FIELDS' && (
            <Panel
              title="Ma trận Áp dụng Tiện ích Apps Script theo từng Gian hàng / File Sheet của Brand"
              flush
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {storeMatrixDirty && <Status tone="warning">Có thay đổi chưa lưu</Status>}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Save}
                    disabled={savingAppsScriptOAuth}
                    onClick={() => void handleSaveAppsScriptOAuthConfig()}
                  >
                    {savingAppsScriptOAuth ? 'Đang lưu…' : 'Lưu Ma trận Apps Script'}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={RefreshCw}
                    disabled={
                      pushingAppsScriptBusy ||
                      filteredMatrixStores.filter(
                        d =>
                          Boolean(d.bookingSheetUrl.trim()) &&
                          getStoreMatrixConfig(d.storeId).applyAppsScript
                      ).length === 0
                    }
                    onClick={() =>
                      void handleDeployAppsScriptToTargets(
                        filteredMatrixStores
                          .filter(
                            d =>
                              Boolean(d.bookingSheetUrl.trim()) &&
                              getStoreMatrixConfig(d.storeId).applyAppsScript
                          )
                          .map(d => ({
                            storeId: d.storeId,
                            storeName: d.storeName,
                            sheetUrl: d.bookingSheetUrl,
                          }))
                      )
                    }
                  >
                    {pushingAppsScriptBusy
                      ? 'Đang cài đặt theo Ma trận…'
                      : `Cài đặt lên Sheet theo Ma trận (${
                          filteredMatrixStores.filter(
                            d =>
                              Boolean(d.bookingSheetUrl.trim()) &&
                              getStoreMatrixConfig(d.storeId).applyAppsScript
                          ).length
                        } gian hàng)`}
                  </Button>
                </div>
              }
            >
              <div className="p-4 sm:p-4 border-b border-line space-y-3">
                <FilterBar
                  search={{
                    value: matrixSearch,
                    onChange: setMatrixSearch,
                    placeholder: 'Tìm tên gian hàng, thương hiệu, PIC...',
                  }}
                  resultCount={filteredMatrixStores.length}
                  filters={
                    <>
                      <Select
                        value={matrixBrandFilter}
                        onChange={e => setMatrixBrandFilter(e.target.value)}
                        className="w-[185px]"
                      >
                        <option value="ALL">Tất cả Brand ({brandOptions.length})</option>
                        {brandOptions.map(b => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </Select>
                      <Select
                        value={matrixApplyFilter}
                        onChange={e =>
                          setMatrixApplyFilter(
                            e.target.value as 'ALL' | 'HAS_SHEET' | 'APPLY_ONLY' | 'DISABLED_ONLY'
                          )
                        }
                        className="w-[215px]"
                      >
                        <option value="ALL">Mọi gian hàng ({stats.total})</option>
                        <option value="HAS_SHEET">Chỉ gian hàng đã gắn Link Sheet</option>
                        <option value="APPLY_ONLY">Gian hàng Có áp dụng Apps Script</option>
                        <option value="DISABLED_ONLY">Gian hàng Không dùng Apps Script</option>
                      </Select>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleBatchSetFilteredStoresAppsScript(true)}
                      >
                        Bật Script cho {filteredMatrixStores.length} gian đang lọc
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleBatchSetFilteredStoresAppsScript(false)}
                      >
                        Tắt Script các gian đang lọc
                      </Button>
                    </>
                  }
                />

                {/* Thanh bật / tắt nhanh từng cột Tác vụ Apps Script trên các gian hàng đang lọc */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {appsScriptModules.map((mod, idx) => {
                    const activeCount = filteredMatrixStores.filter(st => {
                      const cfg = getStoreMatrixConfig(st.storeId);
                      return cfg.applyAppsScript && cfg.enabledModuleIds.includes(mod.id);
                    }).length;
                    return (
                      <div
                        key={mod.id}
                        className="rounded-md border border-line bg-sunken/70 p-2 space-y-2 text-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-semibold text-ink line-clamp-2" title={mod.name}>
                            {idx + 1}. {mod.name}
                          </div>
                          <div className="text-ink-3 truncate" title={mod.targetColumns}>
                            {mod.targetColumns}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-line">
                          <span className="font-medium text-ink-2">
                            {activeCount}/{filteredMatrixStores.length} gian
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleBatchToggleModuleColumnForFilteredStores(mod.id, true)
                              }
                              className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-accent-soft hover:text-accent"
                            >
                              Bật hết
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleBatchToggleModuleColumnForFilteredStores(mod.id, false)
                              }
                              className="rounded border border-line bg-surface px-2 py-0.5 hover:bg-sunken text-ink-3"
                            >
                              Tắt
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DataTable
                rowKey={r => r.storeId}
                rows={filteredMatrixStores}
                stickyLast
                columns={[
                  {
                    key: 'store',
                    header: 'Brand & Gian hàng',
                    width: 225,
                    render: row => {
                      const hasSheet = Boolean(row.bookingSheetUrl.trim());
                      const sheetId = extractSpreadsheetIdFromUrl(row.bookingSheetUrl);
                      const scriptMeta = sheetId ? appsScriptInstalledMap[sheetId] : undefined;
                      return (
                        <div className="space-y-1">
                          <div className="font-semibold text-ink">{row.storeName}</div>
                          <div className="flex flex-wrap items-center gap-1 text-2xs text-ink-3">
                            <span className="font-medium text-ink-2">{row.brandName}</span>
                            <span>·</span>
                            <ChannelTag channel={row.platform} />
                            {hasSheet ? (
                              <Status tone="positive">Có Sheet</Status>
                            ) : (
                              <Status tone="neutral">Chưa gắn Sheet</Status>
                            )}
                            {scriptMeta && <Status tone="info">Đã cài</Status>}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'applyAppsScript',
                    header: 'Áp dụng Apps Script?',
                    width: 165,
                    align: 'center',
                    render: row => {
                      const cfg = getStoreMatrixConfig(row.storeId);
                      return (
                        <label className="inline-flex items-center justify-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={cfg.applyAppsScript}
                            onChange={() => handleToggleStoreApplyAppsScript(row.storeId)}
                            className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0"
                          />
                          {cfg.applyAppsScript ? (
                            <Status tone="positive">Có áp dụng</Status>
                          ) : (
                            <Status tone="neutral">Không dùng</Status>
                          )}
                        </label>
                      );
                    },
                  },
                  ...appsScriptModules.map((mod, idx): Column<StoreStaffSheetDraft> => ({
                    key: `mod_${mod.id}`,
                    header: `${idx + 1}. ${
                      mod.name.length > 28 ? `${mod.name.slice(0, 28)}…` : mod.name
                    }`,
                    width: 155,
                    align: 'center',
                    render: row => {
                      const cfg = getStoreMatrixConfig(row.storeId);
                      const checked =
                        cfg.applyAppsScript && cfg.enabledModuleIds.includes(mod.id);
                      return (
                        <label
                          className={`inline-flex items-center justify-center gap-2 select-none ${
                            cfg.applyAppsScript
                              ? 'cursor-pointer'
                              : 'opacity-40 cursor-not-allowed'
                          }`}
                          title={`${mod.name}: ${mod.purpose}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!cfg.applyAppsScript}
                            checked={checked}
                            onChange={() =>
                              handleToggleStoreModuleInMatrix(row.storeId, mod.id)
                            }
                            className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0"
                          />
                          <span
                            className={`text-2xs font-medium ${
                              checked ? 'text-ink' : 'text-ink-3'
                            }`}
                          >
                            {checked ? 'Bật' : 'Tắt'}
                          </span>
                        </label>
                      );
                    },
                  })),
                  {
                    key: 'matrixAction',
                    header: 'Thao tác Sheet',
                    width: 170,
                    align: 'right',
                    render: row => {
                      const hasSheet = Boolean(row.bookingSheetUrl.trim());
                      const cfg = getStoreMatrixConfig(row.storeId);
                      if (!hasSheet) {
                        return <span className="text-2xs text-ink-3">Chưa có Link Sheet</span>;
                      }
                      return (
                        <Button
                          size="sm"
                          variant={cfg.applyAppsScript ? 'secondary' : 'ghost'}
                          disabled={pushingAppsScriptBusy}
                          onClick={() =>
                            void handleDeployAppsScriptToTargets([
                              {
                                storeId: row.storeId,
                                storeName: row.storeName,
                                sheetUrl: row.bookingSheetUrl,
                                applyAppsScript: cfg.applyAppsScript,
                                moduleIds: cfg.enabledModuleIds,
                              },
                            ])
                          }
                        >
                          {cfg.applyAppsScript
                            ? `Cài (${cfg.enabledModuleIds.length} script)`
                            : 'Tắt Script trên Sheet'}
                        </Button>
                      );
                    },
                  },
                ]}
              />
            </Panel>
          )}
        </div>
      )}

      {activeTab === 'BULK_PASTE' && (
        <Panel
          title="Dán nhanh danh sách Gian hàng & Link Google Sheet từ Excel / Sheet"
          actions={
            <Button
              size="sm"
              variant="primary"
              icon={CheckCircle2}
              disabled={saving || parsedBulkRows.filter(r => r.matchedStore).length === 0}
              onClick={() => void handleApplyAndSaveBulk()}
            >
              {saving
                ? 'Đang lưu…'
                : `Áp dụng & Lưu ${parsedBulkRows.filter(r => r.matchedStore).length} gian hàng khớp`}
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">
              Copy trực tiếp các cột từ file Excel hoặc Google Sheet và dán vào ô bên dưới. Hệ thống tự động nhận diện{' '}
              <strong>Tên gian hàng</strong>, <strong>Link Google Sheet</strong> (<code>docs.google.com/spreadsheets/...</code>),{' '}
              <strong>Tên Tab mặc định</strong> và <strong>Link Gian hàng trên sàn</strong>.
            </div>
            <Field label="Dữ liệu dán từ Excel / Google Sheet (mỗi gian hàng 1 dòng)">
              <Textarea
                rows={7}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={
                  'Baniphar_TikTok_E2E-S\thttps://docs.google.com/spreadsheets/d/1da2vnk...\tListing T10\thttps://www.tiktok.com/@baniphar\nZiaja_TikTok_E2E-S\thttps://docs.google.com/spreadsheets/d/1ZGumQl...\tBooking'
                }
              />
            </Field>

            {parsedBulkRows.length > 0 && (
              <div className="border border-line rounded-lg overflow-hidden">
                <DataTable columns={bulkColumns} rows={parsedBulkRows} rowKey={r => r.id} />
              </div>
            )}
          </div>
        </Panel>
      )}

      {activeTab === 'SERVICE_ACCOUNT' && (
        <div className="space-y-4">
          <Panel
            title="1. Cấu hình tài khoản kết nối Google Sheets API v4 (Service Account)"
            actions={
              <Button
                size="sm"
                variant="primary"
                icon={KeyRound}
                disabled={savingSa || !saJsonInput.trim()}
                onClick={() => void handleSaveServiceAccount()}
              >
                {savingSa ? 'Đang lưu…' : 'Lưu cấu hình Service Account'}
              </Button>
            }
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-sunken px-3 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-ink-2">Trạng thái máy chủ:</span>
                  {saConfigured ? (
                    <Status tone="positive">Đã kết nối Service Account</Status>
                  ) : (
                    <Status tone="warning">Chưa cấu hình Service Account</Status>
                  )}
                </div>
                {saEmail && (
                  <div className="text-ink-2">
                    Email cấp quyền trên Google Sheet:{' '}
                    <code className="rounded bg-surface px-2 py-0.5 font-mono text-ink border border-line">
                      {saEmail}
                    </code>
                  </div>
                )}
              </div>

              <Field label="Dán nội dung file JSON của Google Service Account (chứa client_email & private_key)">
                <Textarea
                  rows={5}
                  value={saJsonInput}
                  onChange={e => setSaJsonInput(e.target.value)}
                  placeholder={'{\n  "type": "service_account",\n  "client_email": "upbase-sheets-bot@project-id.iam.gserviceaccount.com",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n..."\n}'}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="2. Quản lý Danh mục Tiện ích Tự động hóa Google Sheet (Apps Script) & Tác dụng của từng Script"
            flush
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={handleResetDefaultModules}
                >
                  Khôi phục 7 Script mặc định
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPermissionSubView('APPSCRIPT_MATRIX');
                    setActiveTab('FIELD_PERMISSIONS');
                  }}
                >
                  Mở Ma trận theo Gian hàng
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={handleStartAddModule}
                >
                  Thêm Script mới
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Code2}
                  onClick={() => setShowRawCodePreview(prev => !prev)}
                >
                  {showRawCodePreview ? 'Ẩn mã gộp Code.gs' : 'Xem mã gộp Code.gs'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Save}
                  disabled={savingAppsScriptOAuth}
                  onClick={() => void handleSaveAppsScriptOAuthConfig()}
                >
                  {savingAppsScriptOAuth ? 'Đang lưu…' : 'Lưu Danh mục Script'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={RefreshCw}
                  disabled={pushingAppsScriptBusy || stats.withSheet === 0}
                  onClick={() =>
                    void handleDeployAppsScriptToTargets(
                      Object.values(drafts)
                        .filter(
                          d =>
                            Boolean(d.bookingSheetUrl.trim()) &&
                            getStoreMatrixConfig(d.storeId).applyAppsScript
                        )
                        .map(d => ({
                          storeId: d.storeId,
                          storeName: d.storeName,
                          sheetUrl: d.bookingSheetUrl,
                        }))
                    )
                  }
                >
                  {pushingAppsScriptBusy
                    ? 'Đang cài đặt Script…'
                    : `Cài đặt / Cập nhật Script theo Ma trận (${
                        Object.values(drafts).filter(
                          d =>
                            Boolean(d.bookingSheetUrl.trim()) &&
                            getStoreMatrixConfig(d.storeId).applyAppsScript
                        ).length
                      } gian hàng)`}
                </Button>
              </div>
            }
          >
            <div className="px-4 py-3 bg-sunken/70 border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-2">
                  Đang bật{' '}
                  <strong className="text-ink">
                    {appsScriptModules.filter(m => m.enabled).length}/{appsScriptModules.length}
                  </strong>{' '}
                  tác vụ tự động hóa trên Google Sheet
                </span>
                <span className="text-ink-3">·</span>
                <span className="text-ink-2">
                  Đã cài đặt lên{' '}
                  <strong className="text-ink">
                    {Object.keys(appsScriptInstalledMap).length}
                  </strong>{' '}
                  file Google Sheet của Brand
                </span>
              </div>
              <span className="text-2xs text-ink-3">
                Bấm <strong>Sửa tên / tác dụng / mã</strong> ở từng dòng để đổi tên Script, sửa mô tả tác dụng hoặc tùy chỉnh mã lệnh.
              </span>
            </div>

            <DataTable
              rowKey={m => m.id}
              rows={appsScriptModules}
              columns={[
                {
                  key: 'enabled',
                  header: 'Trạng thái',
                  width: 135,
                  render: m => (
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={m.enabled}
                        onChange={() => handleToggleModuleEnabled(m.id)}
                        className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0"
                      />
                      {m.enabled ? (
                        <Status tone="positive">Đang bật</Status>
                      ) : (
                        <Status tone="neutral">Đang tắt</Status>
                      )}
                    </label>
                  ),
                },
                {
                  key: 'name',
                  header: 'Tên tác vụ Apps Script',
                  width: 250,
                  render: m => (
                    <div className="space-y-1">
                      <div className="font-semibold text-ink leading-snug">{m.name}</div>
                      <div className="flex items-center gap-2 text-2xs text-ink-3">
                        <span className="font-mono">{m.id}</span>
                        <span>·</span>
                        <span>{m.isBuiltIn ? 'Mặc định UpBase' : 'Tùy chỉnh'}</span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'trigger',
                  header: 'Sự kiện & Cột tác động trên Sheet',
                  width: 230,
                  render: m => (
                    <div className="space-y-1">
                      <div>
                        <Status tone={m.triggerType === 'onEdit' ? 'info' : 'warning'}>
                          {m.triggerType === 'onEdit'
                            ? 'onEdit (Tự chạy khi sửa ô)'
                            : 'onOpen (Menu khi mở file)'}
                        </Status>
                      </div>
                      <div className="text-2xs font-medium text-ink-2">{m.targetColumns}</div>
                    </div>
                  ),
                },
                {
                  key: 'purpose',
                  header: 'Tác dụng thực tế trên Google Sheet của Brand',
                  render: m => (
                    <div className="text-xs text-ink-2 leading-relaxed">{m.purpose}</div>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Thao tác',
                  width: 185,
                  align: 'right',
                  render: m => (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Edit3}
                        onClick={() => handleStartEditModule(m)}
                      >
                        Sửa tên / tác dụng
                      </Button>
                      {!m.isBuiltIn && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => handleDeleteModule(m.id)}
                        >
                          Xóa
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />

            {showRawCodePreview && (
              <div className="p-4 border-t border-line bg-sunken/40 space-y-2">
                <Field label="Mã gộp Google Apps Script (Code.gs) tự động tổng hợp từ các tác vụ Đang bật ở bảng trên">
                  <Textarea
                    rows={12}
                    value={appsScriptCodeDraft}
                    onChange={e => setAppsScriptCodeDraft(e.target.value)}
                    className="font-mono text-2xs"
                  />
                </Field>
              </div>
            )}

            {appsScriptBatchResults.length > 0 && (
              <div className="p-4 border-t border-line bg-surface">
                <div className="rounded-lg border border-line overflow-hidden">
                  <div className="px-3 py-2 bg-sunken border-b border-line flex items-center justify-between text-xs font-semibold text-ink">
                    <span>
                      Kết quả cài đặt Apps Script vừa thực thi ({appsScriptBatchResults.length} gian hàng)
                    </span>
                    <div className="flex items-center gap-2">
                      <Status tone="positive">
                        {appsScriptBatchResults.filter(r => r.ok).length} thành công
                      </Status>
                      {appsScriptBatchResults.some(r => !r.ok) && (
                        <Status tone="critical">
                          {appsScriptBatchResults.filter(r => !r.ok).length} lỗi
                        </Status>
                      )}
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-line bg-surface text-xs">
                    {appsScriptBatchResults.map((res, idx) => (
                      <div
                        key={`${res.storeName}-${idx}`}
                        className="px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{res.storeName}</span>
                          {res.ok ? (
                            <Status tone="positive">
                              {res.mode === 'UPDATED' ? 'Đã cập nhật Script' : 'Đã cài mới Script'}
                            </Status>
                          ) : (
                            <Status tone="critical">Lỗi</Status>
                          )}
                        </div>
                        <div className="text-2xs text-ink-3 font-mono">
                          {res.ok ? `scriptId: ${res.scriptId}` : res.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="3. Cấu hình tài khoản Google OAuth2 để cài đặt Apps Script từ Web lên các File Sheet của Brand"
            actions={
              <Button
                size="sm"
                variant="primary"
                icon={Save}
                disabled={savingAppsScriptOAuth}
                onClick={() => void handleSaveAppsScriptOAuthConfig()}
              >
                {savingAppsScriptOAuth ? 'Đang xác thực & lưu…' : 'Lưu cấu hình OAuth2'}
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-sunken px-3 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-ink-2">Trạng thái kết nối Google Apps Script API:</span>
                  {appsScriptConfigured ? (
                    <Status tone="positive">Đã cấu hình OAuth2 (Sẵn sàng cài đặt Script)</Status>
                  ) : (
                    <Status tone="warning">Chưa cấu hình OAuth2 Refresh Token</Status>
                  )}
                </div>
                <div className="text-ink-2">
                  {appsScriptClientIdMasked ? (
                    <span>
                      Client ID đang lưu:{' '}
                      <code className="rounded bg-surface px-2 py-0.5 font-mono text-ink border border-line">
                        {appsScriptClientIdMasked}
                      </code>
                    </span>
                  ) : (
                    <span>
                      Đã cài Script cho{' '}
                      <strong className="text-ink">
                        {Object.keys(appsScriptInstalledMap).length}
                      </strong>{' '}
                      file Google Sheet
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-sunken/50 p-4 text-xs text-ink-2 space-y-2">
                <div className="font-semibold text-ink">
                  Hướng dẫn lấy 3 thông số OAuth2 một lần duy nhất (chỉ mất 2 phút):
                </div>
                <div>
                  <strong>Bước 1:</strong> Mở{' '}
                  <a
                    href="https://script.google.com/home/usersettings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-accent hover:underline"
                  >
                    script.google.com/home/usersettings
                  </a>{' '}
                  → Bật công tắc <strong>Google Apps Script API: ON</strong>.
                </div>
                <div>
                  <strong>Bước 2:</strong> Trong{' '}
                  <a
                    href="https://console.cloud.google.com/apis/library/script.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-accent hover:underline"
                  >
                    Google Cloud Console → Library
                  </a>
                  , bấm <strong>Enable</strong> cho <strong>Apps Script API</strong>. Sau đó vào{' '}
                  <strong>APIs &amp; Services → Credentials → Create Credentials → OAuth client ID</strong>{' '}
                  (chọn loại <em>Web application</em>), thêm <code>https://developers.google.com/oauthplayground</code> vào mục{' '}
                  <em>Authorized redirect URIs</em> để lấy <strong>Client ID</strong> và <strong>Client Secret</strong>.
                </div>
                <div>
                  <strong>Bước 3:</strong> Mở{' '}
                  <a
                    href="https://developers.google.com/oauthplayground"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-accent hover:underline"
                  >
                    Google OAuth2 Playground
                  </a>{' '}
                  → Bấm biểu tượng bánh răng góc phải trên, tích chọn{' '}
                  <em>Use your own OAuth credentials</em> và dán Client ID + Client Secret vào. Ở cột trái (Step 1), dán 2 quyền:{' '}
                  <code className="rounded bg-surface px-1 py-0.5 border border-line text-ink">
                    https://www.googleapis.com/auth/script.projects
                  </code>{' '}
                  và{' '}
                  <code className="rounded bg-surface px-1 py-0.5 border border-line text-ink">
                    https://www.googleapis.com/auth/spreadsheets
                  </code>{' '}
                  → bấm <strong>Authorize APIs</strong> → ở Step 2 bấm{' '}
                  <strong>Exchange authorization code for tokens</strong> để copy{' '}
                  <strong>Refresh token</strong> dán vào ô bên dưới.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="1. Google OAuth Client ID">
                  <Input
                    value={oauthClientIdInput}
                    onChange={e => setOauthClientIdInput(e.target.value)}
                    placeholder={appsScriptClientIdMasked || '123456789-abc...apps.googleusercontent.com'}
                  />
                </Field>
                <Field label="2. Google OAuth Client Secret">
                  <Input
                    type="password"
                    value={oauthClientSecretInput}
                    onChange={e => setOauthClientSecretInput(e.target.value)}
                    placeholder={appsScriptConfigured ? '•••••••• (Đã lưu — nhập mới nếu muốn đổi)' : 'GOCSPX-...'}
                  />
                </Field>
                <Field label="3. Google OAuth Refresh Token">
                  <Input
                    type="password"
                    value={oauthRefreshTokenInput}
                    onChange={e => setOauthRefreshTokenInput(e.target.value)}
                    placeholder={appsScriptConfigured ? '•••••••• (Đã lưu — nhập mới nếu muốn đổi)' : '1//04...'}
                  />
                </Field>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* Hộp thoại Sửa Tên, Tác dụng & Mã lệnh của từng Tác vụ Apps Script */}
      <Modal
        open={Boolean(editingModuleDraft)}
        onClose={() => {
          setEditingModuleDraft(null);
          setIsAddingNewModule(false);
        }}
        title={
          isAddingNewModule
            ? 'Thêm Tác vụ Google Apps Script mới'
            : `Chỉnh sửa Tác vụ Apps Script: ${editingModuleDraft?.name || ''}`
        }
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingModuleDraft(null);
                setIsAddingNewModule(false);
              }}
            >
              Hủy
            </Button>
            <Button variant="primary" icon={Save} onClick={handleSaveModuleEdit}>
              Áp dụng vào Danh mục Script
            </Button>
          </>
        }
      >
        {editingModuleDraft && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <Field label="Tên tác vụ Apps Script (Có thể đặt lại tên theo ý muốn)">
                  <Input
                    value={editingModuleDraft.name}
                    onChange={e =>
                      setEditingModuleDraft(prev =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                    placeholder="VD: Tự động nhảy ngày giờ khi Brand chọn Yes / No"
                  />
                </Field>
              </div>
              <div className="md:col-span-5">
                <Field label="Sự kiện kích hoạt trên Google Sheet">
                  <Select
                    value={editingModuleDraft.triggerType}
                    onChange={e =>
                      setEditingModuleDraft(prev =>
                        prev
                          ? {
                              ...prev,
                              triggerType: e.target.value === 'onOpen' ? 'onOpen' : 'onEdit',
                            }
                          : null
                      )
                    }
                  >
                    <option value="onEdit">onEdit — Tự chạy tức thì khi người dùng sửa ô</option>
                    <option value="onOpen">onOpen — Tạo thanh Menu khi mở file Sheet</option>
                  </Select>
                </Field>
              </div>
            </div>

            <Field label="Cột tác động trên Google Sheet (Giúp nhân sự dễ tra cứu)">
              <Input
                value={editingModuleDraft.targetColumns}
                onChange={e =>
                  setEditingModuleDraft(prev =>
                    prev ? { ...prev, targetColumns: e.target.value } : null
                  )
                }
                placeholder="VD: Brand chọn → TG Brand duyệt"
              />
            </Field>

            <Field label="Tác dụng thực tế của Script này trên Google Sheet">
              <Textarea
                rows={3}
                value={editingModuleDraft.purpose}
                onChange={e =>
                  setEditingModuleDraft(prev =>
                    prev ? { ...prev, purpose: e.target.value } : null
                  )
                }
                placeholder="Mô tả rõ tác dụng của Script khi Brand hoặc nhân sự thao tác trên Google Sheet..."
              />
            </Field>

            <Field label="Mã hàm xử lý Google Apps Script (JavaScript)">
              <Textarea
                rows={10}
                value={editingModuleDraft.codeBody}
                onChange={e =>
                  setEditingModuleDraft(prev =>
                    prev ? { ...prev, codeBody: e.target.value } : null
                  )
                }
                className="font-mono text-2xs"
              />
            </Field>
          </div>
        )}
      </Modal>

      <StoreSheetLinkModal
        target={editingDraft ? toSheetTarget(editingDraft) : null}
        brandSiblings={
          editingDraft
            ? Object.values(drafts)
                .filter(d => d.brandName.toLowerCase() === editingDraft.brandName.toLowerCase())
                .map(toSheetTarget)
            : []
        }
        saEmail={saEmail}
        onClose={() => setEditingStoreId(null)}
        onSaved={applySavedLinks}
        onNotify={onNotify}
      />
    </div>
  );
};
