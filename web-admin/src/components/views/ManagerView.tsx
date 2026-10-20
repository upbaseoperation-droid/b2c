'use client';

import React, { useState } from 'react';
import {
  BookingDealItem,
  MonthlyStaffAllocation,
  StaffDetailedPlanItem,
  StaffPlanStatus,
  UserProfile,
  BrandDetail,
  StorePortfolioItem,
  SlaTask,
  GrowthDemandItem,
} from '../../lib/types';
import {
  INITIAL_BRANDS,
  INITIAL_STORE_PORTFOLIOS,
  INITIAL_TASKS,
  STAFF_MASTER_DIRECTORY,
} from '../../lib/mockData';
import { ManagerDelegationHub } from './ManagerDelegationHub';

interface ManagerViewProps {
  deals: BookingDealItem[];
  currentUser?: UserProfile;
  onPingStaffNotification?: (staffName: string, taskTitle: string) => void;
  planItems?: StaffDetailedPlanItem[];
  onUpdatePlanItemStatus?: (itemId: string, newStatus: StaffPlanStatus, leadNotes?: string) => void;
  onApproveEntirePlan?: (staffName: string, managerFeedback: string) => void;
  onRequestPlanRevision?: (staffName: string, managerFeedback: string) => void;
  onGenerateDealsFromPlan?: (demand: GrowthDemandItem) => void;
  onConvertPlanToDeals?: (staffName: string) => void;
  staffAllocationsByMonth?: Record<string, MonthlyStaffAllocation[]>;
  onUpdateStaffAllocation?: (month: string, updatedList: MonthlyStaffAllocation[]) => void;
  onOpenInputPlan?: () => void;
  brands?: BrandDetail[];
  onUpdateBrand?: (brand: BrandDetail) => void;
  onAddBrand?: (brand: BrandDetail) => void;
  storePortfolios?: StorePortfolioItem[];
  onUpdateStore?: (store: StorePortfolioItem) => void;
  tasks?: SlaTask[];
  onAddTask?: (task: SlaTask) => void;
  onNavigateToTab?: (tabKey: string) => void;
}

export const ManagerView: React.FC<ManagerViewProps> = ({
  currentUser,
  onPingStaffNotification,
  brands: externalBrands,
  onUpdateBrand: externalOnUpdateBrand,
  onAddBrand: externalOnAddBrand,
  storePortfolios: externalStorePortfolios,
  onUpdateStore: externalOnUpdateStore,
  tasks: externalTasks,
  onAddTask: externalOnAddTask,
  onNavigateToTab,
}) => {
  const [internalBrands, setInternalBrands] = useState<BrandDetail[]>(externalBrands || INITIAL_BRANDS);
  const [internalStores, setInternalStores] = useState<StorePortfolioItem[]>(
    externalStorePortfolios || INITIAL_STORE_PORTFOLIOS
  );
  const [internalTasks, setInternalTasks] = useState<SlaTask[]>(externalTasks || INITIAL_TASKS);

  const currentBrands = externalBrands || internalBrands;
  const currentStores = externalStorePortfolios || internalStores;
  const currentTasks = externalTasks || internalTasks;

  const handleUpdateBrand = (b: BrandDetail) => {
    setInternalBrands((prev) => prev.map((item) => (item.id === b.id ? b : item)));
    if (externalOnUpdateBrand) externalOnUpdateBrand(b);
  };

  const handleAddBrand = (b: BrandDetail) => {
    setInternalBrands((prev) => [b, ...prev]);
    if (externalOnAddBrand) externalOnAddBrand(b);
  };

  const handleUpdateStore = (s: StorePortfolioItem) => {
    setInternalStores((prev) => prev.map((item) => (item.id === s.id ? s : item)));
    if (externalOnUpdateStore) externalOnUpdateStore(s);
  };

  const handleAddTask = (t: SlaTask) => {
    setInternalTasks((prev) => [t, ...prev]);
    if (externalOnAddTask) externalOnAddTask(t);
  };

  return (
    <ManagerDelegationHub
      currentUser={
        currentUser || {
          id: 'user-yen-nhi',
          name: 'Đặng Thị Yến Nhi',
          email: 'nhidty@upbase.vn',
          role: 'MANAGER',
          roleTitle: 'Giám Đốc Marketing B2C',
          avatar: 'YN',
        }
      }
      brands={currentBrands}
      onUpdateBrand={handleUpdateBrand}
      onAddBrand={handleAddBrand}
      storePortfolios={currentStores}
      onUpdateStore={handleUpdateStore}
      staffList={STAFF_MASTER_DIRECTORY}
      tasks={currentTasks}
      onAddTask={handleAddTask}
      onPingStaff={onPingStaffNotification}
      onNavigateToDashboard={onNavigateToTab}
      onNotify={(msg) => {
        if (onPingStaffNotification) {
          onPingStaffNotification('Trưởng Phòng', msg);
        }
      }}
    />
  );
};
