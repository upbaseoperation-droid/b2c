'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import type { BrandDetail, UserProfile } from '../../lib/types';
import type { BrandDocCategory, BrandDocument, BrandProfile } from '../../lib/brands/types';
import { brandKey } from '../../lib/brands/types';
import type { R2ConnectionTestResult, R2ObjectSummary } from '../../lib/brands/r2';
import { UPBASE_BRANDS_MASTER } from '../../lib/importedMasterData';
import {
  BrandAvatar,
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Pagination,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
} from '../ui';
import type { Column } from '../ui';
import {
  DOC_CATEGORY_LABEL,
  buildRows,
  dateTime,
  fileExtLabel,
  formatFileSize,
  real,
  uploadBrandFileClient,
  type BrandAccess,
  type BrandRow,
} from '../brands/brandUi';
import { CloudflareR2SetupPanel } from '../brands/CloudflareR2SetupPanel';
import {
  getSharedProfilesSnapshot,
  subscribeSharedProfiles,
  updateSharedProfilesCache,
} from '../../lib/brands/useBrandProfiles';

type AdminTab = 'FILES_MANAGER' | 'BRAND_STORAGE' | 'R2_CONFIG';
type StorageFilter = 'ALL' | 'R2' | 'LOCAL' | 'LINK';
type ViewSourceMode = 'BRAND_DOCS' | 'BUCKET_OBJECTS';

interface R2StatusSummary {
  configured: boolean;
  storageMode: 'R2' | 'LOCAL';
  source: 'RUNTIME_FILE' | 'ENV' | 'NONE';
  accountId: string;
  bucket: string;
  endpoint: string;
  publicUrl: string;
  maskedAccessKeyId: string;
  hasSecretAccessKey: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  lastTest: R2ConnectionTestResult | null;
  localFiles: {
    count: number;
    totalBytes: number;
  };
  storedObjects?: {
    objects: R2ObjectSummary[];
    r2ObjectCount: number;
    r2TotalBytes: number;
    localObjectCount: number;
    localTotalBytes: number;
    r2Error?: string;
  };
}

interface FlattenedBrandFileItem {
  uid: string;
  docId: string;
  brandKey: string;
  brandName: string;
  brandCode?: string;
  brandMasterId?: string;
  accountPic: string;
  title: string;
  category: BrandDocCategory;
  url: string;
  note?: string;
  addedBy: string;
  addedAt: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storage: 'R2' | 'LOCAL' | 'LINK';
  section: 'DOCUMENTS' | 'LEGAL';
}

interface BrandStorageSummaryRow {
  key: string;
  name: string;
  code: string;
  masterId?: string;
  category: string;
  accountPic: string;
  r2Count: number;
  localCount: number;
  linkCount: number;
  legalCount: number;
  totalDocs: number;
  totalBytes: number;
  updatedAt: string;
  rowRef: BrandRow;
}

const UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.xlsx,.pptx,.csv,.txt,.zip';

