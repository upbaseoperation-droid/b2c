'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
  Calendar,
  Layers,
  Store,
  FileCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  FileText,
  RotateCcw
} from 'lucide-react';
import type { AuditLogEntry, UserProfile, UserRole } from '../../lib/types';
import { INITIAL_AUDIT_LOGS } from '../../lib/enterpriseMasterConfig';
import { Button, EmptyState, Panel, Stat, StatRow } from '../ui';

interface AuditTrailViewProps {
  currentUser?: UserProfile | null;
  onNotify?: (msg: string) => void;
}

const ACTION_COLOR_MAP: Record<AuditLogEntry['action'], { label: string; tone: string; border: string }> = {
  CREATE: { label: 'Tạo mới', tone: 'bg-positive-soft text-positive', border: 'border-positive/20' },
  UPDATE: { label: 'Cập nhật', tone: 'bg-accent-soft text-accent', border: 'border-accent/20' },
  APPROVE: { label: 'Phê duyệt', tone: 'bg-positive-soft text-positive', border: 'border-positive/30' },
  REJECT: { label: 'Từ chối', tone: 'bg-critical-soft text-critical', border: 'border-critical/30' },
  DELETE: { label: 'Xóa bỏ', tone: 'bg-critical-soft text-critical', border: 'border-critical/30' },
  REASSIGN: { label: 'Điều chuyển', tone: 'bg-warning-soft text-warning', border: 'border-warning/30' },
  SUBMIT: { label: 'Trình duyệt', tone: 'bg-accent-soft text-accent', border: 'border-accent/20' },
  ACTIVATE_BACKUP: { label: 'Kích hoạt Backup', tone: 'bg-warning-soft text-warning', border: 'border-warning/30' },
};

