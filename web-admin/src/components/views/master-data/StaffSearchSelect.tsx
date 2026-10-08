'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Users, User, ChevronDown } from 'lucide-react';
import { StaffMasterMember } from '../../../lib/types';
import { UPBASE_STAFF_MASTER } from '../../../lib/importedMasterData';
import { STAFF_MASTER_DIRECTORY } from '../../../lib/mockData';

export interface StaffSearchSelectProps {
  label: string;
  sublabel?: string;
  badgeColorClass?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  departmentHint?: 'ACCOUNT' | 'GROWTH' | 'BOOKING' | 'CONTENT' | 'MEDIA' | string;
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
  badgeColorClass = 'text-blue-600',
  placeholder = 'Gõ tên để tìm kiếm nhân sự...',
  value,
  onChange,
  departmentHint,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync internal query with prop value when prop value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Merge and deduplicate all staff members across datasets
  const allStaff = useMemo(() => {
    const map = new Map<string, StaffMasterMember>();

    // Priority 1: Core active staff directory
    STAFF_MASTER_DIRECTORY.forEach(s => {
      if (s.name) {
        map.set(s.name.trim().toLowerCase(), s);
      }
    });

    // Priority 2: Full Enterprise Master Data (1011 members)
    UPBASE_STAFF_MASTER.forEach(s => {
      const key = (s.name || '').trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, s);
      }
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
      if (hint === 'GROWTH') return role.includes('GROWTH') || dept.includes('GROWTH') || pos.includes('GROWTH') || team.includes('GROWTH');
      if (hint === 'BOOKING') return role.includes('BOOKING') || dept.includes('BOOKING') || pos.includes('BOOKING') || team.includes('BOOKING') || pos.includes('CREATOR') || dept.includes('MCN');
      if (hint === 'CONTENT') return role.includes('CONTENT') || dept.includes('CONTENT') || pos.includes('CONTENT') || pos.includes('SCRIPT');
      if (hint === 'MEDIA') return role.includes('MEDIA') || dept.includes('MEDIA') || pos.includes('MEDIA') || pos.includes('ADS');
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
    onChange(staff.name);
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
        <label className="block text-slate-700 font-medium text-2xs truncate">
          {label} {sublabel && <span className={`${badgeColorClass} font-normal`}>{sublabel}</span>}
        </label>
        {value && (
          <span className="text-3xs text-emerald-600 font-medium flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" />
            <span>Đã chọn</span>
          </span>
        )}
      </div>

      {/* Input container */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 pointer-events-none text-slate-400">
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
          className="w-full pl-8 pr-14 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition shadow-2xs"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        {/* Clear & Dropdown toggle actions */}
        <div className="absolute right-1.5 flex items-center gap-0.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
              title="Xóa lựa chọn"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(prev => !prev);
              inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
            title="Xem danh sách nhân sự"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Results Menu */}
      {isOpen && (
        <div 
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl ring-1 ring-slate-900/5 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
        >
          {filteredStaff.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-2xs space-y-1">
              <div>Không tìm thấy nhân sự khớp với &ldquo;<strong>{query}</strong>&rdquo;</div>
              <div className="text-3xs text-slate-400">
                Bạn vẫn có thể tiếp tục sử dụng tên đã gõ.
              </div>
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 bg-slate-50/80 text-3xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Gợi ý nhân sự ({filteredStaff.length})</span>
                <span className="text-slate-400 font-normal">Enter để chọn</span>
              </div>

              {filteredStaff.map((staff, idx) => {
                const isSelected = value && value.trim().toLowerCase() === staff.name.trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${staff.id}-${staff.staffCode || idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur before click finishes
                      handleSelectStaff(staff);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-2.5 cursor-pointer transition flex items-center justify-between gap-2 ${
                      isHighlighted 
                        ? 'bg-blue-50/80 text-blue-900' 
                        : isSelected 
                        ? 'bg-slate-50 text-slate-900' 
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar / Initials */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-2xs font-semibold shrink-0 shadow-2xs ${
                        isSelected 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {staff.avatar && staff.avatar.length <= 3 
                          ? staff.avatar 
                          : (staff.name || 'U').slice(0, 1).toUpperCase()}
                      </div>

                      {/* Name & Details */}
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                          <span className="truncate">{staff.name}</span>
                          {staff.staffCode && (
                            <span className="font-mono text-3xs text-slate-400 font-normal shrink-0">
                              ({staff.staffCode})
                            </span>
                          )}
                        </div>

                        <div className="text-3xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          {staff.position || staff.roleTitle ? (
                            <span className="truncate">{staff.position || staff.roleTitle}</span>
                          ) : null}
                          {(staff.position || staff.roleTitle) && (staff.department || staff.team) ? (
                            <span className="text-slate-300">•</span>
                          ) : null}
                          {staff.department || staff.team ? (
                            <span className="text-slate-400 truncate">{staff.department || staff.team}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Department Tag & Selection Status */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {staff.role && (
                        <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold ${
                          staff.role === 'ACCOUNT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          staff.role === 'GROWTH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          staff.role === 'BOOKING' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          staff.role === 'CONTENT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {staff.role}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
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
