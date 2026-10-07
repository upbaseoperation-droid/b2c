'use client';

import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BadgeCheck,
  FileCheck
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  MonthlyPlanStatus, 
  PlanDiscussionMessage, 
  PlanDiscussionRole 
} from '../../lib/types';
import { PlanApprovalStepper } from './PlanApprovalStepper';
import { PlanDiscussionHub } from './PlanDiscussionHub';

interface PlanHistoryModalProps {
  plan: InputPlanBreakdownState | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (planId: string, msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>) => void;
  onStatusChange: (planId: string, newStatus: MonthlyPlanStatus, logMessage: string, note?: string) => void;
  onNotify?: (msg: string) => void;
}

export const PlanHistoryModal: React.FC<PlanHistoryModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSendMessage,
  onStatusChange,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'DISCUSSION' | 'APPROVAL_FLOW'>('DISCUSSION');
  const [currentRole, setCurrentRole] = useState<PlanDiscussionRole>('BOOKING');

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-50 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* MODAL HEADER */}
        <div className="bg-white p-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {plan.month} • {plan.week}
              </span>
              <span className="font-bold text-xs text-slate-700">
                {plan.brandName}
              </span>
              <span className="text-xs text-slate-400">• PIC: <strong className="text-slate-800">{plan.pic}</strong></span>
              <span className="text-xs text-slate-400">• Growth: <strong className="text-amber-800">{plan.growthPic || 'Growth Team'}</strong></span>
            </div>
            <h3 className="font-bold text-base text-slate-900 line-clamp-1">
              {plan.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QUICK METRICS BAR */}
        <div className="bg-white px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-600">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              <span>Ngân sách: <strong className="text-slate-900">{(plan.totalTargetBudget / 1000000).toLocaleString('vi-VN')} Tr đ</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>GMV mục tiêu: <strong className="text-emerald-700">{(plan.targetGmv / 1000000000).toFixed(2)} Tỷ đ</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-slate-400">Chỉ tiêu:</span>
              <strong className="text-slate-900">{plan.totalTargetContents} nội dung</strong>
            </div>
          </div>

          {/* TABS SELECTOR */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('DISCUSSION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'DISCUSSION'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Lịch Sử Trao Đổi ({plan.discussions?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('APPROVAL_FLOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'APPROVAL_FLOW'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tiến Trình & Thẩm Định</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'APPROVAL_FLOW' ? (
            <PlanApprovalStepper
              plan={plan}
              currentRole={currentRole}
              onRoleChange={setCurrentRole}
              onStatusChange={(newStatus, log, note) => onStatusChange(plan.id, newStatus, log, note)}
              onNotify={onNotify}
            />
          ) : (
            <div className="space-y-4">
              <PlanApprovalStepper
                plan={plan}
                currentRole={currentRole}
                onRoleChange={setCurrentRole}
                onStatusChange={(newStatus, log, note) => onStatusChange(plan.id, newStatus, log, note)}
                onNotify={onNotify}
              />
              <PlanDiscussionHub
                plan={plan}
                currentRole={currentRole}
                onSendMessage={(msg) => onSendMessage(plan.id, msg)}
                onNotify={onNotify}
              />
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Dữ liệu trao đổi và quyết định duyệt được đồng bộ theo thời gian thực.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
