'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Shield, RotateCcw, X, CheckCircle2, Lock } from 'lucide-react';
import { StaffMasterMember, SystemDepartmentScope } from '../../../lib/types';
import {
  classifyMasterStaffMember,
  getSavedDeptAccessRules,
  getSavedStaffAccessOverrides
} from '../../../lib/rbacData';

interface StaffMasterViewProps {
  initialStaff: StaffMasterMember[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const PAGE_SIZE = 25;

const SCOPE_BADGE: Record<SystemDepartmentScope, { label: string; className: string }> = {
  MARKETING_B2C: {
    label: 'Khối Marketing B2C',
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  GROWTH: {
    label: 'Khối Growth',
    className: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  MEDIA: {
    label: 'Khối Media',
    className: 'bg-purple-50 text-purple-800 border-purple-200'
  },
  OTHER_BLOCKED: {
    label: 'Phòng ban khác',
    className: 'bg-slate-100 text-slate-500 border-slate-200'
  }
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
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã NV, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-slate-800 bg-white"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:border-slate-800"
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
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
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
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
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
              className="py-1 px-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>{allowedCount} nhân sự được phép Login / {enrichedStaff.length} tổng số</span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
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
          <tbody className="divide-y divide-slate-100">
            {currentStaff.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Không tìm thấy nhân sự phù hợp với điều kiện lọc
                </td>
              </tr>
            ) : (
              currentStaff.map(s => {
                const badge = SCOPE_BADGE[s.classifiedScope];
                return (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-slate-900 text-xs px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {s.staffCode || s.id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs">
                        {s.name}
                      </div>
                      <div className="text-2xs text-slate-400">
                        {s.location || 'HN'} · {s.employmentType || 'Chính thức'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-2xs">
                      {s.email}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium">{s.department || 'Chưa phân phòng'}</div>
                      {s.team && s.team !== s.department && (
                        <div className="text-2xs text-slate-400">{s.team}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {s.position || s.roleTitle || 'Nhân viên'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-2xs font-semibold border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-2xs text-slate-700 font-medium">
                      {s.canLogin ? s.managerName : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.canLogin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Được vào</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Chặn Login</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Hiển thị <span className="font-semibold text-slate-900">{Math.min(filteredStaff.length, (page - 1) * PAGE_SIZE + 1)}</span> - <span className="font-semibold text-slate-900">{Math.min(filteredStaff.length, page * PAGE_SIZE)}</span> trên tổng số <span className="font-semibold text-slate-900">{filteredStaff.length}</span> nhân sự
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono font-medium text-slate-800">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

