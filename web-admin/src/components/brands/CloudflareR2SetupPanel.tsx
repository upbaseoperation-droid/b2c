'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { Button, ConfirmDialog, Field, Input, Modal, Panel, Status } from '../ui';
import { formatFileSize } from './brandUi';

export interface R2TestResultPayload {
  ok: boolean;
  status: number;
  latencyMs: number;
  testedAt: string;
  message: string;
  bucket: string;
  endpoint: string;
  writeVerified: boolean;
  readVerified: boolean;
  deleteVerified: boolean;
}

export interface R2StatusPayload {
  configured: boolean;
  storageMode: 'CLOUDFLARE_R2' | 'LOCAL_STORAGE';
  source: 'UI_CONFIG' | 'ENV' | 'NONE';
  accountId: string;
  bucket: string;
  endpoint: string;
  publicUrl: string;
  accessKeyId: string;
  maskedAccessKeyId: string;
  hasSecretAccessKey: boolean;
  maskedSecretAccessKey: string;
  updatedAt: string | null;
  updatedBy: string | null;
  lastTest: R2TestResultPayload | null;
  localFiles: {
    count: number;
    totalBytes: number;
  };
  envSnippet: string;
}

export const R2_CONFIG_CHANGED_EVENT = 'upbase-r2-config-changed';

