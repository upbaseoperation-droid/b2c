'use client';

// Tab "Video kênh Brand & CTV": việc Self-channel theo gian, tổng quan tháng, hàng chờ duyệt, danh bạ CTV dùng chung, trao đổi.
// Toàn bộ số liệu đọc từ bảng Job lưu trên máy chủ (self-channel-board) và danh bạ CTV (/api/contributors).
import React, { useCallback, useState } from 'react';
import { Tabs } from '../ui';
import type { TabItem } from '../ui';
import { PartnerDiscussion } from '../PartnerDiscussion';
import { PlanSelfChannelBoard } from './PlanSelfChannelBoard';
import { CtvManagementView } from './CtvManagementView';
import {
  SelfChannelOverviewPanel,
  SelfChannelQueuePanel,
  type HubJob,
  type HubPlanSummary,
} from './self-channel/SelfChannelMonthPanels';
import { SelfChannelSettlementPanel } from './self-channel/SelfChannelSettlementPanel';
import { CtvPortalPanel } from './self-channel/CtvPortalPanel';
import type { CtvDirectoryAccess } from '../../lib/ctvDirectory';
import type { BrandDetail, Contributor, UserProfile } from '../../lib/types';
import { getVietnamDateYmd } from '../../lib/format';

export interface SelfChannelCtvHubViewProps {
  currentUser?: UserProfile;
  brands?: BrandDetail[];
  contributors?: Contributor[];
  onContributorCreated?: (ctv: Contributor) => void;
  onContributorUpdated?: (ctv: Contributor) => void;
  /** Quyền trên danh bạ CTV do máy chủ trả về */
  ctvAccess?: CtvDirectoryAccess;
  /** Mở sẵn hồ sơ CTV này (điều hướng từ màn khác) */
  focusCtvId?: string | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type HubTab = 'WORK' | 'OVERVIEW' | 'QUEUE' | 'SETTLEMENT' | 'CONTRIBUTORS' | 'DISCUSSION';

const NO_CONTRIBUTORS: Contributor[] = [];

export const SelfChannelCtvHubView: React.FC<SelfChannelCtvHubViewProps> = ({
  currentUser,
  contributors = NO_CONTRIBUTORS,
  onContributorCreated,
  onContributorUpdated,
  ctvAccess,
  focusCtvId,
  onNotify,
}) => {
  const isCtvPartner = currentUser?.role === 'CTV_PARTNER';
  const [activeTab, setActiveTab] = useState<HubTab>(isCtvPartner ? 'DISCUSSION' : focusCtvId ? 'CONTRIBUTORS' : 'WORK');

  // Mở hồ sơ CTV khi được điều hướng từ màn khác
  const [focusedCtvId, setFocusedCtvId] = useState<string | null>(focusCtvId ?? null);
  const [syncedFocusCtvId, setSyncedFocusCtvId] = useState(focusCtvId);
  if (focusCtvId !== syncedFocusCtvId) {
    setSyncedFocusCtvId(focusCtvId);
    if (focusCtvId) {
      setFocusedCtvId(focusCtvId);
      setActiveTab('CONTRIBUTORS');
    }
  }

  // Bấm "Mở" ở Tổng quan / Hàng chờ duyệt: chuyển sang Việc theo gian đúng kế hoạch
  const [planFocus, setPlanFocus] = useState<{ planId: string; nonce: number } | null>(null);
  const openPlan = (planId: string) => {
    setPlanFocus({ planId, nonce: Date.now() });
    setActiveTab('WORK');
  };

  // Việc Self-channel của mọi kế hoạch người dùng được xem (tải khi mở Tổng quan / Hàng chờ duyệt)
  const [hubData, setHubData] = useState<{ jobs: HubJob[]; plans: HubPlanSummary[] }>({ jobs: [], plans: [] });
  const [hubLoading, setHubLoading] = useState(false);
  const loadHub = useCallback(async () => {
    setHubLoading(true);
    try {
      const res = await fetch('/api/self-channel-board?all=1', { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as { jobs?: HubJob[]; plans?: HubPlanSummary[]; error?: string };
      if (!res.ok) {
        onNotify?.(body.error || 'Không tải được việc Self-channel.', 'error');
        return;
      }
      setHubData({ jobs: body.jobs || [], plans: body.plans || [] });
    } catch {
      onNotify?.('Lỗi mạng khi tải việc Self-channel.', 'error');
    } finally {
      setHubLoading(false);
    }
  }, [onNotify]);

  // Tải lại số liệu mỗi lần mở Tổng quan / Hàng chờ duyệt
  const selectTab = (tab: HubTab) => {
    setActiveTab(tab);
    if (tab === 'OVERVIEW' || tab === 'QUEUE') void loadHub();
  };

  if (isCtvPartner) {
    return (
      <div className="space-y-4">
        <CtvPortalPanel onNotify={onNotify} />
        <PartnerDiscussion family="CTV" root={`ctv:${currentUser?.linkedEntityId || 'unassigned'}`} actorId={currentUser?.id || 'guest'} />
      </div>
    );
  }

  const tabs: TabItem<HubTab>[] = [
    { key: 'WORK', label: 'Việc theo gian' },
    { key: 'OVERVIEW', label: 'Tổng quan tháng' },
    { key: 'QUEUE', label: 'Hàng chờ duyệt' },
    { key: 'SETTLEMENT', label: 'Quyết toán' },
    { key: 'CONTRIBUTORS', label: 'Danh bạ CTV', count: contributors.length || undefined },
    { key: 'DISCUSSION', label: 'Trao đổi' },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onChange={selectTab} items={tabs} />

      {activeTab === 'WORK' && (
        <PlanSelfChannelBoard
          contributors={contributors}
          currentUserName={currentUser?.name}
          onNotify={onNotify}
          focus={planFocus}
          onOpenSettlement={() => setActiveTab('SETTLEMENT')}
        />
      )}

      {activeTab === 'OVERVIEW' && (
        <SelfChannelOverviewPanel plans={hubData.plans} jobs={hubData.jobs} loading={hubLoading} onOpenPlan={openPlan} />
      )}

      {activeTab === 'QUEUE' && (
        <SelfChannelQueuePanel jobs={hubData.jobs} loading={hubLoading} today={getVietnamDateYmd()} onOpenPlan={openPlan} />
      )}

      {activeTab === 'SETTLEMENT' && <SelfChannelSettlementPanel onNotify={onNotify} />}

      {activeTab === 'CONTRIBUTORS' && (
        // Danh bạ CTV dùng chung lưu trên máy chủ (Partnership quản lý; người khác chỉ xem)
        <CtvManagementView
          contributors={contributors}
          currentUser={currentUser}
          selectedCtvId={focusedCtvId}
          canEdit={ctvAccess?.canEdit}
          onContributorCreated={onContributorCreated}
          onContributorUpdated={onContributorUpdated}
          onOpenSelfChannelHub={() => setActiveTab('WORK')}
          onNotify={onNotify}
        />
      )}

      {activeTab === 'DISCUSSION' && <PartnerDiscussion family="CTV" actorId={currentUser?.id || 'guest'} />}
    </div>
  );
};
