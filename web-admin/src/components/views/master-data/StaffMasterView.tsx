'use client';

/**
 * Danh sách nhân sự Upbase (Dữ liệu gốc).
 * Thiết kế chuẩn hóa theo Design System:
 * - Panel flush bao trọn FilterBar + Chips phân loại + DataTable + Pagination
 * - Phân loại theo Khối hệ thống và quyền Login RBAC
 * - Bộ lọc nhanh: Mã/Tên/Email, Khối, Khu vực (HN/HCM), Phòng ban
 */

import React, { useState, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { StaffMasterMember, SystemDepartmentScope } from '../../../lib/types';
import {
  classifyMasterStaffMember,
  getSavedDeptAccessRules,
  getSavedStaffAccessOverrides,
} from '../../../lib/rbacData';
import {
  Avatar,
  Button,
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  Pagination,
  Panel,
  Select,
  Status,
} from '../../ui';
import type { Column, ChipOption } from '../../ui';

export interface StaffMasterViewProps {
  initialStaff: StaffMasterMember[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type ScopeFilter =
  | 'ALL'
  | 'ALLOWED_LOGIN'
  | 'MARKETING_B2C'
  | 'GROWTH'
  | 'MEDIA'
  | 'BLOCKED_LOGIN';

const SCOPE_LABELS: Record<SystemDepartmentScope, string> = {
  MARKETING_B2C: 'Khối Marketing B2C',
  GROWTH: 'Khối Growth',
  MEDIA: 'Khối Media',
  OTHER_BLOCKED: 'Phòng ban khác',
};

type EnrichedStaff = Omit<StaffMasterMember, 'role'> &
  ReturnType<typeof classifyMasterStaffMember> & {
    classifiedScope: SystemDepartmentScope;
  };

export const StaffMasterView: React.FC<StaffMasterViewProps> = ({
  initialStaff,
}) => {
  const [staffList] = useState<StaffMasterMember[]>(initialStaff);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedScope, setSelectedScope] = useState<ScopeFilter>('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const enrichedStaff = useMemo<EnrichedStaff[]>(() => {
    const rules = getSavedDeptAccessRules();
    const overrides = getSavedStaffAccessOverrides();
    return staffList.map((s) => {
      const info = classifyMasterStaffMember(s, rules, overrides);
      return {
        ...s,
        ...info,
        classifiedScope: info.departmentScope,
      };
    });
  }, [staffList]);

  // Danh sách phòng ban duy nhất
  const departments = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.department) set.add(s.department.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [staffList]);

  // Bộ đếm thống kê
  const hnCount = useMemo(() => enrichedStaff.filter((s) => s.location === 'HN').length, [enrichedStaff]);
  const hcmCount = useMemo(() => enrichedStaff.filter((s) => s.location === 'HCM').length, [enrichedStaff]);
  const allowedCount = useMemo(() => enrichedStaff.filter((s) => s.canLogin).length, [enrichedStaff]);
  const blockedCount = useMemo(() => enrichedStaff.filter((s) => !s.canLogin).length, [enrichedStaff]);
  const mktCount = useMemo(() => enrichedStaff.filter((s) => s.classifiedScope === 'MARKETING_B2C').length, [enrichedStaff]);
  const growthCount = useMemo(() => enrichedStaff.filter((s) => s.classifiedScope === 'GROWTH').length, [enrichedStaff]);
  const mediaCount = useMemo(() => enrichedStaff.filter((s) => s.classifiedScope === 'MEDIA').length, [enrichedStaff]);

  // Lọc danh sách nhân sự
  const filteredStaff = useMemo(() => {
    return enrichedStaff.filter((s) => {
      if (selectedLocation !== 'ALL' && s.location !== selectedLocation) return false;
      if (selectedScope === 'ALLOWED_LOGIN' && !s.canLogin) return false;
      if (selectedScope === 'BLOCKED_LOGIN' && s.canLogin) return false;
      if (
        ['MARKETING_B2C', 'GROWTH', 'MEDIA'].includes(selectedScope) &&
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

  const isStaffFiltered =
    search.trim() !== '' ||
    selectedLocation !== 'ALL' ||
    selectedScope !== 'ALL' ||
    selectedDept !== 'ALL';

  const handleResetStaffFilters = () => {
    setSearch('');
    setSelectedLocation('ALL');
    setSelectedScope('ALL');
    setSelectedDept('ALL');
    setPage(1);
  };

  const currentStaff = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, page, pageSize]);

  // Chips lọc nhanh Khối & Quyền
  const scopeChips: ChipOption<ScopeFilter>[] = [
    { key: 'ALL', label: 'Tất cả', count: enrichedStaff.length },
    { key: 'ALLOWED_LOGIN', label: 'Được vào', count: allowedCount },
    { key: 'MARKETING_B2C', label: 'Marketing B2C', count: mktCount },
    { key: 'GROWTH', label: 'Khối Growth', count: growthCount },
    { key: 'MEDIA', label: 'Khối Media', count: mediaCount },
    { key: 'BLOCKED_LOGIN', label: 'Chặn Login', count: blockedCount },
  ];

  // Cấu hình các cột bảng DataTable
  const columns: Column<EnrichedStaff>[] = [
    {
      key: 'staffCode',
      header: 'Mã NV',
      width: 95,
      render: (s) => (
        <span className="font-mono font-medium text-ink text-xs">
          {s.staffCode || s.id}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Họ và tên nhân sự',
      width: 210,
      render: (s) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={s.name} size={28} />
          <div className="min-w-0 leading-tight">
            <span className="block truncate font-semibold text-ink text-xs" title={s.name}>
              {s.name}
            </span>
            <span className="block truncate text-2xs text-ink-3 mt-0.5">
              {s.location || 'HN'} · {s.employmentType || 'Chính thức'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email công ty',
      width: 200,
      render: (s) => (
        <span className="font-mono text-2xs text-ink-2 truncate block" title={s.email}>
          {s.email}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Phòng ban / Team',
      width: 175,
      render: (s) => (
        <div className="leading-tight">
          <span className="block font-medium text-ink text-xs truncate" title={s.department}>
            {s.department || 'Chưa phân phòng'}
          </span>
          {s.team && s.team !== s.department && (
            <span className="block text-2xs text-ink-3 truncate mt-0.5" title={s.team}>
              {s.team}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Vị trí chức danh',
      width: 165,
      render: (s) => (
        <span className="text-xs text-ink-2 truncate block" title={s.position || s.roleTitle}>
          {s.position || s.roleTitle || 'Nhân viên'}
        </span>
      ),
    },
    {
      key: 'classifiedScope',
      header: 'Khối hệ thống',
      width: 145,
      render: (s) => (
        <span className="text-xs text-ink-2">
          {SCOPE_LABELS[s.classifiedScope]}
        </span>
      ),
    },
    {
      key: 'managerName',
      header: 'Quản lý trực tiếp',
      width: 145,
      render: (s) => (
        <span className="text-xs text-ink-2 truncate block">
          {s.canLogin ? s.managerName : '—'}
        </span>
      ),
    },
    {
      key: 'canLogin',
      header: 'Cổng đăng nhập',
      width: 120,
      align: 'center',
      render: (s) => (
        <Status tone={s.canLogin ? 'positive' : 'neutral'}>
          {s.canLogin ? 'Được vào' : 'Chặn Login'}
        </Status>
      ),
    },
  ];

  return (
    <Panel flush>
      <div className="p-4 border-b border-line grid gap-2.5">
        <FilterBar
          search={{
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPage(1);
            },
            placeholder: 'Tìm theo tên, mã NV, email, phòng ban...',
          }}
          filters={
            <>
              <Select
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setPage(1);
                }}
                aria-label="Khu vực"
                className="w-auto"
              >
                <option value="ALL">Mọi khu vực</option>
                <option value="HN">Hà Nội ({hnCount})</option>
                <option value="HCM">TP. Hồ Chí Minh ({hcmCount})</option>
              </Select>

              <Select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setPage(1);
                }}
                aria-label="Phòng ban"
                className="w-auto"
              >
                <option value="ALL">Mọi phòng ban ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>

              {isStaffFiltered && (
                <Button variant="ghost" onClick={handleResetStaffFilters}>
                  Xóa bộ lọc
                </Button>
              )}

              <div className="ml-auto hidden xl:flex items-center gap-1.5 text-2xs text-ink-3">
                <Shield className="w-3.5 h-3.5 text-positive" />
                <span>
                  {allowedCount} được phép Login / {enrichedStaff.length} tổng số
                </span>
              </div>
            </>
          }
          chips={
            <Chips<ScopeFilter>
              label="Khối & Quyền"
              items={scopeChips}
              value={selectedScope}
              onChange={(k) => {
                setSelectedScope(k);
                setPage(1);
              }}
            />
          }
          resultCount={isStaffFiltered ? filteredStaff.length : undefined}
        />
      </div>

      <DataTable
        columns={columns}
        rows={currentStaff}
        rowKey={(s) => s.id || s.staffCode || ''}
        compact
        empty={
          <EmptyState
            title="Không tìm thấy nhân sự"
            description="Không có nhân sự nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
            action={
              isStaffFiltered ? (
                <Button variant="secondary" size="sm" onClick={handleResetStaffFilters}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={filteredStaff.length}
        onPageChange={setPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setPage(1);
        }}
        pageSizes={[20, 50, 100]}
      />
    </Panel>
  );
};
