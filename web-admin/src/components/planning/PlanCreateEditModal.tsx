'use client';

import React from 'react';
import {
  BrandAvatar,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageActions,
  Select,
  Status,
  Textarea,
} from '../ui';
import {
  ChevronLeft,
  Database,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatVndShort } from '../../lib/format';
import { KEY_VISUAL_CATEGORY_LABEL } from '../brands/brandUi';
import { PlanOrderUploadModal } from '../views/PlanOrderUploadModal';
import { PlanHistoryModal } from '../views/PlanHistoryModal';
import { BrandOneSheetPlanView } from '../views/BrandOneSheetPlanView';
import {
  getCampaignPhaseForMonth,
  isCampaignActiveInMonth,
  type BrandMonthlyPlanItem,
  type CampaignItem,
  type InputPlanBreakdownState,
  type KeyVisualAssetCategory,
  type KeyVisualAssetItem,
  type LarkbaseBookingPlanRecordItem,
  type MonthlyPlanStatus,
  type PlanDiscussionMessage,
  type StorePortfolioItem,
  type UserProfile,
} from '../../lib/types';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export type StrategyPreset = 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE';

function normStoreSlug(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

export const getStatusBadge = (status?: MonthlyPlanStatus) => {
  switch (status) {
    case 'PENDING_PRE_APPROVAL':
      return <Status tone="warning">Chờ sơ duyệt</Status>;
    case 'PRE_APPROVED':
      return <Status tone="positive">Sơ duyệt đạt</Status>;
    case 'REVISION_REQUESTED':
      return <Status tone="critical">Cần sửa</Status>;
    case 'PENDING_APPROVAL':
      return <Status tone="warning">Chờ duyệt Lead</Status>;
    case 'LEAD_APPROVED':
    case 'BRAND_APPROVED':
    case 'APPROVED':
      return <Status tone="positive">Đã duyệt</Status>;
    case 'IN_EXECUTION':
      return <Status tone="info">Đang chạy</Status>;
    case 'COMPLETED':
      return <Status tone="positive">Hoàn tất</Status>;
    case 'DRAFT':
    default:
      return <Status tone="neutral">Nháp</Status>;
  }
};

export interface BrandStoreRollupEntry {
  stores: StorePortfolioItem[];
  storePlans: InputPlanBreakdownState[];
  storeBudget: number;
  storeGmv: number;
  storeVideos: number;
  affPaidQty: number;
  focQty: number;
  selfQty: number;
}

export interface BrandMonthlyPlanEditorProps {
  editingBrandPlan: BrandMonthlyPlanItem;
  setEditingBrandPlan: React.Dispatch<React.SetStateAction<BrandMonthlyPlanItem | null>>;
  brandStoreRollupMap: Map<string, BrandStoreRollupEntry>;
  selectedMonth: string;
  monthScopedBrandMonthlyPlans: BrandMonthlyPlanItem[];
  persistBrandMonthlyPlan: (updatedRaw: BrandMonthlyPlanItem) => void;
  syncBadge?: React.ReactNode;
  handleApproveBrandPlan: () => void;
  handleSaveBrandPlan: (closeAfter?: boolean) => void;
  onSelectPlan: (plan: InputPlanBreakdownState) => void;
  brandModalTab: 'ONE_SHEET' | 'POSITIONS';
  setBrandModalTab: React.Dispatch<React.SetStateAction<'ONE_SHEET' | 'POSITIONS'>>;
  plans: InputPlanBreakdownState[];
  storePortfolios?: StorePortfolioItem[];
  effectiveCampaigns: CampaignItem[];
  currentUser?: UserProfile;
  onNotify?: (msg: string) => void;
  brandPositionStaffList: string[];
  posKvFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUploadPosKvFiles: (fileList: FileList | null) => Promise<void>;
  posKvUploadCategory: KeyVisualAssetCategory;
  setPosKvUploadCategory: React.Dispatch<React.SetStateAction<KeyVisualAssetCategory>>;
  uploadingPosKv: boolean;
  previewPosKvImg: KeyVisualAssetItem | null;
  setPreviewPosKvImg: React.Dispatch<React.SetStateAction<KeyVisualAssetItem | null>>;
}

export const BrandMonthlyPlanEditorView: React.FC<BrandMonthlyPlanEditorProps> = ({
  editingBrandPlan,
  setEditingBrandPlan,
  brandStoreRollupMap,
  selectedMonth,
  monthScopedBrandMonthlyPlans,
  persistBrandMonthlyPlan,
  syncBadge,
  handleApproveBrandPlan,
  handleSaveBrandPlan,
  onSelectPlan,
  brandModalTab,
  setBrandModalTab,
  plans,
  storePortfolios,
  effectiveCampaigns,
  currentUser,
  onNotify,
  brandPositionStaffList,
  posKvFileInputRef,
  handleUploadPosKvFiles,
  posKvUploadCategory,
  setPosKvUploadCategory,
  uploadingPosKv,
  previewPosKvImg,
  setPreviewPosKvImg,
}) => {
    const rollup = brandStoreRollupMap.get(editingBrandPlan.id);
    const rollupBudget =
      rollup && rollup.storeBudget > 0
        ? rollup.storeBudget
        : editingBrandPlan.planStrategyPlan.targetBrandBudget || 0;
    const rollupGmv =
      rollup && rollup.storeGmv > 0
        ? rollup.storeGmv
        : editingBrandPlan.planStrategyPlan.targetBrandGmv || 0;
    const currentKvImages =
      editingBrandPlan.oneSheetPlanData?.keyVisual?.kvImages ??
      editingBrandPlan.keyVisualSisPlan.kvImages ??
      [];
    const activeBrandMonth = selectedMonth === 'ALL' ? editingBrandPlan.month : selectedMonth;

    return (
      <div className="space-y-4 animate-in fade-in duration-200 pb-6">
        <div className="flex flex-wrap items-center gap-2 bg-surface border border-line rounded-lg px-3 py-2">
          <button
            type="button"
            onClick={() => {
              persistBrandMonthlyPlan(editingBrandPlan);
              setEditingBrandPlan(null);
            }}
            className="h-8 px-3 shrink-0 inline-flex items-center gap-1 rounded-lg bg-surface hover:bg-sunken border border-line text-ink text-xs font-semibold transition cursor-pointer"
            title="Quay lại danh sách Kế hoạch theo Brand"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Danh sách Brand</span>
          </button>

          <select
            value={editingBrandPlan.id}
            onChange={(e) => {
              const nextBrand = monthScopedBrandMonthlyPlans.find(bp => bp.id === e.target.value);
              if (nextBrand) {
                persistBrandMonthlyPlan(editingBrandPlan);
                setEditingBrandPlan(nextBrand);
              }
            }}
            className="h-8 px-3 rounded-lg bg-surface hover:bg-sunken border border-line font-semibold text-xs text-ink focus:outline-none cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
            title="Chuyển nhanh sang thương hiệu khác"
          >
            {monthScopedBrandMonthlyPlans.map(bp => (
              <option key={bp.id} value={bp.id}>
                {bp.brandName} · {activeBrandMonth}
              </option>
            ))}
          </select>

          <div className="hidden sm:inline-flex">{getStatusBadge(editingBrandPlan.status)}</div>
        </div>

        <PageActions>
          <div className="hidden xl:block">{syncBadge}</div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleApproveBrandPlan}
          >
            Duyệt kế hoạch Brand
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={() => handleSaveBrandPlan(false)}
          >
            Lưu kế hoạch Brand
          </Button>
        </PageActions>

        {/* Thanh tổng hợp Brand & chuyển góc nhìn Chi tiết */}
        <div className="p-4 sm:p-4 rounded-xl bg-surface border border-line shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  persistBrandMonthlyPlan(editingBrandPlan);
                  setEditingBrandPlan(null);
                }}
                className="h-9 px-3 rounded-lg bg-canvas hover:bg-sunken border border-line text-ink text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Quay lại</span>
              </button>
              <BrandAvatar brandName={editingBrandPlan.brandName} code={editingBrandPlan.brandCode} size={38} rounded="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-semibold text-ink truncate">
                    Kế hoạch Tháng theo Brand — {editingBrandPlan.brandName}
                  </h1>
                  <span className="px-2 py-0.5 rounded bg-sunken text-ink-2 text-2xs font-semibold">
                    Kỳ {activeBrandMonth}
                  </span>
                  {getStatusBadge(editingBrandPlan.status)}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2 mt-1">
                  <span className="inline-flex items-center gap-2 flex-wrap">
                    <span className="text-ink-3">Gian hàng:</span>
                    <strong className="text-ink font-semibold">{rollup?.stores.length || 1} gian</strong>
                    {(rollup?.storePlans || []).map(sp => {
                      const st = rollup?.stores.find(
                        s => s.id === sp.storeId || normStoreSlug(s.storeName) === normStoreSlug(sp.storeName)
                      );
                      const label = st?.platform || sp.storeName || 'Gian hàng';
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => {
                            persistBrandMonthlyPlan(editingBrandPlan);
                            setEditingBrandPlan(null);
                            onSelectPlan(sp);
                          }}
                          className="px-2 py-0.5 rounded bg-canvas hover:bg-accent-soft text-accent border border-line text-2xs font-semibold transition cursor-pointer"
                          title={`Mở bảng phân rã 4.1.1 của gian hàng ${sp.storeName || editingBrandPlan.brandName}`}
                        >
                          {label} (4.1.1) ↗
                        </button>
                      );
                    })}
                  </span>
                  <span>·</span>
                  <span>
                    <span className="text-ink-3 mr-1">Ngân sách Net:</span>
                    <strong className="text-ink font-semibold tabular-nums">
                      {rollupBudget > 0 ? formatVndShort(rollupBudget) : 'Chưa cấp'}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    <span className="text-ink-3 mr-1">GMV mục tiêu:</span>
                    <strong className="text-ink font-semibold tabular-nums">
                      {rollupGmv > 0 ? formatVndShort(rollupGmv) : '—'}
                    </strong>
                  </span>
                  {(rollup?.storeVideos || 0) > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        <span className="text-ink-3 mr-1">Sản lượng gian:</span>
                        <strong className="text-accent font-semibold tabular-nums">
                          {rollup?.storeVideos} video
                        </strong>
                        <span className="text-ink-3 ml-1">
                          ({rollup?.affPaidQty} KOC · {rollup?.focQty} FOC · {rollup?.selfQty} Kênh Brand)
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-lg border border-line bg-canvas p-0.5">
                <button
                  type="button"
                  onClick={() => setBrandModalTab('ONE_SHEET')}
                  className={cx(
                    'px-3 py-2 rounded-md text-xs font-semibold text-center transition cursor-pointer',
                    brandModalTab === 'ONE_SHEET'
                      ? 'bg-primary text-white'
                      : 'text-ink-2 hover:text-ink'
                  )}
                >
                  <span>1. Biểu mẫu Plan Brand (01 → 05)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrandModalTab('POSITIONS')}
                  className={cx(
                    'px-3 py-2 rounded-md text-xs font-semibold text-center transition cursor-pointer',
                    brandModalTab === 'POSITIONS'
                      ? 'bg-primary text-white'
                      : 'text-ink-2 hover:text-ink'
                  )}
                >
                  <span>2. Phân công 3 vị trí &amp; Chiến dịch</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {brandModalTab === 'ONE_SHEET' ? (
          <BrandOneSheetPlanView
            brandName={editingBrandPlan.brandName}
            month={activeBrandMonth}
            brandPlan={editingBrandPlan}
            storePlans={plans}
            storePortfolios={storePortfolios}
            campaigns={effectiveCampaigns}
            defaultEditMode={true}
            onChangeOneSheetData={(draftData) => {
              setEditingBrandPlan(prev =>
                prev
                  ? {
                      ...prev,
                      oneSheetPlanData: draftData,
                      keyVisualSisPlan: {
                        ...prev.keyVisualSisPlan,
                        kvImages: draftData.keyVisual?.kvImages ?? prev.keyVisualSisPlan.kvImages,
                      },
                    }
                  : null
              );
            }}
            onSaveOneSheetData={(newData) => {
              const nextItem: BrandMonthlyPlanItem = {
                ...editingBrandPlan,
                oneSheetPlanData: newData,
                keyVisualSisPlan: {
                  ...editingBrandPlan.keyVisualSisPlan,
                  kvImages: newData.keyVisual?.kvImages ?? editingBrandPlan.keyVisualSisPlan.kvImages,
                },
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || editingBrandPlan.planStrategyPic,
              };
              persistBrandMonthlyPlan(nextItem);
              setEditingBrandPlan(nextItem);
              if (onNotify) {
                onNotify(`Đã lưu Biểu mẫu Plan Brand cho ${editingBrandPlan.brandName} (${editingBrandPlan.month}).`);
              }
            }}
            onNotify={onNotify}
          />
        ) : (
          <div className="space-y-4 text-xs">
            {/* 0. Liên kết Thực thể Chiến dịch (Campaign) trong kỳ */}
            <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-ink text-xs block">
                    Chế độ Chiến dịch (Campaign) của Brand {editingBrandPlan.brandName} kỳ {editingBrandPlan.month}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-lg border border-line bg-canvas p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const matched = effectiveCampaigns.find(
                        c =>
                          isCampaignActiveInMonth(c, editingBrandPlan.month) &&
                          c.brand.toLowerCase().includes(editingBrandPlan.brandName.toLowerCase())
                      );
                      const phase = matched ? getCampaignPhaseForMonth(matched, editingBrandPlan.month) : undefined;
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              hasCampaign: true,
                              campaignId: matched?.id || prev.campaignId,
                              campaignCode: matched?.code || prev.campaignCode || `CAMP-${prev.brandCode}`,
                              campaignTitle: matched?.title || prev.campaignTitle || `Chiến dịch ${prev.brandName} kỳ ${prev.month}`,
                              campaignPhaseName: phase?.phaseName || prev.campaignPhaseName || `Giai đoạn thực thi ${prev.month}`,
                            }
                          : prev
                      );
                    }}
                    className={cx(
                      'px-3 py-1 rounded-md text-2xs font-semibold transition cursor-pointer',
                      editingBrandPlan.hasCampaign
                        ? 'bg-accent text-white'
                        : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    Có Chiến dịch (Campaign)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              hasCampaign: false,
                              campaignId: undefined,
                              campaignCode: undefined,
                              campaignTitle: undefined,
                              campaignPhaseName: undefined,
                            }
                          : prev
                      )
                    }
                    className={cx(
                      'px-3 py-1 rounded-md text-2xs font-semibold transition cursor-pointer',
                      !editingBrandPlan.hasCampaign
                        ? 'bg-ink text-white'
                        : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    Không có Campaign (Duy trì)
                  </button>
                </div>
              </div>

              {editingBrandPlan.hasCampaign && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <Field label="Chọn Chiến dịch (1–3 tháng)">
                    <Select
                      value={editingBrandPlan.campaignId || ''}
                      onChange={(e) => {
                        const camp = effectiveCampaigns.find(c => c.id === e.target.value);
                        if (!camp) return;
                        const phase = getCampaignPhaseForMonth(camp, editingBrandPlan.month);
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                hasCampaign: true,
                                campaignId: camp.id,
                                campaignCode: camp.code,
                                campaignTitle: camp.title,
                                campaignPhaseName: phase?.phaseName || `Giai đoạn ${prev.month}`,
                                planStrategyPlan: {
                                  ...prev.planStrategyPlan,
                                  bigIdeaAndKeyMessage: `${camp.bigIdea} — ${camp.keyMessage}`,
                                  targetBrandBudget: phase?.allocatedBudget || camp.budget || prev.planStrategyPlan.targetBrandBudget,
                                },
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  designTheme: camp.keyVisualSpec
                                    ? `${camp.keyVisualSpec.theme} | Moodboard: ${camp.keyVisualSpec.moodboard}`
                                    : prev.keyVisualSisPlan.designTheme,
                                },
                              }
                            : prev
                        );
                      }}
                    >
                      <option value="">-- Chọn hoặc giữ nguyên Campaign --</option>
                      {effectiveCampaigns.map(c => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.brand} — {c.title} ({(c.coveredMonths || []).join(', ')})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Tên Chiến dịch">
                    <Input
                      value={editingBrandPlan.campaignTitle || ''}
                      onChange={(e) =>
                        setEditingBrandPlan(prev => (prev ? { ...prev, campaignTitle: e.target.value } : prev))
                      }
                      placeholder="Tên chiến dịch..."
                    />
                  </Field>
                  <Field label="Giai đoạn (Phase) trong tháng">
                    <Input
                      value={editingBrandPlan.campaignPhaseName || ''}
                      onChange={(e) =>
                        setEditingBrandPlan(prev => (prev ? { ...prev, campaignPhaseName: e.target.value } : prev))
                      }
                      placeholder="VD: Giai đoạn 2 (10/2026): Tăng tốc..."
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* 1. Phân bổ nhân sự cho 3 vị trí gắn theo Brand */}
            <div className="p-4 rounded-xl bg-warning-soft/50 border border-warning/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-warning text-xs">
                  Phân bổ nhân sự phụ trách 3 vị trí gắn theo Brand ({editingBrandPlan.brandName})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">
                    1. Content / Brand main
                  </label>
                  <Select
                    value={editingBrandPlan.contentBrandMainPic}
                    onChange={(e) =>
                      setEditingBrandPlan(prev => (prev ? { ...prev, contentBrandMainPic: e.target.value } : prev))
                    }
                  >
                    {brandPositionStaffList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">
                    2. Plan / Strategy
                  </label>
                  <Select
                    value={editingBrandPlan.planStrategyPic}
                    onChange={(e) =>
                      setEditingBrandPlan(prev => (prev ? { ...prev, planStrategyPic: e.target.value } : prev))
                    }
                  >
                    {brandPositionStaffList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">
                    3. Key Visual / SIS
                  </label>
                  <Select
                    value={editingBrandPlan.keyVisualSisPic}
                    onChange={(e) =>
                      setEditingBrandPlan(prev => (prev ? { ...prev, keyVisualSisPic: e.target.value } : prev))
                    }
                  >
                    {brandPositionStaffList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. Nhập chỉ tiêu đầu việc cho từng vị trí */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-warning/30 bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-warning">1. Content / Brand main</span>
                  <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.contentBrandMainPic}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Field label="Master Plan">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.contentBrandMainPlan.masterContentPlanCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                contentBrandMainPlan: {
                                  ...prev.contentBrandMainPlan,
                                  masterContentPlanCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Số Pillars">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.contentBrandMainPlan.contentPillarsCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                contentBrandMainPlan: {
                                  ...prev.contentBrandMainPlan,
                                  contentPillarsCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Kịch bản Hero">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.contentBrandMainPlan.heroScriptsTarget}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                contentBrandMainPlan: {
                                  ...prev.contentBrandMainPlan,
                                  heroScriptsTarget: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Tuyến nội dung & Góc tiếp cận chủ đạo">
                  <Textarea
                    rows={3}
                    value={editingBrandPlan.contentBrandMainPlan.focusPillars}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              contentBrandMainPlan: {
                                ...prev.contentBrandMainPlan,
                                focusPillars: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>

                <Field label="Ghi chú thực thi Content / Brand main">
                  <Textarea
                    rows={3}
                    value={editingBrandPlan.contentBrandMainPlan.notes}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              contentBrandMainPlan: {
                                ...prev.contentBrandMainPlan,
                                notes: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              </div>

              <div className="p-4 rounded-xl border border-accent/30 bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-accent-hover">2. Plan / Strategy</span>
                  <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.planStrategyPic}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Số bản Strategy">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.planStrategyPlan.campaignStrategyCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                planStrategyPlan: {
                                  ...prev.planStrategyPlan,
                                  campaignStrategyCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Báo cáo Audit">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.planStrategyPlan.brandAuditCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                planStrategyPlan: {
                                  ...prev.planStrategyPlan,
                                  brandAuditCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Big Idea & Thông điệp trọng tâm tháng">
                  <Textarea
                    rows={3}
                    value={editingBrandPlan.planStrategyPlan.bigIdeaAndKeyMessage}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              planStrategyPlan: {
                                ...prev.planStrategyPlan,
                                bigIdeaAndKeyMessage: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>

                <Field label="Ghi chú hoạch định Plan / Strategy">
                  <Textarea
                    rows={3}
                    value={editingBrandPlan.planStrategyPlan.notes}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              planStrategyPlan: {
                                ...prev.planStrategyPlan,
                                notes: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              </div>

              <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-ink">3. Key Visual / SIS</span>
                  <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.keyVisualSisPic}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Field label="Bộ Key Visual">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.keyVisualSisPlan.kvDirectionCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  kvDirectionCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Bộ SIS/Banner">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.keyVisualSisPlan.sisBannerPackageCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  sisBannerPackageCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Bộ PDP/SEO">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.keyVisualSisPlan.pdpSeoProductCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  pdpSeoProductCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Chủ đề Key Visual & Trang trí SIS/PDP tháng">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.keyVisualSisPlan.designTheme}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              keyVisualSisPlan: {
                                ...prev.keyVisualSisPlan,
                                designTheme: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>

                <Field label="Ghi chú thực thi Key Visual / SIS">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.keyVisualSisPlan.notes}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              keyVisualSisPlan: {
                                ...prev.keyVisualSisPlan,
                                notes: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>

                {/* Tải ảnh Key Visual / SIS trực tiếp tại thẻ vị trí số 3 */}
                <div className="pt-2 border-t border-line space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ink text-xs inline-flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-accent" />
                      <span>Ảnh Key Visual ({currentKvImages.length})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        ref={posKvFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => void handleUploadPosKvFiles(e.target.files)}
                      />
                      <select
                        value={posKvUploadCategory}
                        onChange={(e) => setPosKvUploadCategory(e.target.value as KeyVisualAssetCategory)}
                        className="h-7 px-2 rounded-lg border border-line bg-canvas text-ink text-2xs font-medium"
                      >
                        <option value="MASTER_KV">Master KV</option>
                        <option value="SIS_BANNER">SIS / Banner</option>
                        <option value="PDP_FRAME">Khung PDP / SEO</option>
                        <option value="MOODBOARD">Moodboard / Ref</option>
                      </select>
                      <button
                        type="button"
                        disabled={uploadingPosKv}
                        onClick={() => posKvFileInputRef.current?.click()}
                        className="h-7 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        {uploadingPosKv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>Tải ảnh lên</span>
                      </button>
                    </div>
                  </div>

                  {currentKvImages.length === 0 ? (
                    <div
                      onClick={() => !uploadingPosKv && posKvFileInputRef.current?.click()}
                      className="border border-dashed border-line hover:border-accent rounded-lg p-3 text-center cursor-pointer bg-canvas/50 text-2xs text-ink-3"
                    >
                      Chưa có ảnh KV — Bấm để tải ảnh Master KV, Banner SIS, Khung PDP lên
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {currentKvImages.map((imgItem, imgIdx) => (
                        <div
                          key={imgItem.id}
                          className="rounded-lg border border-line bg-canvas overflow-hidden flex flex-col justify-between"
                        >
                          <div
                            onClick={() => setPreviewPosKvImg(imgItem)}
                            className="relative aspect-[16/10] bg-sunken cursor-pointer overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgItem.url}
                              alt={imgItem.fileName}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-ink/75 text-white text-2xs font-semibold">
                              {KEY_VISUAL_CATEGORY_LABEL[imgItem.category || 'MASTER_KV']}
                            </span>
                          </div>
                          <div className="p-2 flex items-center justify-between gap-1 text-2xs">
                            <span className="truncate font-medium text-ink" title={imgItem.fileName}>
                              {imgItem.fileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBrandPlan(prev => {
                                  if (!prev) return prev;
                                  const nextImgs = currentKvImages.filter((_, i) => i !== imgIdx);
                                  const nextItem: BrandMonthlyPlanItem = {
                                    ...prev,
                                    keyVisualSisPlan: {
                                      ...prev.keyVisualSisPlan,
                                      kvImages: nextImgs,
                                    },
                                    oneSheetPlanData: prev.oneSheetPlanData
                                      ? {
                                          ...prev.oneSheetPlanData,
                                          keyVisual: {
                                            ...prev.oneSheetPlanData.keyVisual,
                                            kvImages: nextImgs,
                                          },
                                        }
                                      : undefined,
                                  };
                                  persistBrandMonthlyPlan(nextItem);
                                  return nextItem;
                                });
                              }}
                              className="text-critical hover:text-critical shrink-0 cursor-pointer"
                              title="Xóa ảnh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thanh thao tác cuối màn hình chi tiết */}
        <div className="p-4 rounded-xl bg-surface border border-line flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <Button
            variant="ghost"
            onClick={() => {
              persistBrandMonthlyPlan(editingBrandPlan);
              setEditingBrandPlan(null);
            }}
          >
            Quay lại danh sách Brand
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={handleApproveBrandPlan}>
              Duyệt kế hoạch Brand
            </Button>
            <Button variant="primary" icon={Save} onClick={() => handleSaveBrandPlan(false)}>
              Lưu kế hoạch Brand
            </Button>
          </div>
        </div>

        <Modal
          open={!!previewPosKvImg}
          onClose={() => setPreviewPosKvImg(null)}
          title={previewPosKvImg ? `${KEY_VISUAL_CATEGORY_LABEL[previewPosKvImg.category || 'MASTER_KV']} — ${previewPosKvImg.fileName}` : 'Xem ảnh Key Visual'}
          size="lg"
        >
          {previewPosKvImg && (
            <div className="rounded-xl overflow-hidden bg-ink/5 border border-line flex items-center justify-center max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPosKvImg.url}
                alt={previewPosKvImg.fileName}
                className="max-w-full max-h-[72vh] object-contain"
              />
            </div>
          )}
        </Modal>
      </div>
    );
};

export interface PlanCreateEditModalProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateSubmit: (e: React.FormEvent) => void;
  newPlanMonth: string;
  handleMonthChange: (month: string) => void;
  newPlanWeek: string;
  setNewPlanWeek: React.Dispatch<React.SetStateAction<string>>;
  availableWeeks: Array<{ value: string; label: string }>;
  newPlanBrand: string;
  handleBrandChange: (brand: string) => void;
  availableBrands: Array<{ id: string; name: string }>;
  newPlanStoreId: string;
  handleStoreChange: (storeId: string) => void;
  brandStoresForNewPlan: StorePortfolioItem[];
  newPlanPic: string;
  setNewPlanPic: React.Dispatch<React.SetStateAction<string>>;
  availablePics: Array<{ name: string; title: string }>;
  newPlanTitle: string;
  setNewPlanTitle: React.Dispatch<React.SetStateAction<string>>;
  newPlanStoreName: string;
  newPlanBudget: number;
  setNewPlanBudget: React.Dispatch<React.SetStateAction<number>>;
  newPlanQty: number;
  setNewPlanQty: React.Dispatch<React.SetStateAction<number>>;
  newPlanGmv: number;
  setNewPlanGmv: React.Dispatch<React.SetStateAction<number>>;
  newPlanPreset: StrategyPreset;
  setNewPlanPreset: React.Dispatch<React.SetStateAction<StrategyPreset>>;
  newPlanNotes: string;
  setNewPlanNotes: React.Dispatch<React.SetStateAction<string>>;
  cloningPlan: InputPlanBreakdownState | null;
  setCloningPlan: React.Dispatch<React.SetStateAction<InputPlanBreakdownState | null>>;
  cloneTargetMonth: string;
  setCloneTargetMonth: React.Dispatch<React.SetStateAction<string>>;
  handleCloneSubmit: () => void;
  viewingHistoryPlan: InputPlanBreakdownState | null;
  historyModalTab: 'VERSION_HISTORY' | 'APPROVAL_FLOW' | 'DISCUSSION';
  currentUser?: UserProfile;
  setHistoryPlanId: React.Dispatch<React.SetStateAction<string | null>>;
  onSendMessage?: (planId: string, msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>) => void;
  onUpdatePlanStatus?: (
    planId: string,
    newStatus: MonthlyPlanStatus,
    logMessage?: string,
    note?: string,
    patch?: Partial<InputPlanBreakdownState>
  ) => void;
  onUpdatePlan?: (planId: string, updated: Partial<InputPlanBreakdownState>) => void;
  onSelectPlan: (plan: InputPlanBreakdownState) => void;
  notify: (msg: string) => void;
  revisionTarget: { planId: string; storeName: string } | null;
  setRevisionTarget: React.Dispatch<
    React.SetStateAction<{ planId: string; storeName: string } | null>
  >;
  setInspectingStoreId: React.Dispatch<React.SetStateAction<string | null>>;
  onPlanOrderUploaded?: () => void;
  isPlanOrderUploadOpen: boolean;
  setIsPlanOrderUploadOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onNotify?: (msg: string) => void;
  isLarkbaseModalOpen: boolean;
  setIsLarkbaseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPullingLarkbase: boolean;
  handlePullApprovedFromLarkbase: () => Promise<void>;
  hasLiveLarkCredentials: boolean;
  larkbaseAppToken: string;
  setLarkbaseAppToken: React.Dispatch<React.SetStateAction<string>>;
  larkbaseTableId: string;
  setLarkbaseTableId: React.Dispatch<React.SetStateAction<string>>;
  larkbaseRecords: LarkbaseBookingPlanRecordItem[];
  isLoadingLarkbase: boolean;
  selectedMonth: string;
  larkbaseConvertedPlans: InputPlanBreakdownState[];
  onImportLarkbasePlans?: (importedPlans: InputPlanBreakdownState[]) => void;
}

export const PlanCreateEditModal: React.FC<PlanCreateEditModalProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
  handleCreateSubmit,
  newPlanMonth,
  handleMonthChange,
  newPlanWeek,
  setNewPlanWeek,
  availableWeeks,
  newPlanBrand,
  handleBrandChange,
  availableBrands,
  newPlanStoreId,
  handleStoreChange,
  brandStoresForNewPlan,
  newPlanPic,
  setNewPlanPic,
  availablePics,
  newPlanTitle,
  setNewPlanTitle,
  newPlanStoreName,
  newPlanBudget,
  setNewPlanBudget,
  newPlanQty,
  setNewPlanQty,
  newPlanGmv,
  setNewPlanGmv,
  newPlanPreset,
  setNewPlanPreset,
  newPlanNotes,
  setNewPlanNotes,
  cloningPlan,
  setCloningPlan,
  cloneTargetMonth,
  setCloneTargetMonth,
  handleCloneSubmit,
  viewingHistoryPlan,
  historyModalTab,
  currentUser,
  setHistoryPlanId,
  onSendMessage,
  onUpdatePlanStatus,
  onUpdatePlan,
  onSelectPlan,
  notify,
  revisionTarget,
  setRevisionTarget,
  setInspectingStoreId,
  onPlanOrderUploaded,
  isPlanOrderUploadOpen,
  setIsPlanOrderUploadOpen,
  onNotify,
  isLarkbaseModalOpen,
  setIsLarkbaseModalOpen,
  isPullingLarkbase,
  handlePullApprovedFromLarkbase,
  hasLiveLarkCredentials,
  larkbaseAppToken,
  setLarkbaseAppToken,
  larkbaseTableId,
  setLarkbaseTableId,
  larkbaseRecords,
  isLoadingLarkbase,
  selectedMonth,
  larkbaseConvertedPlans,
  onImportLarkbasePlans,
}) => {
  return (
    <>
      {/* 3. MODAL: LẬP KẾ HOẠCH THÁNG MỚI */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Lập kế hoạch tháng mới"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit}>
              Tạo và mở phân rã
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Chu kỳ tháng:">
              <Select
                value={newPlanMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              >
                <option value="2026/10">Tháng 10/2026 (Hiện tại)</option>
                <option value="2026/11">Tháng 11/2026 (Sắp tới)</option>
                <option value="2026/12">Tháng 12/2026</option>
                <option value="2027/01">Tháng 01/2027</option>
                <option value="2026/09">Tháng 09/2026</option>
                <option value="2026/08">Tháng 08/2026</option>
              </Select>
            </Field>

            <Field label="Tuần áp dụng:">
              <Select
                value={newPlanWeek}
                onChange={(e) => setNewPlanWeek(e.target.value)}
              >
                {availableWeeks.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Thương hiệu:">
              <Select
                value={newPlanBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
              >
                {availableBrands.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Gian hàng áp dụng:">
              <Select
                value={newPlanStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
              >
                <option value="">Tất cả gian / Kế hoạch cấp Brand</option>
                {brandStoresForNewPlan.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.storeName} ({st.platform})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Chuyên viên B2C phụ trách:">
              <Select
                value={newPlanPic}
                onChange={(e) => setNewPlanPic(e.target.value)}
              >
                {availablePics.map(p => (
                  <option key={p.name} value={p.name}>{p.title}</option>
                ))}
              </Select>
            </Field>

            <Field label="Tiêu đề kế hoạch:">
              <Input
                type="text"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                placeholder={`VD: Kế hoạch B2C ${newPlanMonth} - ${newPlanStoreName || newPlanBrand}`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={`Ngân sách (${formatVndShort(newPlanBudget)}):`}>
              <Input
                type="number"
                step="5000000"
                value={newPlanBudget}
                onChange={(e) => setNewPlanBudget(Number(e.target.value))}
              />
            </Field>

            <Field label="Số lượng video:">
              <Input
                type="number"
                value={newPlanQty}
                onChange={(e) => setNewPlanQty(Number(e.target.value))}
              />
            </Field>

            <Field label={`Mục tiêu GMV (ROI ${(newPlanGmv / (newPlanBudget || 1)).toFixed(1)}x):`}>
              <Input
                type="number"
                step="10000000"
                value={newPlanGmv}
                onChange={(e) => setNewPlanGmv(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Định hướng phân bổ ngân sách:">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'BALANCED', label: 'Cân bằng các kênh' },
                { id: 'GMV_MAX', label: 'Tối đa GMV' },
                { id: 'MEGA_SALE', label: 'Siêu sale & Live' },
                { id: 'BRAND_PUSH', label: 'Phủ thương hiệu' },
                { id: 'COST_SAVER', label: 'Tiết kiệm chi phí' }
              ].map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setNewPlanPreset(p.id as StrategyPreset)}
                  className={cx(
                    'h-8 px-3 rounded-md text-xs border transition-colors text-center font-medium',
                    newPlanPreset === p.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-line text-ink-2 hover:bg-sunken'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Ghi chú định hướng:">
            <Textarea
              rows={2}
              value={newPlanNotes}
              onChange={(e) => setNewPlanNotes(e.target.value)}
              placeholder="Ghi chú trọng tâm sản phẩm hoặc chiến lược..."
            />
          </Field>
        </form>
      </Modal>

      {/* 4. MODAL: NHÂN BẢN KẾ HOẠCH SANG THÁNG TIẾP THEO */}
      {cloningPlan && (
        <Modal
          open={!!cloningPlan}
          onClose={() => setCloningPlan(null)}
          title="Nhân bản kế hoạch"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" onClick={() => setCloningPlan(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleCloneSubmit}>
                Xác nhận nhân bản
              </Button>
            </div>
          }
        >
          <Field label="Chọn chu kỳ tháng đích:">
            <Select
              value={cloneTargetMonth}
              onChange={(e) => setCloneTargetMonth(e.target.value)}
            >
              <option value="2026/11">Tháng 11/2026 (Sắp tới)</option>
              <option value="2026/12">Tháng 12/2026 (Cuối năm)</option>
              <option value="2027/01">Tháng 01/2027 (Tết Nguyên Đán)</option>
              <option value="2026/10">Tháng 10/2026</option>
            </Select>
          </Field>
        </Modal>
      )}

      {/* 5. MODAL QUẢN LÝ PHIÊN BẢN TRONG THÁNG, TIẾN TRÌNH DUYỆT & TRAO ĐỔI */}
      {viewingHistoryPlan && (
        <PlanHistoryModal
          plan={viewingHistoryPlan}
          isOpen={!!viewingHistoryPlan}
          initialTab={historyModalTab}
          currentUser={currentUser}
          onClose={() => setHistoryPlanId(null)}
          onSendMessage={(planId, msg) => {
            if (onSendMessage) {
              onSendMessage(planId, msg);
            }
          }}
          onStatusChange={(planId, newStatus, log, note) => {
            if (onUpdatePlanStatus) {
              onUpdatePlanStatus(planId, newStatus, log, note);
            }
          }}
          onUpdatePlan={(updated) => {
            if (onUpdatePlan) {
              onUpdatePlan(viewingHistoryPlan.id, updated);
            }
          }}
          onOpenPlanInStudio={(targetPlan) => {
            setHistoryPlanId(null);
            onSelectPlan(targetPlan);
          }}
          onNotify={notify}
        />
      )}

      {/* 6. YÊU CẦU SỬA KẾ HOẠCH: lý do bắt buộc (DESIGN_SYSTEM.md, quy tắc thao tác chung) */}
      <ConfirmDialog
        open={!!revisionTarget}
        title="Yêu cầu sửa kế hoạch"
        message={`Gian hàng "${revisionTarget?.storeName}": người lập kế hoạch sẽ nhận lý do bên dưới.`}
        confirmLabel="Yêu cầu sửa"
        tone="danger"
        reason={{ label: 'Lý do', placeholder: 'Nêu rõ cần sửa gì ở kế hoạch này', required: true }}
        onConfirm={(reasonText) => {
          if (!revisionTarget || !onUpdatePlanStatus) return;
          const reason = (reasonText || '').trim();
          onUpdatePlanStatus(
            revisionTarget.planId,
            'REVISION_REQUESTED',
            `Quản lý (${currentUser?.name || 'Lead'}) yêu cầu chỉnh sửa kế hoạch ${revisionTarget.storeName}: ${reason}`,
            reason
          );
          if (onUpdatePlan) onUpdatePlan(revisionTarget.planId, { isVersionLocked: false, revisionNotes: reason });
          notify(`Đã chuyển kế hoạch "${revisionTarget.storeName}" sang trạng thái Cần sửa.`);
          setRevisionTarget(null);
          setInspectingStoreId(null);
        }}
        onCancel={() => setRevisionTarget(null)}
      />

      {onPlanOrderUploaded && (
        <PlanOrderUploadModal
          open={isPlanOrderUploadOpen}
          onClose={() => setIsPlanOrderUploadOpen(false)}
          onUploaded={() => onPlanOrderUploaded()}
          onNotify={onNotify}
        />
      )}

      {/* 7. MODAL BẢNG HỨNG KẾ HOẠCH B2C BOOKING ĐÃ DUYỆT TỪ LARKBASE */}
      <Modal
        open={isLarkbaseModalOpen}
        onClose={() => setIsLarkbaseModalOpen(false)}
        title="Đồng bộ Kế hoạch B2C Booking từ Larkbase"
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setIsLarkbaseModalOpen(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                icon={RefreshCw}
                disabled={isPullingLarkbase}
                onClick={() => void handlePullApprovedFromLarkbase()}
              >
                {isPullingLarkbase ? 'Đang kéo kế hoạch từ Larkbase...' : 'Kéo kế hoạch đã duyệt về hệ thống'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Khối 1: Cấu hình kết nối API Bitable & Webhook Larkbase Automation */}
          <div className="rounded-lg border border-line bg-sunken/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-ink">
                  Cấu hình kết nối Larkbase Bitable API &amp; Webhook tự động
                </span>
                <span className="text-2xs text-ink-3">
                  · {hasLiveLarkCredentials
                    ? 'Đã cấu hình LARK_APP_ID / SECRET'
                    : 'Đang dùng bộ dữ liệu chuẩn (Chờ cấu hình .env)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Larkbase App Token (LARKBASE_PLAN_APP_TOKEN)">
                <Input
                  value={larkbaseAppToken}
                  onChange={e => setLarkbaseAppToken(e.target.value)}
                  placeholder="VD: bascnUpbaseB2CPlan41"
                />
              </Field>
              <Field label="Table ID Kế hoạch 4.1.1 (LARKBASE_PLAN_TABLE_ID)">
                <Input
                  value={larkbaseTableId}
                  onChange={e => setLarkbaseTableId(e.target.value)}
                  placeholder="VD: tblBookingInputPlan411"
                />
              </Field>
              <Field label="Webhook nhận tự động khi duyệt trên Larkbase">
                <Input
                  readOnly
                  value="POST /api/integrations/larkbase/booking-plans"
                />
              </Field>
            </div>
          </div>

          {/* Khối 2: Bảng hứng kế hoạch B2C Booking đã duyệt */}
          <div className="rounded-lg border border-line overflow-hidden bg-surface">
            <div className="px-4 py-3 border-b border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-ink">
                Danh sách bản ghi trong Bảng hứng Kế hoạch B2C Booking ({larkbaseRecords.length} bản ghi đã duyệt)
              </div>
            </div>

            {isLoadingLarkbase ? (
              <div className="p-8 text-center text-xs text-ink-3">
                Đang tải dữ liệu bảng hứng kế hoạch từ Larkbase...
              </div>
            ) : larkbaseRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-3">
                Chưa có bản ghi kế hoạch nào cho kỳ {selectedMonth}. Nhấn <strong>&ldquo;Kéo kế hoạch đã duyệt về hệ thống&rdquo;</strong> để đồng bộ từ Larkbase.
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-line">
                  {larkbaseRecords.map((rec, idx) => {
                    const convertedPlan = larkbaseConvertedPlans[idx];
                    return (
                      <div key={`m-lark-${rec.larkRecordId}`} className="p-3 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-ink">{rec.storeName}</div>
                            <div className="text-2xs text-ink-3">
                              {rec.brandName} • {rec.platform} • {rec.versionCode} ({rec.month})
                            </div>
                          </div>
                          <Status tone="positive">Đã duyệt</Status>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-canvas border border-line text-2xs">
                          <div>
                            <span className="text-ink-3 block">PIC / Cấp duyệt</span>
                            <span className="font-semibold text-ink">{rec.b2cPic}</span>
                          </div>
                          <div className="text-right tabular-nums">
                            <span className="text-ink-3 block">Net / GMV</span>
                            <span className="font-semibold text-positive">{formatVndShort(rec.budgetNet)}</span>
                            <span className="text-ink-3"> / {formatVndShort(rec.targetGmv)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-2xs text-ink-3">
                            KOC: {rec.affiliatePaidVideos} • FOC: {rec.focFreeVideos} • Self: {rec.selfChannelVideos}
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (convertedPlan) {
                                if (onImportLarkbasePlans) {
                                  onImportLarkbasePlans([convertedPlan]);
                                }
                                setIsLarkbaseModalOpen(false);
                                onSelectPlan(convertedPlan);
                                notify(`Đã nạp kế hoạch "${convertedPlan.storeName}" (${rec.versionCode}) từ bảng hứng Larkbase.`);
                              }
                            }}
                          >
                            Nạp &amp; Mở phân rã
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-sunken/60 text-2xs font-semibold text-ink-3">
                      <th className="py-3 px-3">Record Larkbase &amp; Phiên bản</th>
                      <th className="py-3 px-3">Gian hàng &amp; Brand</th>
                      <th className="py-3 px-3">Nhân sự B2C &amp; Cấp duyệt</th>
                      <th className="py-3 px-3 text-right">Hạn mức Net / Gross</th>
                      <th className="py-3 px-3">4 Đầu việc B2C</th>
                      <th className="py-3 px-3">Thông tin duyệt Lark</th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {larkbaseRecords.map((rec, idx) => {
                      const convertedPlan = larkbaseConvertedPlans[idx];
                      const tierSummary = Object.entries(rec.kocTierBreakdown || {})
                        .filter(([, count]) => count > 0)
                        .map(([k, count]) => `${k.toUpperCase()}: ${count}`)
                        .join(' • ');

                      return (
                        <tr key={rec.larkRecordId} className="hover:bg-sunken/30 transition-colors">
                          <td className="py-3 px-3 align-top">
                            <div className="font-mono text-2xs text-ink-2 font-semibold">
                              {rec.larkRecordId}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-2xs text-ink-2">
                              <span className="font-mono font-semibold text-ink">
                                {rec.versionCode}
                              </span>
                              <span>·</span>
                              <span className="font-medium">{rec.month}</span>
                            </div>
                            <div className="mt-0.5 text-2xs text-ink-3 line-clamp-1" title={rec.versionName}>
                              {rec.versionName}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="font-semibold text-ink">{rec.storeName}</div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              Brand: <span className="text-ink-2 font-medium">{rec.brandName}</span> • {rec.platform}
                            </div>
                            <div className="mt-0.5 text-2xs text-ink-3">
                              B2C phụ trách = 1
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="text-xs font-medium text-ink">
                              PIC: {rec.b2cPic}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {rec.bookingLeader ? (
                                <span>
                                  Leader sơ duyệt: <strong className="text-ink-2">{rec.bookingLeader}</strong>
                                </span>
                              ) : (
                                <span className="text-warning font-medium">
                                  Không qua Leader (Trình trực tiếp Lead B2C)
                                </span>
                              )}
                            </div>
                            {rec.focPic && (
                              <div className="text-2xs text-ink-3 mt-0.5">
                                PIC FOC 0đ: {rec.focPic}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 align-top text-right tabular-nums">
                            <div className="font-semibold text-positive">
                              Net: {formatVndShort(rec.budgetNet)}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              Gross: {formatVndShort(rec.budgetGross)}
                            </div>
                            <div className="text-2xs text-ink-2 mt-0.5">
                              GMV: {formatVndShort(rec.targetGmv)}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="space-y-1 text-2xs">
                              <div>
                                <span className="font-semibold text-ink">1. KOC trả phí:</span>{' '}
                                <span className="text-accent font-semibold">{rec.affiliatePaidVideos} video</span>{' '}
                                ({formatVndShort(rec.affiliatePaidBudgetNet)})
                                {tierSummary && (
                                  <div className="text-2xs text-ink-3 font-mono mt-0.5">{tierSummary}</div>
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-ink">2. Suất FOC 0đ:</span>{' '}
                                <span className="text-positive font-semibold">{rec.focFreeVideos} video</span> (0đ)
                              </div>
                              <div>
                                <span className="font-semibold text-ink">3. Kênh Brand:</span>{' '}
                                <span className="font-medium text-ink-2">{rec.selfChannelVideos} video</span>{' '}
                                ({formatVndShort(rec.selfChannelBudgetNet)})
                              </div>
                              <div>
                                <span className="font-semibold text-ink">4. Đa kênh &amp; Live:</span>{' '}
                                <span className="font-medium text-ink-2">
                                  {rec.multiPlatformVideos} video • {rec.liveSessions} phiên live
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <Status tone="positive">Đã duyệt</Status>
                            <div className="text-2xs text-ink-2 font-medium mt-1">
                              {rec.approvedBy}
                            </div>
                            <div className="text-2xs text-ink-3">
                              {new Date(rec.approvedAt).toLocaleString('vi-VN')}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                if (convertedPlan) {
                                  if (onImportLarkbasePlans) {
                                    onImportLarkbasePlans([convertedPlan]);
                                  }
                                  setIsLarkbaseModalOpen(false);
                                  onSelectPlan(convertedPlan);
                                  notify(`Đã nạp kế hoạch "${convertedPlan.storeName}" (${rec.versionCode}) từ bảng hứng Larkbase.`);
                                }
                              }}
                            >
                              Nạp &amp; Mở phân rã
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