export function CloudflareR2SetupPanel({
  onNotify,
  onStatusChange,
}: {
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onStatusChange?: (status: R2StatusPayload) => void;
}) {
  const [status, setStatus] = useState<R2StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Form states
  const [accountId, setAccountId] = useState('');
  const [bucket, setBucket] = useState('upbase-b2c-brands');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const [latestTestResult, setLatestTestResult] = useState<R2TestResultPayload | null>(null);

  const applyServerStatus = useCallback(
    (data: R2StatusPayload, preserveDraftSecret = false) => {
      setStatus(data);
      setAccountId(data.accountId || '');
      setBucket(data.bucket || 'upbase-b2c-brands');
      setAccessKeyId(data.accessKeyId || '');
      if (!preserveDraftSecret) {
        setSecretAccessKey('');
      }
      setEndpoint(data.endpoint || '');
      setPublicUrl(data.publicUrl || '');
      if (data.lastTest) {
        setLatestTestResult(data.lastTest);
      }
      onStatusChange?.(data);
    },
    [onStatusChange],
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/integrations/cloudflare-r2', { cache: 'no-store' })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && data.ok) {
          applyServerStatus(data as R2StatusPayload);
        }
      })
      .catch(() => {
        // Ignore network error on initial load
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyServerStatus]);

  // Tự động tách Account ID và Endpoint chuẩn khi người dùng dán S3 URL từ Cloudflare
  const handleEndpointChange = (rawVal: string) => {
    setEndpoint(rawVal);
    const trimmed = rawVal.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
      const hostMatch = parsed.hostname.match(/^([a-z0-9]+)(?:\.[a-z0-9-]+)?\.r2\.cloudflarestorage\.com$/i);
      if (hostMatch && !accountId.trim()) {
        setAccountId(hostMatch[1]);
      }
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length === 1) {
        if (!bucket.trim() || bucket === 'upbase-b2c-brands') {
          setBucket(segments[0]);
        }
        setEndpoint(parsed.origin);
      }
    } catch {
      // Giữ nguyên giá trị người dùng đang gõ
    }
  };

  const handleAccountIdChange = (rawVal: string) => {
    const clean = rawVal.trim();
    setAccountId(clean);
    if (clean && (!endpoint.trim() || /^https:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com$/i.test(endpoint.trim()))) {
      setEndpoint(`https://${clean}.r2.cloudflarestorage.com`);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/integrations/cloudflare-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          accountId,
          bucket,
          accessKeyId,
          secretAccessKey,
          endpoint,
          publicUrl,
        }),
      });
      const data = await res.json();
      if (data.testResult) {
        setLatestTestResult(data.testResult as R2TestResultPayload);
      }
      if (data.ok) {
        onNotify?.(data.testResult?.message || 'Kết nối Cloudflare R2 thành công!', 'success');
      } else {
        onNotify?.(data.error || 'Không kết nối được tới Cloudflare R2.', 'warning');
      }
    } catch (e) {
      onNotify?.((e as Error).message || 'Lỗi mạng khi kiểm tra kết nối R2.', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/integrations/cloudflare-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_CONFIG',
          accountId,
          bucket,
          accessKeyId,
          secretAccessKey,
          endpoint,
          publicUrl,
          testAfterSave: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onNotify?.(data.error || 'Không lưu được cấu hình Cloudflare R2.', 'error');
        return;
      }
      applyServerStatus(data as R2StatusPayload);
      if (data.testResult) {
        setLatestTestResult(data.testResult as R2TestResultPayload);
      }
      window.dispatchEvent(new CustomEvent(R2_CONFIG_CHANGED_EVENT, { detail: data }));
      if (data.testResult && !data.testResult.ok) {
        onNotify?.(`Đã lưu cấu hình nhưng kiểm tra kết nối báo lỗi: ${data.testResult.message}`, 'warning');
      } else {
        onNotify?.(data.message || 'Đã lưu và kích hoạt kho lưu trữ Cloudflare R2!', 'success');
      }
    } catch (e) {
      onNotify?.((e as Error).message || 'Lỗi khi lưu cấu hình Cloudflare R2.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMigrateLocalFiles = async () => {
    setMigrating(true);
    try {
      const res = await fetch('/api/integrations/cloudflare-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MIGRATE_LOCAL_FILES' }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify?.(data.error || 'Không đồng bộ được tệp cục bộ lên R2.', 'error');
        return;
      }
      applyServerStatus(data as R2StatusPayload, true);
      if (data.migration?.failedCount > 0) {
        onNotify?.(
          `Đồng bộ ${data.migration.migratedCount} tệp thành công, ${data.migration.failedCount} tệp lỗi.`,
          'warning',
        );
      } else {
        onNotify?.(data.message || 'Đã đồng bộ tệp cục bộ lên Cloudflare R2!', 'success');
      }
    } catch (e) {
      onNotify?.((e as Error).message || 'Lỗi khi đồng bộ tệp lên R2.', 'error');
    } finally {
      setMigrating(false);
    }
  };

  const handleClearConfig = async () => {
    setConfirmClearOpen(false);
    setSaving(true);
    try {
      const res = await fetch('/api/integrations/cloudflare-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_CONFIG' }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        applyServerStatus(data as R2StatusPayload);
        setLatestTestResult(null);
        window.dispatchEvent(new CustomEvent(R2_CONFIG_CHANGED_EVENT, { detail: data }));
        onNotify?.(data.message || 'Đã gỡ cấu hình R2.', 'info');
      }
    } catch (e) {
      onNotify?.((e as Error).message || 'Không gỡ được cấu hình R2.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildEnvBlockToCopy = () => {
    const resolvedEndpoint =
      endpoint.trim() || (accountId.trim() ? `https://${accountId.trim()}.r2.cloudflarestorage.com` : '');
    const secretVal = secretAccessKey.trim() || (status?.hasSecretAccessKey ? '<DIEN_SECRET_ACCESS_KEY_CUA_BAN>' : '');
    return [
      '# LƯU TRỮ TỆP THƯƠNG HIỆU (CLOUDFLARE R2 OBJECT STORAGE)',
      `R2_ACCOUNT_ID="${accountId.trim()}"`,
      `R2_ACCESS_KEY_ID="${accessKeyId.trim()}"`,
      `R2_SECRET_ACCESS_KEY="${secretVal}"`,
      `R2_BUCKET_NAME="${bucket.trim() || 'upbase-b2c-brands'}"`,
      `R2_ENDPOINT="${resolvedEndpoint}"`,
      `R2_PUBLIC_URL="${publicUrl.trim()}"`,
    ].join('\n');
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(buildEnvBlockToCopy());
    setCopiedEnv(true);
    onNotify?.('Đã sao chép biến môi trường R2 cho file .env.local!', 'info');
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const isR2Active = status?.storageMode === 'CLOUDFLARE_R2';

  return (
    <div className="space-y-5">
      {/* 1. THẺ TỔNG QUAN TRẠNG THÁI LƯU TRỮ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-semibold text-ink-3">Kho lưu trữ tệp</span>
            <Status tone={isR2Active ? 'positive' : 'warning'}>
              {isR2Active ? 'Cloudflare R2' : 'Lưu trên máy chủ'}
            </Status>
          </div>
          <div className="text-sm font-semibold text-ink flex items-center gap-2">
            {isR2Active ? (
              <>
                <Cloud className="w-4 h-4 text-positive shrink-0" />
                <span>Đang dùng Cloudflare R2</span>
              </>
            ) : (
              <>
                <HardDrive className="w-4 h-4 text-warning shrink-0" />
                <span>Thư mục .brand-data/files</span>
              </>
            )}
          </div>
          <div className="text-2xs text-ink-3">
            Nguồn: {status?.source === 'UI_CONFIG' ? 'Cấu hình trên hệ thống' : status?.source === 'ENV' ? 'Biến môi trường (.env)' : 'Mặc định máy chủ'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-semibold text-ink-3">Bucket &amp; Khóa kết nối</span>
            <Status tone={status?.hasSecretAccessKey ? 'info' : 'neutral'}>
              {status?.hasSecretAccessKey ? 'Đã có khóa' : 'Chưa nhập khóa'}
            </Status>
          </div>
          <div className="text-sm font-mono font-semibold text-ink truncate">
            {status?.bucket || bucket || 'upbase-b2c-brands'}
          </div>
          <div className="text-2xs font-mono text-ink-3 truncate">
            {status?.maskedAccessKeyId ? `Key: ${status.maskedAccessKeyId}` : 'Chưa cấu hình Access Key'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-semibold text-ink-3">Trạng thái kết nối</span>
            <Status
              tone={
                latestTestResult?.ok
                  ? 'positive'
                  : latestTestResult
                    ? 'critical'
                    : 'neutral'
              }
            >
              {latestTestResult?.ok
                ? `Kết nối tốt (${latestTestResult.latencyMs}ms)`
                : latestTestResult
                  ? 'Lỗi kết nối'
                  : 'Chưa kiểm tra'}
            </Status>
          </div>
          <div className="text-xs font-semibold text-ink truncate">
            {latestTestResult?.ok
              ? 'Đủ quyền Ghi · Đọc · Xóa'
              : latestTestResult
                ? 'Cần kiểm tra lại khóa hoặc bucket'
                : 'Bấm "Kiểm tra kết nối"'}
          </div>
          <div className="text-2xs text-ink-3 truncate">
            {latestTestResult?.testedAt
              ? `Lần cuối: ${new Date(latestTestResult.testedAt).toLocaleString('vi-VN')}`
              : 'Hỗ trợ PDF, Word, Excel, Ảnh ≤ 25MB'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-semibold text-ink-3">Tệp trên máy chủ</span>
            <span className="text-2xs font-mono font-semibold text-ink-2">
              {status?.localFiles.count || 0} tệp
            </span>
          </div>
          <div className="text-sm font-semibold text-ink">
            {formatFileSize(status?.localFiles.totalBytes || 0) || '0 B'}
          </div>
          <div>
            {isR2Active && (status?.localFiles.count || 0) > 0 ? (
              <button
                type="button"
                disabled={migrating}
                onClick={handleMigrateLocalFiles}
                className="text-2xs font-semibold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{migrating ? 'Đang đồng bộ lên R2...' : 'Đồng bộ toàn bộ lên R2'}</span>
              </button>
            ) : (
              <span className="text-2xs text-ink-3">Dùng khi chưa nhập khóa R2</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. HƯỚNG DẪN TỪNG BƯỚC TẠO CLOUDFLARE R2 TRÊN DASHBOARD */}
      <Panel
        title="Cách lấy thông tin kết nối trên Cloudflare"
        actions={
          <a
            href="https://dash.cloudflare.com/?to=/:account/r2/overview"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-accent-soft text-accent border border-line hover:bg-accent hover:text-white transition inline-flex items-center gap-2"
          >
            <span>Mở Cloudflare R2</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
          <div className="rounded-xl border border-line bg-canvas/60 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-semibold flex items-center justify-center shrink-0">
                1
              </span>
              <span className="font-semibold text-ink">Tạo Bucket</span>
            </div>
            <ul className="space-y-1 text-ink-2 leading-relaxed list-disc pl-4">
              <li>Mở <strong>Cloudflare Dashboard</strong> → chọn <strong>R2 Object Storage</strong> ở menu trái.</li>
              <li>Bấm <strong>Create bucket</strong>.</li>
              <li>Đặt tên <code className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-ink">upbase-b2c-brands</code>, chọn Location <strong>Automatic (Asia-Pacific)</strong> rồi bấm <strong>Create bucket</strong>.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-canvas/60 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-semibold flex items-center justify-center shrink-0">
                2
              </span>
              <span className="font-semibold text-ink">Tạo API Token</span>
            </div>
            <ul className="space-y-1 text-ink-2 leading-relaxed list-disc pl-4">
              <li>Tại trang <strong>R2 Overview</strong>, nhìn sang cột phải và bấm <strong>Manage R2 API Tokens</strong>.</li>
              <li>Bấm <strong>Create API token</strong>.</li>
              <li>Mục <strong>Permissions</strong>: chọn <strong>Object Read &amp; Write</strong>.</li>
              <li>Mục <strong>Specify bucket(s)</strong>: chọn <code className="px-1 py-0.5 rounded bg-surface border border-line font-mono text-ink">upbase-b2c-brands</code> → bấm <strong>Create API Token</strong>.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-canvas/60 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-semibold flex items-center justify-center shrink-0">
                3
              </span>
              <span className="font-semibold text-ink">Sao chép khóa kết nối</span>
            </div>
            <ul className="space-y-1 text-ink-2 leading-relaxed list-disc pl-4">
              <li>Sao chép <strong>Access Key ID</strong> (32 ký tự).</li>
              <li>Sao chép <strong>Secret Access Key</strong> (64 ký tự).</li>
              <li>Sao chép đường dẫn <strong>S3 Endpoint</strong> dạng <code className="px-1 py-0.5 rounded bg-surface border border-line font-mono text-ink">https://&lt;ACCOUNT_ID&gt;.r2.cloudflarestorage.com</code>.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-canvas/60 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-semibold flex items-center justify-center shrink-0">
                4
              </span>
              <span className="font-semibold text-ink">Kiểm tra &amp; Lưu</span>
            </div>
            <ul className="space-y-1 text-ink-2 leading-relaxed list-disc pl-4">
              <li>Dán các thông tin vừa lấy vào khung bên dưới.</li>
              <li>Bấm <strong>Kiểm tra kết nối</strong> để thử Ghi, Đọc và Xóa tệp trên Bucket.</li>
              <li>Khi kết nối thành công, bấm <strong>Lưu cấu hình</strong>.</li>
            </ul>
          </div>
        </div>
      </Panel>

      {/* 3. BIỂU MẪU NHẬP KHÓA & KIỂM TRA KẾT NỐI TRỰC TIẾP */}
      <Panel
        title="Thông tin kết nối Cloudflare R2"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={copiedEnv ? Check : Copy}
              onClick={handleCopyEnv}
            >
              {copiedEnv ? 'Đã chép .env.local' : 'Chép .env.local'}
            </Button>
            {status?.source === 'UI_CONFIG' && (
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmClearOpen(true)}
              >
                Gỡ cấu hình
              </Button>
            )}
          </div>
        }
      >
        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-ink-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải cấu hình lưu trữ...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="1. Cloudflare Account ID (R2_ACCOUNT_ID)" htmlFor="r2-account-id">
                <Input
                  id="r2-account-id"
                  value={accountId}
                  onChange={e => handleAccountIdChange(e.target.value)}
                  placeholder="VD: 8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c"
                  className="font-mono"
                />
              </Field>

              <Field label="2. Tên Bucket (R2_BUCKET_NAME)" htmlFor="r2-bucket-name">
                <Input
                  id="r2-bucket-name"
                  value={bucket}
                  onChange={e => setBucket(e.target.value)}
                  placeholder="upbase-b2c-brands"
                  className="font-mono"
                />
              </Field>

              <Field label="3. Đường dẫn S3 Endpoint (R2_ENDPOINT)" htmlFor="r2-endpoint">
                <Input
                  id="r2-endpoint"
                  value={endpoint}
                  onChange={e => handleEndpointChange(e.target.value)}
                  placeholder="https://<account_id>.r2.cloudflarestorage.com"
                  className="font-mono"
                />
              </Field>

              <Field label="4. Access Key ID (R2_ACCESS_KEY_ID)" htmlFor="r2-access-key">
                <Input
                  id="r2-access-key"
                  value={accessKeyId}
                  onChange={e => setAccessKeyId(e.target.value)}
                  placeholder="Dán Access Key ID (32 ký tự)"
                  className="font-mono"
                />
              </Field>

              <Field label="5. Secret Access Key (R2_SECRET_ACCESS_KEY)" htmlFor="r2-secret-key">
                <div className="relative flex items-center">
                  <input
                    id="r2-secret-key"
                    type={showSecret ? 'text' : 'password'}
                    value={secretAccessKey}
                    onChange={e => setSecretAccessKey(e.target.value)}
                    placeholder={
                      status?.hasSecretAccessKey
                        ? `Đã lưu (${status.maskedSecretAccessKey}) — Nhập nếu muốn đổi khóa mới`
                        : 'Dán Secret Access Key (64 ký tự)'
                    }
                    className="w-full h-9 pl-3 pr-10 text-xs font-mono rounded-lg border border-line-strong bg-surface text-ink focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(v => !v)}
                    className="absolute right-2 p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
                    title={showSecret ? 'Ẩn Secret Key' : 'Hiện Secret Key'}
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Field>

              <Field label="6. Domain công khai tùy chọn (R2_PUBLIC_URL)" htmlFor="r2-public-url">
                <Input
                  id="r2-public-url"
                  value={publicUrl}
                  onChange={e => setPublicUrl(e.target.value)}
                  placeholder="Bỏ trống để đọc qua /api/brands/files"
                  className="font-mono"
                />
              </Field>
            </div>

            {/* KẾT QUẢ KIỂM TRA KẾT NỐI */}
            {latestTestResult && (
              <div
                className={`rounded-xl border p-4 space-y-3 ${
                  latestTestResult.ok
                    ? 'bg-positive-soft/40 border-positive/30 text-ink'
                    : 'bg-critical-soft/40 border-critical/30 text-ink'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {latestTestResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-positive shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-critical shrink-0" />
                    )}
                    <span className="text-xs font-semibold">
                      {latestTestResult.message}
                    </span>
                  </div>
                  <span className="text-2xs font-mono text-ink-2">
                    Độ trễ: <strong>{latestTestResult.latencyMs}ms</strong> · Bucket: <strong>{latestTestResult.bucket}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-2xs pt-1 border-t border-line/60">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span className={latestTestResult.writeVerified ? 'text-positive font-semibold' : 'text-critical font-semibold'}>
                      {latestTestResult.writeVerified ? '✓' : '✕'}
                    </span>
                    <span>Ghi tệp (PUT)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span className={latestTestResult.readVerified ? 'text-positive font-semibold' : 'text-critical font-semibold'}>
                      {latestTestResult.readVerified ? '✓' : '✕'}
                    </span>
                    <span>Đọc tệp (GET)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span className={latestTestResult.deleteVerified ? 'text-positive font-semibold' : 'text-critical font-semibold'}>
                      {latestTestResult.deleteVerified ? '✓' : '✕'}
                    </span>
                    <span>Xóa tệp nháp (DELETE)</span>
                  </span>
                </div>
              </div>
            )}

            {/* THANH NÚT HÀNH ĐỘNG */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
              <div className="text-xs text-ink-2 flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                <span>
                  Đường dẫn lưu tệp: <code className="font-mono text-ink bg-canvas px-2 py-0.5 rounded border border-line">brands/&lt;ten-thuong-hieu&gt;/&lt;yyyy-mm&gt;/&lt;uuid&gt;-&lt;ten-file&gt;</code>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  icon={testing ? Loader2 : RefreshCw}
                  disabled={testing || saving}
                  onClick={handleTestConnection}
                >
                  {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                </Button>

                <Button
                  variant="primary"
                  icon={saving ? Loader2 : Save}
                  disabled={saving || testing}
                  onClick={handleSaveConfig}
                >
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={confirmClearOpen}
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={handleClearConfig}
        title="Gỡ cấu hình Cloudflare R2?"
        description="Xóa thông tin khóa R2 đã lưu và chuyển về lưu tệp tại thư mục .brand-data/files trên máy chủ."
        confirmLabel="Gỡ cấu hình"
        tone="danger"
      />
    </div>
  );
}

export function CloudflareR2SetupModal({
  open,
  onClose,
  onNotify,
  onStatusChange,
}: {
  open: boolean;
  onClose: () => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onStatusChange?: (status: R2StatusPayload) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cấu hình Cloudflare R2"
      size="xl"
    >
      <CloudflareR2SetupPanel onNotify={onNotify} onStatusChange={onStatusChange} />
    </Modal>
  );
}
