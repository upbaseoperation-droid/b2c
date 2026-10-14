'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Shield, RotateCcw, X } from 'lucide-react';
import { StaffMasterMember, SystemDepartmentScope } from '../../../lib/types';
import {
  classifyMasterStaffMember,
  getSavedDeptAccessRules,
  getSavedStaffAccessOverrides
} from '../../../lib/rbacData';
import { Status } from '../../ui';

interface StaffMasterViewProps {
  initialStaff: StaffMasterMember[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const PAGE_SIZE = 25;

const SCOPE_LABELS: Record<SystemDepartmentScope, string> = {
  MARKETING_B2C: 'Khối Marketing B2C',
  GROWTH: 'Khối Growth',
  MEDIA: 'Khối Media',
  OTHER_BLOCKED: 'Phòng ban khác',
};

export const StaffMasterView: React.FC<StaffMasterViewProps> = ({
  initialStaff,
}) => {
  const [staffList] = useState<StaffMasterMember[]>(initialStaff);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [page, setPage] = useState(1);

  const enrichedStaff = useMemo(() => {
    const rules = getSavedDeptAccessRules();
    const overrides = getSavedStaffAccessOverrides();
    return staffList.map(s => {
      const info = classifyMasterStaffMember(s, rules, overrides);
      return {
        ...s,
        ...info,
        classifiedScope: info.departmentScope,
      };
    });
  }, [staffList]);

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach(s => {
      if (s.department) set.add(s.department.trim());
    });
    return Array.from(set).sort();
  }, [staffList]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return enrichedStaff.filter(s => {
      if (selectedLocation !== 'ALL' && s.location !== selectedLocation) return false;
      if (selectedScope === 'ALLOWED_LOGIN' && !s.canLogin) return false;
      if (selectedScope === 'BLOCKED_LOGIN' && s.canLogin) return false;
      if (
        ['MARKETING_B2C', 'GROWTH', 'MEDIA', 'OTHER_BLOCKED'].includes(selectedScope) &&
        s.classifiedScope !== selectedScope
      ) {
        return false;
      }
      if (selectedDept !== 'ALL' && s.department !== selectedDept) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.staffCode && s.staffCode.toLowerCase().includes(q)) ||
          s.email.toLowerCase().includes(q) ||
          (s.position && s.position.toLowerCase().includes(q)) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.team && s.team.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [enrichedStaff, selectedLocation, selectedScope, selectedDept, search]);

  const isStaffFiltered = search.trim() !== '' || selectedLocation !== 'ALL' || selectedScope !== 'ALL' || selectedDept !== 'ALL';

  const handleResetStaffFilters = () => {
    setSearch('');
    setSelectedLocation('ALL');
    setSelectedScope('ALL');
    setSelectedDept('ALL');
    setPage(1);
  };

  const totalPages = Math.ceil(filteredStaff.length / PAGE_SIZE) || 1;
  const currentStaff = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStaff.slice(start, start + PAGE_SIZE);
  }, [filteredStaff, page]);

  // KPI stats
  const hnCount = enrichedStaff.filter(s => s.location === 'HN').length;
  const hcmCount = enrichedStaff.filter(s => s.location === 'HCM').length;
  const allowedCount = enrichedStaff.filter(s => s.canLogin).length;
  const blockedCount = enrichedStaff.filter(s => !s.canLogin).length;
  const mktCount = enrichedStaff.filter(s => s.classifiedScope === 'MARKETING_B2C').length;
  const growthCount = enrichedStaff.filter(s => s.classifiedScope === 'GROWTH').length;
  const mediaCount = enrichedStaff.filter(s => s.classifiedScope === 'MEDIA').length;

  return (
    <div className="space-y-3">
      {/* Action & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã NV, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:border-ink bg-surface"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={selectedScope}
            onChange={(e) => {
              setSelectedScope(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink font-medium focus:outline-none focus:border-ink"
          >
            <option value="ALL">Mọi khối & quyền đăng nhập ({enrichedStaff.length})</option>
            <option value="ALLOWED_LOGIN">Được phép đăng nhập ({allowedCount})</option>
            <option value="BLOCKED_LOGIN">Đang chặn đăng nhập ({blockedCount})</option>
            <option value="MARKETING_B2C">Khối Marketing B2C ({mktCount})</option>
            <option value="GROWTH">Khối Growth ({growthCount})</option>
            <option value="MEDIA">Khối Media ({mediaCount})</option>
            <option value="OTHER_BLOCKED">Phòng ban khác ({blockedCount})</option>
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none focus:border-ink"
          >
            <option value="ALL">Mọi khu vực ({staffList.length})</option>
            <option value="HN">Hà Nội ({hnCount})</option>
            <option value="HCM">TP. Hồ Chí Minh ({hcmCount})</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none focus:border-ink"
          >
            <option value="ALL">Mọi phòng ban ({departments.length})</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {isStaffFiltered && (
            <button
              type="button"
              onClick={handleResetStaffFilters}
              className="py-1 px-2 rounded-lg border border-line bg-canvas text-ink-2 hover:text-ink text-xs font-medium transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <div className="text-xs text-ink-3 flex items-center gap-1.5 shrink-0">
          <Shield className="w-3.5 h-3.5 text-positive" />
          <span>{allowedCount} nhân sự được phép Login / {enrichedStaff.length} tổng số</span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs">
            <tr>
              <th className="py-3 px-4 w-[100px]">Mã NV</th>
              <th className="py-3 px-4 min-w-[190px]">Họ và tên nhân sự</th>
              <th className="py-3 px-4 w-[210px]">Email công ty</th>
              <th className="py-3 px-4 w-[150px]">Phòng ban / Team</th>
              <th className="py-3 px-4 min-w-[150px]">Vị trí chức danh</th>
              <th className="py-3 px-4 w-[150px]">Khối hệ thống</th>
              <th className="py-3 px-4 w-[150px]">Quản lý trực tiếp</th>
              <th className="py-3 px-4 text-center w-[125px]">Cổng đăng nhập</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {currentStaff.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-ink-3">
                  Không tìm thấy nhân sự phù hợp với điều kiện lọc
                </td>
              </tr>
            ) : (
              currentStaff.map(s => (
                <tr key={s.id} className="hover:bg-canvas transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-code font-medium text-ink text-xs">
                      {s.staffCode || s.id}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink text-xs">
                      {s.name}
                    </div>
                    <div className="text-2xs text-ink-3">
                      {s.location || 'HN'} · {s.employmentType || 'Chính thức'}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-code text-ink-2 text-2xs">
                    {s.email}
                  </td>
                  <td className="py-3 px-4 text-ink-2">
                    <div className="font-medium text-ink">{s.department || 'Chưa phân phòng'}</div>
                    {s.team && s.team !== s.department && (
                      <div className="text-2xs text-ink-3">{s.team}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-ink-2">
                    {s.position || s.roleTitle || 'Nhân viên'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-ink-2">
                      {SCOPE_LABELS[s.classifiedScope]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-ink-2">
                    {s.canLogin ? s.managerName : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {s.canLogin ? (
                      <Status tone="positive">Được vào</Status>
                    ) : (
                      <Status tone="neutral">Chặn Login</Status>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-canvas border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-2">
          <div>
            Hiển thị <span className="font-semibold text-ink">{Math.min(filteredStaff.length, (page - 1) * PAGE_SIZE + 1)}</span> - <span className="font-semibold text-ink">{Math.min(filteredStaff.length, page * PAGE_SIZE)}</span> trên tổng số <span className="font-semibold text-ink">{filteredStaff.length}</span> nhân sự
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-line bg-surface text-ink-2 hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-code font-medium text-ink">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-line bg-surface text-ink-2 hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

