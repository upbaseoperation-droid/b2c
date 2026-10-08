'use client';

import React, { useState, useMemo } from 'react';
import { Search, Users, MapPin, Briefcase, ChevronLeft, ChevronRight, UserCheck, Shield, Filter, RotateCcw, X } from 'lucide-react';
import { StaffMasterMember } from '../../../lib/types';

interface StaffMasterViewProps {
  initialStaff: StaffMasterMember[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const PAGE_SIZE = 25;

export const StaffMasterView: React.FC<StaffMasterViewProps> = ({
  initialStaff,
  onNotify
}) => {
  const [staffList, setStaffList] = useState<StaffMasterMember[]>(initialStaff);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [page, setPage] = useState(1);

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
    return staffList.filter(s => {
      if (selectedLocation !== 'ALL' && s.location !== selectedLocation) return false;
      if (selectedType !== 'ALL' && s.employmentType !== selectedType) return false;
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
  }, [staffList, selectedLocation, selectedType, selectedDept, search]);

  const isStaffFiltered = search.trim() !== '' || selectedLocation !== 'ALL' || selectedType !== 'ALL' || selectedDept !== 'ALL';

  const handleResetStaffFilters = () => {
    setSearch('');
    setSelectedLocation('ALL');
    setSelectedType('ALL');
    setSelectedDept('ALL');
    setPage(1);
  };

  const totalPages = Math.ceil(filteredStaff.length / PAGE_SIZE) || 1;
  const currentStaff = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStaff.slice(start, start + PAGE_SIZE);
  }, [filteredStaff, page]);

  // KPI stats
  const hnCount = staffList.filter(s => s.location === 'HN').length;
  const hcmCount = staffList.filter(s => s.location === 'HCM').length;
  const officialCount = staffList.filter(s => s.employmentType === 'Chính thức').length;
  const ctvCount = staffList.filter(s => s.employmentType && s.employmentType.includes('Cộng tác viên')).length;

  return (
    <div className="space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Tổng số nhân sự</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{staffList.length}</span>
            <span className="text-2xs text-slate-500">thành viên</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Đồng bộ từ Lark Base nhân sự Booking
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Khu vực Hà Nội (HN)</span>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-blue-600">{hnCount}</span>
            <span className="text-2xs text-slate-500">nhân sự</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Trụ sở chính & Vận hành Booking
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Khu vực TP.HCM</span>
            <MapPin className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-indigo-600">{hcmCount}</span>
            <span className="text-2xs text-slate-500">nhân sự</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Chi nhánh phía Nam & Livestream Hub
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Cơ cấu nhân sự</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-600">{officialCount}</span>
            <span className="text-2xs text-slate-500">Chính thức</span>
            <span className="text-2xs font-mono text-slate-400">/ {ctvCount} CTV</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Lực lượng chuyên viên & CTV linh hoạt
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã NV (HN..., HCM...), email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 bg-slate-50/50"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xác thực SSO Upbase Lark</span>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              1. Khu vực:
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi khu vực ({staffList.length})</option>
              <option value="HN">Hà Nội (HN) ({hnCount})</option>
              <option value="HCM">TP. Hồ Chí Minh (HCM) ({hcmCount})</option>
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              2. Loại hình nhân sự:
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi loại hình</option>
              <option value="Chính thức">Chính thức ({officialCount})</option>
              <option value="Cộng tác viên">Cộng tác viên ({ctvCount})</option>
              <option value="Thực tập sinh">Thực tập sinh</option>
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              3. Phòng ban:
            </label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi phòng ban ({departments.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {isStaffFiltered ? (
              <button
                type="button"
                onClick={handleResetStaffFilters}
                className="w-full py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            ) : (
              <div className="text-2xs text-slate-400 px-2 py-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Bộ lọc nhân sự</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Tìm thấy <strong className="text-slate-900 font-bold">{filteredStaff.length}</strong> / {staffList.length} nhân sự Lark Base
            </span>
            {isStaffFiltered && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-3xs">
                Đang lọc kết quả
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <span>Trang {page} / {totalPages}</span>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
            <tr>
              <th className="py-3 px-4 w-[110px]">Mã NV</th>
              <th className="py-3 px-4 min-w-[200px]">Họ và tên nhân sự</th>
              <th className="py-3 px-4 w-[220px]">Email công ty</th>
              <th className="py-3 px-4 text-center w-[90px]">Khu vực</th>
              <th className="py-3 px-4 text-center w-[120px]">Loại hình</th>
              <th className="py-3 px-4 w-[160px]">Phòng ban</th>
              <th className="py-3 px-4 min-w-[160px]">Vị trí chức danh</th>
              <th className="py-3 px-4 w-[130px]">Team</th>
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
              currentStaff.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 text-xs px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {s.staffCode || s.id}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 text-xs">
                      {s.name}
                    </div>
                    {s.gender && (
                      <div className="text-2xs text-slate-400">{s.gender}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 text-2xs">
                    {s.email}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                      s.location === 'HN'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {s.location || 'HN'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-2xs font-medium ${
                      s.employmentType === 'Chính thức'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : s.employmentType && s.employmentType.includes('Cộng tác')
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.employmentType || 'Chính thức'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {s.department || 'Booking'}
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-medium">
                    {s.position || s.roleTitle || 'Chuyên viên B2C'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-2xs">
                    {s.team || '—'}
                  </td>
                </tr>
              ))
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