const ENTITY_LABEL_MAP: Record<AuditLogEntry['entityType'], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  PLAN: { label: 'Kế hoạch', icon: Calendar },
  STORE: { label: 'Gian hàng', icon: Store },
  DEAL: { label: 'Deal Booking', icon: Coins },
  CONTRACT: { label: 'Hợp đồng', icon: FileCheck },
  CAMPAIGN: { label: 'Chiến dịch', icon: Layers },
  STAFF: { label: 'Nhân sự', icon: UserCheck },
  BACKUP: { label: 'Dự phòng', icon: ShieldCheck },
};

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ currentUser, onNotify }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = logs.length;
    const approvals = logs.filter(l => l.action === 'APPROVE').length;
    const reassignments = logs.filter(l => l.action === 'REASSIGN' || l.action === 'ACTIVATE_BACKUP').length;
    const planDeals = logs.filter(l => l.entityType === 'PLAN' || l.entityType === 'DEAL').length;
    return { total, approvals, reassignments, planDeals };
  }, [logs]);

  // Bộ lọc dữ liệu
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedEntityType !== 'ALL' && log.entityType !== selectedEntityType) {
        return false;
      }
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = log.id.toLowerCase().includes(q);
        const matchEntityId = log.entityId.toLowerCase().includes(q);
        const matchEntityName = (log.entityName || '').toLowerCase().includes(q);
        const matchActor = log.actorName.toLowerCase().includes(q);
        const matchNote = (log.note || '').toLowerCase().includes(q);
        return matchId || matchEntityId || matchEntityName || matchActor || matchNote;
      }
      return true;
    });
  }, [logs, selectedEntityType, selectedAction, searchTerm]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      onNotify?.('Không có bản ghi nào để xuất file.');
      return;
    }
    const headers = ['Mã Audit', 'Thời gian', 'Đối tượng', 'Mã đối tượng', 'Tên đối tượng', 'Hành động', 'Người thực hiện', 'Vai trò', 'Ghi chú thay đổi'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.timestamp,
      l.entityType,
      l.entityId,
      `"${(l.entityName || '').replace(/"/g, '""')}"`,
      l.action,
      `"${l.actorName.replace(/"/g, '""')}"`,
      l.actorRole,
      `"${(l.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nhat_ky_kiem_toan_b2c_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất ${filteredLogs.length} bản ghi kiểm toán ra tệp CSV.`);
  };

  return (
    <div className="space-y-4">
      {/* 4 Chỉ số kiểm toán trọng yếu */}
      <StatRow>
        <Stat
          label="Tổng sự kiện kiểm toán"
          value={stats.total}
        />
        <Stat
          label="Lệnh duyệt chi & giải ngân"
          value={stats.approvals}
          tone="positive"
        />
        <Stat
          label="Điều chuyển & Kích hoạt Backup"
          value={stats.reassignments}
        />
        <Stat
          label="Sự kiện Kế hoạch & Booking"
          value={stats.planDeals}
        />
      </StatRow>

      {/* Bảng nhật ký kiểm toán */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-xs">
        {/* Toolbar lọc và tìm kiếm */}
        <div className="p-3.5 border-b border-line bg-canvas flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã audit, nhân sự, đối tượng, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand transition"
              />
            </div>

            {/* Filter Entity Type */}
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
            >
              <option value="ALL">Mọi đối tượng</option>
              <option value="PLAN">Kế hoạch (Plan)</option>
              <option value="STORE">Gian hàng (Store)</option>
              <option value="DEAL">Deal Booking (Deal)</option>
              <option value="CONTRACT">Hợp đồng (Contract)</option>
              <option value="BACKUP">Nhân sự dự phòng (Backup)</option>
              <option value="STAFF">Nhân sự (Staff)</option>
            </select>

            {/* Filter Action */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
            >
              <option value="ALL">Mọi hành động</option>
              <option value="APPROVE">Phê duyệt (APPROVE)</option>
              <option value="SUBMIT">Trình duyệt (SUBMIT)</option>
              <option value="CREATE">Tạo mới (CREATE)</option>
              <option value="UPDATE">Cập nhật (UPDATE)</option>
              <option value="ACTIVATE_BACKUP">Kích hoạt Backup (BACKUP)</option>
              <option value="REASSIGN">Điều chuyển (REASSIGN)</option>
              <option value="REJECT">Từ chối (REJECT)</option>
            </select>

            {(searchTerm || selectedEntityType !== 'ALL' || selectedAction !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedEntityType('ALL');
                  setSelectedAction('ALL');
                }}
                className="text-2xs text-ink-3 hover:text-ink flex items-center gap-1 px-2 py-1 rounded bg-sunken border border-line"
              >
                <RotateCcw className="w-3 h-3" />
                Đặt lại lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xs font-mono text-ink-3 tabular-nums">
              {filteredLogs.length} / {logs.length} sự kiện
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
            >
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* Bảng danh sách sự kiện */}
        {filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không tìm thấy sự kiện kiểm toán"
              description="Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc đối tượng và hành động."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs">
                <tr>
                  <th className="py-2.5 px-4 w-[110px]">Mã Audit</th>
                  <th className="py-2.5 px-4 w-[160px]">Thời gian</th>
                  <th className="py-2.5 px-4 w-[110px]">Hành động</th>
                  <th className="py-2.5 px-4 min-w-[180px]">Đối tượng tác động</th>
                  <th className="py-2.5 px-4 min-w-[160px]">Người thực hiện</th>
                  <th className="py-2.5 px-4 min-w-[300px]">Nội dung thay đổi chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredLogs.map((log) => {
                  const actionMeta = ACTION_COLOR_MAP[log.action] || {
                    label: log.action,
                    tone: 'text-ink-2',
                    border: '',
                  };
                  const entityMeta = ENTITY_LABEL_MAP[log.entityType];
                  const Icon = entityMeta?.icon || FileText;
                  const textTone =
                    log.action === 'APPROVE' || log.action === 'CREATE'
                      ? 'text-positive'
                      : log.action === 'REJECT' || log.action === 'DELETE'
                      ? 'text-critical'
                      : log.action === 'REASSIGN' || log.action === 'ACTIVATE_BACKUP'
                      ? 'text-warning'
                      : 'text-accent';

                  return (
                    <tr key={log.id} className="hover:bg-canvas transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-ink-2 text-2xs">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 font-mono text-2xs text-ink-3">
                        {log.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium ${textTone}`}>
                          {actionMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-ink">
                          <Icon className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                          <span>{log.entityName || log.entityId}</span>
                        </div>
                        <div className="text-2xs text-ink-3 font-mono mt-0.5">
                          {log.entityType} · {log.entityId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-2xs">
                        <strong className="text-ink font-semibold">{log.actorName}</strong>
                        <div className="text-2xs text-ink-3 font-mono">{log.actorRole}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-2">
                        <p className="line-clamp-2 leading-relaxed">{log.note || '—'}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