export function CloudflareAdminView({
  currentUser,
  brands,
  onNotify,
  onNavigateToBrandProfile,
}: {
  currentUser?: UserProfile | null;
  brands?: BrandDetail[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('FILES_MANAGER');
  const [sourceMode, setSourceMode] = useState<ViewSourceMode>('BRAND_DOCS');
  const [r2Status, setR2Status] = useState<R2StatusSummary | null>(null);
  const [loadingR2, setLoadingR2] = useState<boolean>(true);
  const [testingR2, setTestingR2] = useState<boolean>(false);
  const [migratingR2, setMigratingR2] = useState<boolean>(false);

  const [profiles, setProfiles] = useState<BrandProfile[] | null>(
    () => getSharedProfilesSnapshot()?.profiles || null,
  );
  const [access, setAccess] = useState<BrandAccess | undefined>(
    () => getSharedProfilesSnapshot()?.access,
  );

  // Bộ lọc danh sách tệp
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | BrandDocCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filePage, setFilePage] = useState<number>(1);
  const [brandPage, setBrandPage] = useState<number>(1);

  // Hộp thoại tải tệp mới lên R2
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadBrandName, setUploadBrandName] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<BrandDocCategory>('GUIDELINE');
  const [uploadCustomTitle, setUploadCustomTitle] = useState<string>('');
  const [uploadNote, setUploadNote] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hộp thoại xác nhận xóa tệp
  const [deletingDoc, setDeletingDoc] = useState<FlattenedBrandFileItem | null>(null);
  const [deletingObject, setDeletingObject] = useState<R2ObjectSummary | null>(null);
  const [deletingBusy, setDeletingBusy] = useState<boolean>(false);

  const baseBrands = brands && brands.length > 0 ? brands : UPBASE_BRANDS_MASTER;

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/brands/profiles', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.profiles)) {
        updateSharedProfilesCache(data.profiles, data.access);
        setProfiles(data.profiles);
        if (data.access) setAccess(data.access);
      }
    } catch {
      // Giữ cache hiện tại nếu lỗi mạng tạm thời
    }
  }, []);

  const loadR2Status = useCallback(async (includeObjects = true) => {
    setLoadingR2(true);
    try {
      const url = includeObjects
        ? '/api/integrations/cloudflare-r2?includeObjects=1'
        : '/api/integrations/cloudflare-r2';
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setR2Status(data as R2StatusSummary);
      }
    } catch {
      // Bỏ qua lỗi nạp lần đầu
    } finally {
      setLoadingR2(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeSharedProfiles(next => {
      if (!cancelled) {
        setProfiles(next.profiles);
        if (next.access) setAccess(next.access);
      }
    });
    void loadProfiles();
    void loadR2Status(true);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser?.id, loadProfiles, loadR2Status]);

  const rows = useMemo(() => buildRows(baseBrands, profiles || []), [baseBrands, profiles]);

  // Danh sách phẳng toàn bộ tệp & tài liệu của 42 thương hiệu
  const allBrandFiles = useMemo<FlattenedBrandFileItem[]>(() => {
    const list: FlattenedBrandFileItem[] = [];
    for (const r of rows) {
      const pic = real(r.master?.accountPic) || real(r.master?.brandPicName) || r.profile.updatedBy || 'Phòng B2C';
      for (const doc of r.profile.documents) {
        const effectiveStorage: 'R2' | 'LOCAL' | 'LINK' =
          doc.storage === 'R2'
            ? 'R2'
            : doc.storage === 'LOCAL'
              ? 'LOCAL'
              : doc.fileKey
                ? r2Status?.storageMode === 'R2'
                  ? 'R2'
                  : 'LOCAL'
                : 'LINK';

        list.push({
          uid: `doc-${r.key}-${doc.id}`,
          docId: doc.id,
          brandKey: r.key,
          brandName: r.name,
          brandCode: r.master?.code,
          brandMasterId: r.master?.id,
          accountPic: pic,
          title: doc.title,
          category: doc.category,
          url: doc.url,
          note: doc.note,
          addedBy: doc.addedBy || pic,
          addedAt: doc.addedAt || r.profile.updatedAt,
          fileKey: doc.fileKey,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          storage: effectiveStorage,
          section: 'DOCUMENTS',
        });
      }

      for (const leg of r.profile.legal) {
        if (!leg.url && !leg.fileKey) continue;
        const effectiveStorage: 'R2' | 'LOCAL' | 'LINK' =
          leg.storage === 'R2'
            ? 'R2'
            : leg.storage === 'LOCAL'
              ? 'LOCAL'
              : leg.fileKey
                ? r2Status?.storageMode === 'R2'
                  ? 'R2'
                  : 'LOCAL'
                : 'LINK';

        list.push({
          uid: `leg-${r.key}-${leg.id}`,
          docId: leg.id,
          brandKey: r.key,
          brandName: r.name,
          brandCode: r.master?.code,
          brandMasterId: r.master?.id,
          accountPic: pic,
          title: leg.title,
          category: 'LEGAL',
          url: leg.url || (leg.fileKey ? `/api/brands/files?key=${encodeURIComponent(leg.fileKey)}` : ''),
          note: `Số công bố: ${leg.docNumber} · Cơ quan cấp: ${leg.authority}`,
          addedBy: 'Pháp chế B2C',
          addedAt: r.profile.updatedAt,
          fileKey: leg.fileKey,
          fileName: leg.fileName,
          fileSize: leg.fileSize,
          mimeType: leg.mimeType,
          storage: effectiveStorage,
          section: 'LEGAL',
        });
      }
    }
    return list.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  }, [rows, r2Status?.storageMode]);

  // Tổng hợp dung lượng theo từng thương hiệu
  const brandStorageRows = useMemo<BrandStorageSummaryRow[]>(() => {
    const objectBytesByBrand = new Map<string, { r2Count: number; localCount: number; bytes: number }>();
    for (const obj of r2Status?.storedObjects?.objects || []) {
      const cur = objectBytesByBrand.get(obj.brandSlug) || { r2Count: 0, localCount: 0, bytes: 0 };
      if (obj.storage === 'R2') cur.r2Count += 1;
      else cur.localCount += 1;
      cur.bytes += obj.size || 0;
      objectBytesByBrand.set(obj.brandSlug, cur);
    }

    return rows.map(r => {
      const docs = r.profile.documents;
      const legals = r.profile.legal;
      const objStat = objectBytesByBrand.get(r.key);

      const docR2Count = docs.filter(d => d.storage === 'R2').length + legals.filter(l => l.storage === 'R2').length;
      const docLocalCount = docs.filter(d => d.storage === 'LOCAL').length + legals.filter(l => l.storage === 'LOCAL').length;
      const linkCount = docs.filter(d => !d.fileKey && d.storage !== 'R2' && d.storage !== 'LOCAL').length;

      const docBytes =
        docs.reduce((sum, d) => sum + (d.fileSize || 0), 0) +
        legals.reduce((sum, l) => sum + (l.fileSize || 0), 0);

      return {
        key: r.key,
        name: r.name,
        code: real(r.master?.code) || r.key.toUpperCase(),
        masterId: r.master?.id,
        category: real(r.master?.category) || 'Ngành hàng B2C',
        accountPic: real(r.master?.accountPic) || real(r.master?.brandPicName) || r.profile.updatedBy || 'Đặng Thị Yến Nhi',
        r2Count: Math.max(docR2Count, objStat?.r2Count || 0),
        localCount: Math.max(docLocalCount, objStat?.localCount || 0),
        linkCount,
        legalCount: legals.length,
        totalDocs: docs.length + legals.length,
        totalBytes: Math.max(docBytes, objStat?.bytes || 0),
        updatedAt: r.profile.updatedAt,
        rowRef: r,
      };
    });
  }, [rows, r2Status?.storedObjects?.objects]);

  // Chỉ số KPI tổng hợp trên đầu trang
  const kpiMetrics = useMemo(() => {
    const r2UploadedDocs = allBrandFiles.filter(f => f.storage === 'R2').length;
    const localUploadedDocs = allBrandFiles.filter(f => f.storage === 'LOCAL').length;
    const totalR2Objects = Math.max(r2UploadedDocs, r2Status?.storedObjects?.r2ObjectCount || 0);
    const totalLocalObjects = Math.max(localUploadedDocs, r2Status?.localFiles?.count || 0);
    const totalCatalogBytes = brandStorageRows.reduce((s, r) => s + r.totalBytes, 0);
    const physicalBytes = (r2Status?.storedObjects?.r2TotalBytes || 0) + (r2Status?.localFiles?.totalBytes || 0);
    const brandsWithDocs = brandStorageRows.filter(r => r.totalDocs > 0).length;
    const totalLegalDocs = brandStorageRows.reduce((s, r) => s + r.legalCount, 0);

    return {
      totalFiles: allBrandFiles.length,
      totalR2Objects,
      totalLocalObjects,
      totalBytes: Math.max(totalCatalogBytes, physicalBytes),
      physicalBytes,
      brandsWithDocs,
      totalBrands: brandStorageRows.length,
      totalLegalDocs,
    };
  }, [allBrandFiles, brandStorageRows, r2Status]);

  // Lọc danh sách tệp hồ sơ thương hiệu
  const filteredBrandFiles = useMemo(() => {
    return allBrandFiles.filter(item => {
      if (brandFilter !== 'ALL' && item.brandKey !== brandFilter) return false;
      if (storageFilter !== 'ALL' && item.storage !== storageFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${item.title} ${item.brandName} ${item.fileName || ''} ${item.fileKey || ''} ${item.note || ''} ${item.addedBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allBrandFiles, brandFilter, storageFilter, categoryFilter, searchQuery]);

  // Lọc danh sách Object thực tế trên Bucket R2 / Kho cục bộ
  const filteredBucketObjects = useMemo(() => {
    const objects = r2Status?.storedObjects?.objects || [];
    return objects.filter(obj => {
      if (brandFilter !== 'ALL' && obj.brandSlug !== brandFilter) return false;
      if (storageFilter === 'R2' && obj.storage !== 'R2') return false;
      if (storageFilter === 'LOCAL' && obj.storage !== 'LOCAL') return false;
      if (storageFilter === 'LINK') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!`${obj.key} ${obj.fileName} ${obj.brandSlug} ${obj.month}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [r2Status?.storedObjects?.objects, brandFilter, storageFilter, searchQuery]);

  // Lọc danh sách thương hiệu ở tab 2
  const filteredBrandStorageRows = useMemo(() => {
    return brandStorageRows.filter(r => {
      if (brandFilter !== 'ALL' && r.key !== brandFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!`${r.name} ${r.code} ${r.category} ${r.accountPic}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [brandStorageRows, brandFilter, searchQuery]);

  const handleQuickTestConnection = async () => {
    setTestingR2(true);
    try {
      const res = await fetch('/api/integrations/cloudflare-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST_CONNECTION' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.testResult?.ok) {
        onNotify?.(data.testResult.message, 'success');
      } else {
        onNotify?.(data.error || data.testResult?.message || 'Chưa kết nối được Cloudflare R2.', 'warning');
      }
      await loadR2Status(true);
    } catch (e) {
      onNotify?.((e as Error).message || 'Lỗi khi kiểm tra kết nối R2.', 'error');
    } finally {
      setTestingR2(false);
    }
  };

  const handleMigrateLocalFiles = async () => {
    setMigratingR2(true);
    try {
      const res = await fetch('/api/integrations/cloudflare-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MIGRATE_LOCAL_FILES' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify?.(data.error || 'Không đồng bộ được tệp cục bộ lên R2.', 'error');
        return;
      }
      onNotify?.(data.message || 'Đã đồng bộ tệp cục bộ lên Cloudflare R2.', data.ok ? 'success' : 'warning');
      await loadR2Status(true);
    } catch (e) {
      onNotify?.((e as Error).message || 'Lỗi khi đồng bộ tệp lên R2.', 'error');
    } finally {
      setMigratingR2(false);
    }
  };

  const openUploadForBrand = (defaultBrandName?: string) => {
    const initialBrand =
      defaultBrandName ||
      (brandFilter !== 'ALL' ? rows.find(r => r.key === brandFilter)?.name : '') ||
      rows[0]?.name ||
      '';
    setUploadBrandName(initialBrand);
    setUploadCategory('GUIDELINE');
    setUploadCustomTitle('');
    setUploadNote('');
    setSelectedFiles([]);
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!uploadBrandName.trim()) {
      onNotify?.('Vui lòng chọn thương hiệu cần tải tệp.', 'warning');
      return;
    }
    if (selectedFiles.length === 0) {
      onNotify?.('Vui lòng chọn ít nhất 1 tệp để tải lên.', 'warning');
      return;
    }

    const targetRow = rows.find(r => r.key === brandKey(uploadBrandName));
    if (!targetRow) {
      onNotify?.('Không tìm thấy hồ sơ thương hiệu tương ứng.', 'error');
      return;
    }

    setUploading(true);
    try {
      const uploadedDocs: BrandDocument[] = [];
      for (const file of selectedFiles) {
        const stored = await uploadBrandFileClient({
          file,
          brandName: targetRow.name,
          section: 'DOCUMENTS',
        });
        const cleanTitle =
          selectedFiles.length === 1 && uploadCustomTitle.trim()
            ? uploadCustomTitle.trim()
            : file.name.replace(/\.[^.]+$/, '') || file.name;

        uploadedDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: cleanTitle,
          category: uploadCategory,
          url: stored.url,
          note: uploadNote.trim(),
          addedBy: currentUser?.name || 'Quản trị viên',
          addedAt: new Date().toISOString(),
          fileKey: stored.fileKey,
          fileName: stored.fileName,
          fileSize: stored.fileSize,
          mimeType: stored.mimeType,
          storage: stored.storage,
        });
      }

      const nextDocs = [...targetRow.profile.documents, ...uploadedDocs];
      const summary =
        uploadedDocs.length === 1
          ? `Tải tệp lên kho R2: ${uploadedDocs[0].title}`
          : `Tải ${uploadedDocs.length} tệp lên kho R2 cho ${targetRow.name}`;

      const saveRes = await fetch('/api/brands/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: targetRow.name,
          revision: targetRow.profile.revision,
          section: 'DOCUMENTS',
          data: { documents: nextDocs },
          summary,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Đã tải tệp nhưng chưa cập nhật được hồ sơ thương hiệu.');
      }

      const nextProfiles = [
        ...(profiles || []).filter(p => p.key !== saveData.profile.key),
        saveData.profile as BrandProfile,
      ];
      setProfiles(nextProfiles);
      updateSharedProfilesCache(nextProfiles, access);

      onNotify?.(
        `Đã tải ${uploadedDocs.length} tệp lên ${uploadedDocs[0]?.storage === 'R2' ? 'Cloudflare R2' : 'kho lưu trữ'} cho thương hiệu ${targetRow.name}.`,
        'success',
      );
      setUploadModalOpen(false);
      setSelectedFiles([]);
      await loadR2Status(true);
    } catch (e) {
      onNotify?.((e as Error).message || 'Không tải được tệp lên hệ thống.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDeleteBrandDoc = async () => {
    if (!deletingDoc) return;
    const targetRow = rows.find(r => r.key === deletingDoc.brandKey);
    if (!targetRow) {
      setDeletingDoc(null);
      return;
    }

    setDeletingBusy(true);
    try {
      if (deletingDoc.fileKey) {
        await fetch(`/api/brands/files?key=${encodeURIComponent(deletingDoc.fileKey)}`, {
          method: 'DELETE',
        }).catch(() => undefined);
      }

      if (deletingDoc.section === 'DOCUMENTS') {
        const nextDocs = targetRow.profile.documents.filter(d => d.id !== deletingDoc.docId);
        const res = await fetch('/api/brands/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandName: targetRow.name,
            revision: targetRow.profile.revision,
            section: 'DOCUMENTS',
            data: { documents: nextDocs },
            summary: `Xóa tệp tài liệu: ${deletingDoc.title}`,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Không xóa được tài liệu khỏi hồ sơ.');
        const nextProfiles = [
          ...(profiles || []).filter(p => p.key !== data.profile.key),
          data.profile as BrandProfile,
        ];
        setProfiles(nextProfiles);
        updateSharedProfilesCache(nextProfiles, access);
      }

      onNotify?.(`Đã xóa tệp "${deletingDoc.title}" của nhãn ${deletingDoc.brandName}.`, 'info');
      setDeletingDoc(null);
      await loadR2Status(true);
    } catch (e) {
      onNotify?.((e as Error).message || 'Không xóa được tệp.', 'error');
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleConfirmDeleteBucketObject = async () => {
    if (!deletingObject) return;
    setDeletingBusy(true);
    try {
      const res = await fetch('/api/integrations/cloudflare-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_OBJECT', key: deletingObject.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không xóa được tệp trên kho lưu trữ.');
      }
      setR2Status(data as R2StatusSummary);
      onNotify?.(data.message || `Đã xóa tệp "${deletingObject.fileName}".`, 'info');
      setDeletingObject(null);
    } catch (e) {
      onNotify?.((e as Error).message || 'Lỗi khi xóa tệp.', 'error');
    } finally {
      setDeletingBusy(false);
    }
  };

  const storageChips = useMemo(
    () => [
      { key: 'ALL' as const, label: 'Tất cả nguồn', count: allBrandFiles.length },
      {
        key: 'R2' as const,
        label: 'Cloudflare R2',
        count: allBrandFiles.filter(f => f.storage === 'R2').length,
      },
      {
        key: 'LOCAL' as const,
        label: 'Lưu trên máy chủ',
        count: allBrandFiles.filter(f => f.storage === 'LOCAL').length,
      },
      {
        key: 'LINK' as const,
        label: 'Link ngoài (Drive / Sheet)',
        count: allBrandFiles.filter(f => f.storage === 'LINK').length,
      },
    ],
    [allBrandFiles],
  );

  const categoryChips = useMemo(
    () => [
      { key: 'ALL' as const, label: 'Tất cả loại', count: allBrandFiles.length },
      ...(Object.entries(DOC_CATEGORY_LABEL) as Array<[BrandDocCategory, string]>).map(([key, label]) => ({
        key,
        label,
        count: allBrandFiles.filter(f => f.category === key).length,
      })),
    ],
    [allBrandFiles],
  );

  // Cột bảng danh sách tệp hồ sơ thương hiệu
  const fileColumns: Column<FlattenedBrandFileItem>[] = [
    {
      key: 'title',
      header: 'Tên tài liệu & Đường dẫn',
      render: item => {
        const ext = fileExtLabel(item.fileName || item.url);
        return (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-ink hover:text-accent break-words"
              >
                {item.title}
              </a>
              {ext && (
                <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs font-code text-ink-2">
                  {ext}
                </span>
              )}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {item.fileName && <span>Tệp: {item.fileName}</span>}
              {item.fileKey && <span className="font-code text-ink-3">{item.fileKey}</span>}
              {!item.fileKey && <span className="truncate max-w-[340px]">{item.url}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'brand',
      header: 'Thương hiệu & PIC',
      width: 210,
      render: item => (
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandAvatar name={item.brandName} id={item.brandMasterId} code={item.brandCode} size={28} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onNavigateToBrandProfile?.(item.brandName)}
              className="text-xs font-semibold text-ink hover:text-accent truncate block text-left"
            >
              {item.brandName}
            </button>
            <span className="text-2xs text-ink-3 truncate block">PIC: {item.accountPic}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Phân loại',
      width: 155,
      render: item => (
        <Status tone={item.category === 'LEGAL' ? 'warning' : item.category === 'GUIDELINE' ? 'brand' : 'neutral'}>
          {DOC_CATEGORY_LABEL[item.category]}
        </Status>
      ),
    },
    {
      key: 'storage',
      header: 'Nơi lưu & Dung lượng',
      width: 175,
      render: item => (
        <div className="leading-tight">
          <Status
            tone={
              item.storage === 'R2'
                ? 'positive'
                : item.storage === 'LOCAL'
                  ? 'info'
                  : 'neutral'
            }
          >
            {item.storage === 'R2'
              ? 'Cloudflare R2'
              : item.storage === 'LOCAL'
                ? 'Máy chủ'
                : 'Link ngoài'}
          </Status>
          <span className="block text-2xs text-ink-3 tabular-nums mt-1">
            {item.fileSize ? formatFileSize(item.fileSize) : 'Link ngoài'}
          </span>
        </div>
      ),
    },
    {
      key: 'addedAt',
      header: 'Người tải & Ngày tải',
      width: 165,
      render: item => (
        <div className="leading-tight text-xs">
          <span className="font-medium text-ink block truncate">{item.addedBy}</span>
          <span className="text-2xs text-ink-3 tabular-nums">{dateTime(item.addedAt) || '—'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 195,
      render: item => {
        const downloadUrl = item.fileKey
          ? `/api/brands/files?key=${encodeURIComponent(item.fileKey)}&download=1`
          : item.url;
        return (
          <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="h-7 px-2 rounded border border-line bg-surface hover:bg-sunken text-2xs font-medium text-ink inline-flex items-center gap-1"
            >
              <Eye className="w-3 h-3 text-ink-3" />
              <span>Xem</span>
            </a>
            <a
              href={downloadUrl}
              target={item.fileKey ? undefined : '_blank'}
              rel="noreferrer"
              className="h-7 px-2 rounded border border-line bg-surface hover:bg-sunken text-2xs font-medium text-accent inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Tải</span>
            </a>
            {item.section === 'DOCUMENTS' && (
              <button
                type="button"
                onClick={() => setDeletingDoc(item)}
                className="h-7 px-2 rounded border border-line bg-surface hover:bg-critical-soft text-2xs font-medium text-critical inline-flex items-center gap-1"
                title="Xóa tệp"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // Cột bảng Tệp lưu trên Bucket R2 / Máy chủ
  const bucketObjectColumns: Column<R2ObjectSummary>[] = [
    {
      key: 'key',
      header: 'Tên tệp & Đường dẫn lưu trữ',
      render: obj => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{obj.fileName}</span>
            {fileExtLabel(obj.fileName) && (
              <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs font-code text-ink-2">
                {fileExtLabel(obj.fileName)}
              </span>
            )}
          </div>
          <span className="block font-code text-2xs text-ink-3 mt-0.5 break-all">{obj.key}</span>
        </div>
      ),
    },
    {
      key: 'brandSlug',
      header: 'Thương hiệu & Tháng',
      width: 180,
      render: obj => {
        const matchedBrand = rows.find(r => r.key === obj.brandSlug);
        return (
          <div className="leading-tight">
            <span className="text-xs font-semibold text-ink block">
              {matchedBrand ? matchedBrand.name : obj.brandSlug}
            </span>
            <span className="text-2xs text-ink-3 tabular-nums">Tháng: {obj.month || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'storage',
      header: 'Nơi lưu',
      width: 150,
      render: obj => (
        <Status tone={obj.storage === 'R2' ? 'positive' : 'info'}>
          {obj.storage === 'R2' ? 'Cloudflare R2' : 'Máy chủ'}
        </Status>
      ),
    },
    {
      key: 'size',
      header: 'Dung lượng',
      align: 'right',
      width: 120,
      render: obj => (
        <span className="text-xs font-medium tabular-nums text-ink">{formatFileSize(obj.size) || '0 B'}</span>
      ),
    },
    {
      key: 'lastModified',
      header: 'Ngày tải lên',
      width: 155,
      render: obj => <span className="text-xs text-ink-2 tabular-nums">{dateTime(obj.lastModified)}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 190,
      render: obj => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <a
            href={obj.url}
            target="_blank"
            rel="noreferrer"
            className="h-7 px-2 rounded border border-line bg-surface hover:bg-sunken text-2xs font-medium text-ink inline-flex items-center gap-1"
          >
            <Eye className="w-3 h-3 text-ink-3" />
            <span>Xem</span>
          </a>
          <a
            href={`/api/brands/files?key=${encodeURIComponent(obj.key)}&download=1`}
            className="h-7 px-2 rounded border border-line bg-surface hover:bg-sunken text-2xs font-medium text-accent inline-flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span>Tải</span>
          </a>
          <button
            type="button"
            onClick={() => setDeletingObject(obj)}
            className="h-7 px-2 rounded border border-line bg-surface hover:bg-critical-soft text-2xs font-medium text-critical inline-flex items-center gap-1"
            title="Xóa tệp"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ),
    },
  ];

  // Cột bảng Dung lượng theo Thương hiệu
  const brandStorageColumns: Column<BrandStorageSummaryRow>[] = [
    {
      key: 'brand',
      header: 'Thương hiệu',
      render: r => (
        <div className="flex items-center gap-3 min-w-0">
          <BrandAvatar name={r.name} id={r.masterId} code={r.code} size={32} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-ink truncate">{r.name}</span>
              <span className="text-2xs font-code text-ink-3">· {r.code}</span>
            </div>
            <span className="text-2xs text-ink-3 truncate block">{r.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Nhân sự phụ trách (PIC)',
      width: 185,
      render: r => <span className="text-xs font-medium text-ink">{r.accountPic}</span>,
    },
    {
      key: 'r2Files',
      header: 'Tệp tải lên (R2 / Máy chủ)',
      align: 'right',
      width: 175,
      render: r => (
        <div className="tabular-nums text-right leading-tight">
          <span className="text-xs font-semibold text-ink">
            {r.r2Count} tệp R2 · {r.localCount} máy chủ
          </span>
          <span className="block text-2xs text-ink-3 mt-0.5">
            {r.linkCount} link quy chuẩn / Sheet
          </span>
        </div>
      ),
    },
    {
      key: 'docs',
      header: 'Tài liệu & Giấy công bố',
      align: 'right',
      width: 165,
      render: r => (
        <div className="tabular-nums text-right leading-tight">
          <span className="text-xs font-medium text-ink">{r.totalDocs} tài liệu</span>
          <span className="block text-2xs text-ink-3 mt-0.5">{r.legalCount} giấy công bố</span>
        </div>
      ),
    },
    {
      key: 'bytes',
      header: 'Dung lượng',
      align: 'right',
      width: 150,
      render: r => (
        <span className="text-xs font-semibold tabular-nums text-accent">
          {formatFileSize(r.totalBytes) || '0 KB'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 245,
      render: r => (
        <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setBrandFilter(r.key);
              setActiveTab('FILES_MANAGER');
            }}
          >
            Xem tệp ({r.totalDocs})
          </Button>
          <Button size="sm" variant="secondary" icon={Upload} onClick={() => openUploadForBrand(r.name)}>
            Tải tệp
          </Button>
          {onNavigateToBrandProfile && (
            <Button size="sm" variant="secondary" onClick={() => onNavigateToBrandProfile(r.name)}>
              Mở hồ sơ
            </Button>
          )}
        </div>
      ),
    },
  ];

  const FILE_PAGE_SIZE = 20;
  const BRAND_PAGE_SIZE = 20;
  const pagedBrandFiles = filteredBrandFiles.slice(
    (filePage - 1) * FILE_PAGE_SIZE,
    filePage * FILE_PAGE_SIZE,
  );
  const pagedBucketObjects = filteredBucketObjects.slice(
    (filePage - 1) * FILE_PAGE_SIZE,
    filePage * FILE_PAGE_SIZE,
  );
  const pagedBrandStorage = filteredBrandStorageRows.slice(
    (brandPage - 1) * BRAND_PAGE_SIZE,
    brandPage * BRAND_PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* 1. HÀNG CHỈ SỐ TỔNG QUAN CLOUDFLARE R2 */}
      <StatRow>
        <Stat
          label="Kho lưu trữ"
          value={r2Status?.configured ? 'Cloudflare R2' : 'Lưu trên máy chủ'}
          note={
            r2Status?.configured
              ? `Bucket: ${r2Status.bucket}${r2Status.lastTest?.latencyMs ? ` · ${r2Status.lastTest.latencyMs}ms` : ''}`
              : 'Thư mục .brand-data/files'
          }
        />
        <Stat
          label="Tổng số tài liệu"
          value={`${kpiMetrics.totalFiles} mục`}
          note={`${kpiMetrics.totalR2Objects} tệp R2 · ${kpiMetrics.totalLocalObjects} tệp máy chủ`}
        />
        <Stat
          label="Dung lượng tệp"
          value={formatFileSize(kpiMetrics.totalBytes) || '0 MB'}
          note={
            kpiMetrics.physicalBytes > 0
              ? `Tệp tải lên: ${formatFileSize(kpiMetrics.physicalBytes)}`
              : 'Tài liệu Guideline, Brief & Pháp lý'
          }
        />
        <Stat
          label="Thương hiệu có tài liệu"
          value={`${kpiMetrics.brandsWithDocs} / ${kpiMetrics.totalBrands} nhãn`}
          note={`${kpiMetrics.totalLegalDocs} giấy công bố & xác nhận quảng cáo`}
        />
      </StatRow>

      {/* 2. THANH TAB ĐIỀU HƯỚNG & NÚT THAO TÁC QUẢN TRỊ */}
      <Tabs<AdminTab>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'FILES_MANAGER',
            label: 'Danh sách tệp',
            count: sourceMode === 'BUCKET_OBJECTS' ? filteredBucketObjects.length : allBrandFiles.length,
          },
          {
            key: 'BRAND_STORAGE',
            label: 'Dung lượng theo thương hiệu',
            count: brandStorageRows.length,
          },
          {
            key: 'R2_CONFIG',
            label: 'Cấu hình kết nối',
          },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={testingR2 ? Loader2 : RefreshCw}
              disabled={testingR2 || loadingR2}
              onClick={() => void handleQuickTestConnection()}
            >
              {testingR2 ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
            </Button>
            {r2Status?.configured && (r2Status.localFiles?.count || 0) > 0 && (
              <Button
                size="sm"
                variant="secondary"
                icon={migratingR2 ? Loader2 : Server}
                disabled={migratingR2}
                onClick={() => void handleMigrateLocalFiles()}
              >
                {migratingR2 ? 'Đang đồng bộ…' : `Đồng bộ lên R2 (${r2Status.localFiles.count})`}
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => openUploadForBrand()}
            >
              Tải tệp lên
            </Button>
          </div>
        }
      />

      {/* 3. NỘI DUNG TAB 1: DANH SÁCH TỆP */}
      {activeTab === 'FILES_MANAGER' && (
        <div className="space-y-4">
          {/* Thanh chuyển chế độ xem & lọc theo thương hiệu */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-line rounded-xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSourceMode('BRAND_DOCS');
                  setFilePage(1);
                }}
                className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                  sourceMode === 'BRAND_DOCS'
                    ? 'bg-primary text-white'
                    : 'bg-sunken text-ink-2 hover:text-ink'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tài liệu theo thương hiệu ({allBrandFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceMode('BUCKET_OBJECTS');
                  setFilePage(1);
                  void loadR2Status(true);
                }}
                className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                  sourceMode === 'BUCKET_OBJECTS'
                    ? 'bg-primary text-white'
                    : 'bg-sunken text-ink-2 hover:text-ink'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>
                  Tệp lưu trên Bucket ({r2Status?.storedObjects?.objects.length || 0})
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-3">Thương hiệu:</span>
              <select
                value={brandFilter}
                onChange={e => {
                  setBrandFilter(e.target.value);
                  setFilePage(1);
                }}
                aria-label="Lọc theo thương hiệu"
                className="h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-accent"
              >
                <option value="ALL">Tất cả 42 thương hiệu B2C</option>
                {rows.map(r => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>
              {brandFilter !== 'ALL' && (
                <Button size="sm" variant="ghost" onClick={() => setBrandFilter('ALL')}>
                  Bỏ lọc nhãn
                </Button>
              )}
            </div>
          </div>

          <Panel
            title={
              sourceMode === 'BRAND_DOCS'
                ? 'Tài liệu thương hiệu'
                : `Tệp trong Bucket "${r2Status?.bucket || 'upbase-b2c-brands'}"`
            }
            actions={
              <div className="flex items-center gap-2">
                <Status tone={r2Status?.configured ? 'positive' : 'info'}>
                  {r2Status?.configured
                    ? `Bucket: ${r2Status.bucket}`
                    : 'Lưu trên máy chủ (.brand-data/files)'}
                </Status>
                {!r2Status?.configured && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Settings}
                    onClick={() => setActiveTab('R2_CONFIG')}
                  >
                    Nhập khóa R2
                  </Button>
                )}
              </div>
            }
          >
            <div className="space-y-3">
              <FilterBar
                search={{
                  value: searchQuery,
                  onChange: (v: string) => {
                    setSearchQuery(v);
                    setFilePage(1);
                  },
                  placeholder: 'Tìm theo tên tệp, đường dẫn, thương hiệu, người tải…',
                }}
                chips={
                  <Chips
                    items={storageChips}
                    value={storageFilter}
                    onChange={v => {
                      setStorageFilter(v);
                      setFilePage(1);
                    }}
                  />
                }
              />

              {sourceMode === 'BRAND_DOCS' && (
                <div className="pt-1">
                  <Chips
                    items={categoryChips}
                    value={categoryFilter}
                    onChange={v => {
                      setCategoryFilter(v);
                      setFilePage(1);
                    }}
                  />
                </div>
              )}

              {sourceMode === 'BRAND_DOCS' ? (
                <>
                  <DataTable
                    columns={fileColumns}
                    rows={pagedBrandFiles}
                    rowKey={item => item.uid}
                    empty={
                      <EmptyState
                        title="Không có tệp nào khớp bộ lọc"
                        action={
                          <Button variant="primary" icon={Upload} onClick={() => openUploadForBrand()}>
                            Tải tệp lên
                          </Button>
                        }
                      />
                    }
                  />
                  <Pagination
                    page={filePage}
                    pageSize={FILE_PAGE_SIZE}
                    total={filteredBrandFiles.length}
                    onPageChange={setFilePage}
                  />
                </>
              ) : (
                <>
                  {r2Status?.storedObjects?.r2Error && (
                    <div className="rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-xs text-warning flex items-center justify-between gap-3">
                      <span>{r2Status.storedObjects.r2Error}</span>
                      <Button size="sm" variant="secondary" onClick={() => setActiveTab('R2_CONFIG')}>
                        Kiểm tra khóa R2
                      </Button>
                    </div>
                  )}
                  <DataTable
                    columns={bucketObjectColumns}
                    rows={pagedBucketObjects}
                    rowKey={obj => obj.key}
                    empty={
                      <EmptyState
                        title="Chưa có tệp nào trong Bucket"
                        action={
                          <Button variant="primary" icon={Upload} onClick={() => openUploadForBrand()}>
                            Tải tệp lên
                          </Button>
                        }
                      />
                    }
                  />
                  <Pagination
                    page={filePage}
                    pageSize={FILE_PAGE_SIZE}
                    total={filteredBucketObjects.length}
                    onPageChange={setFilePage}
                  />
                </>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* 4. NỘI DUNG TAB 2: DUNG LƯỢNG THEO THƯƠNG HIỆU */}
      {activeTab === 'BRAND_STORAGE' && (
        <Panel
          title="Tài liệu theo thương hiệu"
          actions={
            <Button size="sm" variant="primary" icon={Upload} onClick={() => openUploadForBrand()}>
              Tải tệp lên
            </Button>
          }
        >
          <div className="space-y-3">
            <FilterBar
              search={{
                value: searchQuery,
                onChange: (v: string) => {
                  setSearchQuery(v);
                  setBrandPage(1);
                },
                placeholder: 'Tìm theo tên thương hiệu, mã nhãn, ngành hàng, PIC…',
              }}
            />
            <DataTable
              columns={brandStorageColumns}
              rows={pagedBrandStorage}
              rowKey={r => r.key}
              onRowClick={r => {
                setBrandFilter(r.key);
                setActiveTab('FILES_MANAGER');
              }}
            />
            <Pagination
              page={brandPage}
              pageSize={BRAND_PAGE_SIZE}
              total={filteredBrandStorageRows.length}
              onPageChange={setBrandPage}
            />
          </div>
        </Panel>
      )}

      {/* 5. NỘI DUNG TAB 3: CẤU HÌNH KẾT NỐI */}
      {activeTab === 'R2_CONFIG' && (
        <CloudflareR2SetupPanel
          onNotify={onNotify}
          onStatusChange={() => {
            void loadR2Status(true);
          }}
        />
      )}

      {/* HỘP THOẠI TẢI TỆP MỚI LÊN R2 */}
      <Modal
        open={uploadModalOpen}
        onClose={() => !uploading && setUploadModalOpen(false)}
        title="Tải tệp thương hiệu"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" disabled={uploading} onClick={() => setUploadModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={uploading ? Loader2 : Upload}
              disabled={uploading || selectedFiles.length === 0 || !uploadBrandName}
              onClick={() => void handleUploadSubmit()}
            >
              {uploading ? 'Đang tải lên…' : `Tải lên (${selectedFiles.length} tệp)`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Thương hiệu *">
              <Select
                value={uploadBrandName}
                onChange={e => setUploadBrandName(e.target.value)}
              >
                {rows.map(r => (
                  <option key={r.key} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Phân loại tài liệu *">
              <Select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value as BrandDocCategory)}
              >
                {(Object.entries(DOC_CATEGORY_LABEL) as Array<[BrandDocCategory, string]>).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>

          <Field label="Chọn tệp từ máy tính (Tối đa 25 MB/tệp) *">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={e => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                setSelectedFiles(list);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                icon={FolderOpen}
                onClick={() => fileInputRef.current?.click()}
              >
                Chọn tệp đính kèm
              </Button>
              <span className="text-xs text-ink-2">
                {selectedFiles.length > 0
                  ? `Đã chọn ${selectedFiles.length} tệp (${formatFileSize(
                      selectedFiles.reduce((s, f) => s + f.size, 0),
                    )})`
                  : 'PDF, DOCX, XLSX, PPTX, PNG, JPG, WEBP, ZIP'}
              </span>
            </div>
            {selectedFiles.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-lg border border-line bg-sunken px-3 py-2 text-xs">
                {selectedFiles.map((f, idx) => (
                  <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink truncate">{f.name}</span>
                    <span className="text-2xs text-ink-3 tabular-nums shrink-0">
                      {formatFileSize(f.size)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          {selectedFiles.length <= 1 && (
            <Field label="Tên hiển thị (bỏ trống sẽ lấy theo tên tệp)">
              <Input
                value={uploadCustomTitle}
                onChange={e => setUploadCustomTitle(e.target.value)}
                placeholder="VD: Brand Guideline Q4/2026"
              />
            </Field>
          )}

          <Field label="Ghi chú">
            <Textarea
              rows={2}
              value={uploadNote}
              onChange={e => setUploadNote(e.target.value)}
              placeholder="Ghi chú cho KOC hoặc chuyên viên…"
            />
          </Field>
        </div>
      </Modal>

      {/* HỘP THOẠI XÁC NHẬN XÓA TÀI LIỆU HỒ SƠ */}
      <ConfirmDialog
        open={Boolean(deletingDoc)}
        onCancel={() => !deletingBusy && setDeletingDoc(null)}
        onConfirm={() => void handleConfirmDeleteBrandDoc()}
        title="Xóa tài liệu thương hiệu"
        description={
          deletingDoc
            ? `Xóa "${deletingDoc.title}" khỏi hồ sơ ${deletingDoc.brandName}?`
            : ''
        }
        confirmLabel={deletingBusy ? 'Đang xóa…' : 'Xóa tệp'}
        tone="danger"
      />

      {/* HỘP THOẠI XÁC NHẬN XÓA TỆP TRÊN BUCKET */}
      <ConfirmDialog
        open={Boolean(deletingObject)}
        onCancel={() => !deletingBusy && setDeletingObject(null)}
        onConfirm={() => void handleConfirmDeleteBucketObject()}
        title="Xóa tệp trên kho lưu trữ"
        description={
          deletingObject
            ? `Xóa tệp "${deletingObject.key}" (${formatFileSize(deletingObject.size)}) khỏi kho lưu trữ?`
            : ''
        }
        confirmLabel={deletingBusy ? 'Đang xóa…' : 'Xóa tệp'}
        tone="danger"
      />
    </div>
  );
}
