'use client';

import React, { useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  Phone,
  Trash2,
  Clock,
  Send,
} from 'lucide-react';
import { Modal, Button, SearchInput } from '../ui';
import type { StagingKocItem } from '@/lib/kocStagingService';
import { formatNumber } from '@/lib/format';

interface PendingKocStagingModalProps {
  open: boolean;
  onClose: () => void;
  stagingItems: StagingKocItem[];
  onRemoveItem: (channelId: string) => Promise<void>;
  onExportToUpaffiliate?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const PendingKocStagingModal: React.FC<PendingKocStagingModalProps> = ({
  open,
  onClose,
  stagingItems,
  onRemoveItem,
  onExportToUpaffiliate,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  const filteredItems = useMemo(() => {
    return stagingItems.filter((item) => {
      if (selectedSource !== 'ALL' && item.discoverySource !== selectedSource) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchHandle = item.channelId.toLowerCase().includes(q);
      const matchName = item.stageName.toLowerCase().includes(q);
      const matchContext = item.sourceContext.toLowerCase().includes(q);
      const matchPhone = (item.phone || '').includes(q);
      return matchHandle || matchName || matchContext || matchPhone;
    });
  }, [stagingItems, searchQuery, selectedSource]);

  const handleExportCsv = () => {
    if (stagingItems.length === 0) {
      onNotify?.('Bảng tạm không có dữ liệu để xuất file.', 'warning');
      return;
    }

    const headers = [
      'STT',
      'Mã Kênh [channelId]',
      'Tên Kênh [stageName]',
      'Link Kênh [channelUrl]',
      'Số Điện Thoại / Zalo',
      'Followers',
      'Views Trung Bình',
      'Nguồn Phát Hiện',
      'Chi Tiết Nguồn',
      'Chuyên Viên Quét',
      'Thời Gian Quét',
      'Trạng Thái',
    ];

    const rows = filteredItems.map((it, idx) => [
      idx + 1,
      `@${it.channelId}`,
      `"${(it.stageName || it.channelId).replace(/"/g, '""')}"`,
      it.channelUrl,
      it.phone || it.zalo || '',
      it.followersCount || 0,
      it.avgViews || 0,
      it.discoverySource,
      `"${(it.sourceContext || '').replace(/"/g, '""')}"`,
      it.discoveredByStaffName || '',
      it.discoveredAt || '',
      it.exportStatus,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bang-tam-koc-cho-upaffiliate-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onNotify?.(`Đã xuất ${filteredItems.length} KOC trong bảng tạm ra file CSV.`, 'success');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bảng Tạm KOC Mới Chờ Đẩy Sang Upaffiliate"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-ink-2">
            Đang hiển thị <strong>{filteredItems.length}</strong> / <strong>{stagingItems.length}</strong> KOC trong bảng tạm
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
            >
              Xuất File CSV Mẫu Upaffiliate
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => {
                if (onExportToUpaffiliate) {
                  onExportToUpaffiliate();
                } else {
                  onNotify?.('Luồng đẩy API sang Upaffiliate đang chuẩn bị kích hoạt.', 'info');
                }
              }}
            >
              Đẩy Sang Upaffiliate ({stagingItems.length})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Bộ lọc và thanh tìm kiếm */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm kiếm KOC trong bảng tạm (Handle, tên, SĐT, đối thủ...)"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedSource('ALL')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedSource === 'ALL'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-ink-2 hover:bg-surface-hover border border-line'
              }`}
            >
              Tất cả ({stagingItems.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('COMPETITOR_DISCOVERY')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedSource === 'COMPETITOR_DISCOVERY'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-ink-2 hover:bg-surface-hover border border-line'
              }`}
            >
              KOC Đối thủ
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('HASHTAG_DISCOVERY')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedSource === 'HASHTAG_DISCOVERY'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-ink-2 hover:bg-surface-hover border border-line'
              }`}
            >
              Hashtag
            </button>
          </div>
        </div>

        {/* Danh sách bảng KOC */}
        <div className="border border-line rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-ink-3 text-sm">
              Không có KOC nào trong bảng tạm thỏa mãn điều kiện lọc.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-sunken text-ink-2 font-semibold border-b border-line sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">KOC / Kênh</th>
                  <th className="py-2.5 px-3">Nguồn phát hiện</th>
                  <th className="py-2.5 px-3 text-right">Followers</th>
                  <th className="py-2.5 px-3 text-right">Views TB</th>
                  <th className="py-2.5 px-3">Liên hệ</th>
                  <th className="py-2.5 px-3">Chuyên viên quét</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3 text-center w-12">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-2.5 px-3 min-w-[180px]">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <a
                          href={item.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-accent inline-flex items-center gap-1"
                        >
                          <span>@{item.channelId}</span>
                          <ExternalLink className="w-3 h-3 text-ink-3" />
                        </a>
                      </div>
                      <div className="text-2xs text-ink-3 truncate max-w-[200px]">
                        {item.stageName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sunken text-ink text-2xs font-medium border border-line">
                        {item.sourceContext}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-code tabular-nums text-ink">
                      {formatNumber(item.followersCount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-code tabular-nums text-ink">
                      {formatNumber(item.avgViews)}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.phone || item.zalo ? (
                        <span className="inline-flex items-center gap-1 text-ink font-code text-2xs">
                          <Phone className="w-3 h-3 text-accent" />
                          <span>{item.phone || item.zalo}</span>
                        </span>
                      ) : item.email ? (
                        <span className="text-ink-3 text-2xs truncate max-w-[140px] block">
                          {item.email}
                        </span>
                      ) : (
                        <span className="text-ink-3 text-2xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-ink-2 text-2xs">
                      <div>{item.discoveredByStaffName || 'Chuyên viên B2C'}</div>
                      <div className="text-ink-3 font-code">
                        {new Date(item.discoveredAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent text-2xs font-medium border border-accent/25">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Chờ đẩy Upaffiliate</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          await onRemoveItem(item.channelId);
                          onNotify?.(`Đã xóa @${item.channelId} khỏi bảng tạm.`, 'info');
                        }}
                        className="p-1 rounded text-ink-3 hover:text-negative hover:bg-negative-soft transition-colors"
                        title="Xóa khỏi bảng tạm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
};
