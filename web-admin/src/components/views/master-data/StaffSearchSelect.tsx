'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { StaffMasterMember } from '../../../lib/types';
import { UPBASE_STAFF_MASTER } from '../../../lib/importedMasterData';
import { STAFF_MASTER_DIRECTORY } from '../../../lib/mockData';
import { staffCodeOf } from '../../../lib/staffIdentity';

export interface StaffSearchSelectProps {
  label: string;
  sublabel?: string;
  badgeColorClass?: string;
  placeholder?: string;
  value: string;
  /** code: mã nhân sự khi chọn từ danh bạ; gõ tay thì không có mã */
  onChange: (value: string, code?: string) => void;
  departmentHint?: 'ACCOUNT' | 'BOOKING' | 'CONTENT' | string;
  /** Mã nhân sự đang chọn (để đánh dấu đúng người khi trùng tên) */
  selectedCode?: string;
  className?: string;
}

function removeVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export const StaffSearchSelect: React.FC<StaffSearchSelectProps> = ({
  label,
  sublabel,
  badgeColorClass = 'text-accent',
  placeholder = 'Gõ tên để tìm kiếm nhân sự...',
  value,
  onChange,
  departmentHint,
  selectedCode,
  className = ''
}) => {
  const listboxId = React.useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value || '');
  }
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Merge and deduplicate all staff members across datasets
  const allStaff = useMemo(() => {
    // Gộp theo mã nhân sự (không theo tên) để người trùng tên vẫn chọn được đúng người
    const map = new Map<string, StaffMasterMember>();
    const keyOf = (s: StaffMasterMember) => staffCodeOf(s).toLowerCase() || (s.name || '').trim().toLowerCase();

    // Priority 1: Core active staff directory
    STAFF_MASTER_DIRECTORY.forEach(s => {
      if (s.name) map.set(keyOf(s), s);
    });

    // Priority 2: Full Enterprise Master Data (1011 members)
    UPBASE_STAFF_MASTER.forEach(s => {
      const key = keyOf(s);
      if (s.name && key && !map.has(key)) map.set(key, s);
    });

    return Array.from(map.values());
  }, []);

  // Filter staff based on user query and department hint
  const filteredStaff = useMemo(() => {
    const qNormalized = removeVietnameseTones(query);

    const matchesHint = (s: StaffMasterMember) => {
      if (!departmentHint) return false;
      const hint = departmentHint.toUpperCase();
      const role = (s.role || '').toUpperCase();
      const dept = (s.department || '').toUpperCase();
      const team = (s.team || '').toUpperCase();
      const pos = (s.position || s.roleTitle || '').toUpperCase();

      if (hint === 'ACCOUNT') return role.includes('ACCOUNT') || dept.includes('ACCOUNT') || pos.includes('ACCOUNT') || team.includes('ACCOUNT');
      if (hint === 'BOOKING') return role.includes('BOOKING') || dept.includes('BOOKING') || pos.includes('BOOKING') || team.includes('BOOKING') || pos.includes('CREATOR') || dept.includes('MCN');
      if (hint === 'CONTENT') return role.includes('CONTENT') || dept.includes('CONTENT') || pos.includes('CONTENT') || pos.includes('SCRIPT');
      return role.includes(hint) || dept.includes(hint);
    };

    if (!qNormalized) {
      // If empty query, show top recommended members for this department
      const departmentStaff = allStaff.filter(matchesHint);
      const otherStaff = allStaff.filter(s => !matchesHint(s));
      return [...departmentStaff.slice(0, 8), ...otherStaff.slice(0, 4)].slice(0, 10);
    }

    // Search by name, staffCode, department, roleTitle
    const matched = allStaff.filter(s => {
      const nameNorm = removeVietnameseTones(s.name);
      const codeNorm = removeVietnameseTones(s.staffCode || '');
      const deptNorm = removeVietnameseTones(s.department || s.team || '');
      const posNorm = removeVietnameseTones(s.position || s.roleTitle || '');
      const emailNorm = (s.email || '').toLowerCase();

      return (
        nameNorm.includes(qNormalized) ||
        codeNorm.includes(qNormalized) ||
        deptNorm.includes(qNormalized) ||
        posNorm.includes(qNormalized) ||
        emailNorm.includes(qNormalized)
      );
    });

    // Sort: exact match on name first, then matching department hint, then others
    matched.sort((a, b) => {
      const aName = removeVietnameseTones(a.name);
      const bName = removeVietnameseTones(b.name);

      if (aName === qNormalized && bName !== qNormalized) return -1;
      if (bName === qNormalized && aName !== qNormalized) return 1;

      const aStarts = aName.startsWith(qNormalized);
      const bStarts = bName.startsWith(qNormalized);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      const aHint = matchesHint(a);
      const bHint = matchesHint(b);
      if (aHint && !bHint) return -1;
      if (!aHint && bHint) return 1;

      return 0;
    });

    return matched.slice(0, 12);
  }, [allStaff, query, departmentHint]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredStaff.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (isOpen && filteredStaff[highlightedIndex]) {
        e.preventDefault();
        handleSelectStaff(filteredStaff[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectStaff = (staff: StaffMasterMember) => {
    setQuery(staff.name);
    onChange(staff.name, staffCodeOf(staff) || undefined);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label & Sublabel */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-ink-2 font-medium text-2xs truncate">
          {label} {sublabel && <span className={`${badgeColorClass} font-normal`}>{sublabel}</span>}
        </label>
        {value && (
          <span className="text-2xs text-positive font-medium flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" />
            <span>Đã chọn</span>
          </span>
        )}
      </div>

      {/* Input container */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 pointer-events-none text-ink-3">
          <Search className="w-3.5 h-3.5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val); // Immediately update parent so manual custom typing is preserved
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-8 pr-14 py-2 text-xs rounded-lg border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition shadow-2xs"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />

        {/* Clear & Dropdown toggle actions */}
        <div className="absolute right-1.5 flex items-center gap-0.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-ink-3 hover:text-ink rounded hover:bg-sunken transition"
              title="Xóa lựa chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(prev => !prev);
              inputRef.current?.focus();
            }}
            className="p-1 text-ink-3 hover:text-ink rounded hover:bg-sunken transition"
            title="Xem danh sách nhân sự"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Results Menu */}
      {isOpen && (
        <div 
          id={listboxId}
          role="listbox"
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-surface border border-line rounded-xl shadow-xl text-xs divide-y divide-line animate-in fade-in zoom-in-95 duration-100"
        >
          {filteredStaff.length === 0 ? (
            <div className="p-3 text-center text-ink-2 text-2xs space-y-1">
              <div>Không tìm thấy nhân sự khớp với &ldquo;<strong>{query}</strong>&rdquo;</div>
              <div className="text-2xs text-ink-3">
                Bạn vẫn có thể tiếp tục sử dụng tên đã gõ.
              </div>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 bg-canvas text-2xs font-semibold text-ink-3 flex items-center justify-between">
                <span>Gợi ý nhân sự ({filteredStaff.length})</span>
                <span className="text-ink-3 font-normal">Enter để chọn</span>
              </div>

              {filteredStaff.map((staff, idx) => {
                const isSelected = selectedCode
                  ? staffCodeOf(staff).toLowerCase() === selectedCode.toLowerCase()
                  : value && value.trim().toLowerCase() === staff.name.trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${staff.id}-${staff.staffCode || idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur before click finishes
                      handleSelectStaff(staff);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-3 cursor-pointer transition flex items-center justify-between gap-2 ${
                      isHighlighted 
                        ? 'bg-accent-soft text-ink' 
                        : isSelected 
                        ? 'bg-canvas text-ink' 
                        : 'hover:bg-canvas text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar / Initials */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-2xs font-semibold shrink-0 shadow-2xs ${
                        isSelected 
                          ? 'bg-accent text-white' 
                          : 'bg-sunken text-ink-2'
                      }`}>
                        {staff.avatar && staff.avatar.length <= 3 
                          ? staff.avatar 
                          : (staff.name || 'U').slice(0, 1).toUpperCase()}
                      </div>

                      {/* Name & Details */}
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-xs text-ink flex items-center gap-2 truncate">
                          <span className="truncate">{staff.name}</span>
                          {staffCodeOf(staff) && (
                            <span className="font-code text-2xs text-ink-3 font-normal shrink-0">
                              ({staffCodeOf(staff)})
                            </span>
                          )}
                        </div>

                        <div className="text-2xs text-ink-2 truncate flex items-center gap-1 mt-0.5">
                          {staff.position || staff.roleTitle ? (
                            <span className="truncate">{staff.position || staff.roleTitle}</span>
                          ) : null}
                          {(staff.position || staff.roleTitle) && (staff.department || staff.team) ? (
                            <span className="text-ink-3">•</span>
                          ) : null}
                          {staff.department || staff.team ? (
                            <span className="text-ink-3 truncate">{staff.department || staff.team}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Department Tag & Selection Status */}
                    <div className="shrink-0 flex items-center gap-2">
                      {staff.role && (
                        <span className="text-2xs font-medium text-ink-3">
                          {staff.role}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-accent" />
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
