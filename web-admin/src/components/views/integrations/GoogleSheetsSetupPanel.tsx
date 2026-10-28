'use client';

import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Code2,
  Save,
  Lock,
  RotateCcw,
  Plus,
} from 'lucide-react';
import {
  Panel,
  Button,
  Field,
  Input,
  Textarea,
  Status,
  Modal,
  Select,
} from '@/components/ui';

export interface AppsScriptModuleItem {
  id: string;
  name: string;
  triggerType: 'onEdit' | 'onOpen';
  targetColumns: string;
  purpose: string;
  enabled: boolean;
  isBuiltIn?: boolean;
  codeBody: string;
}

interface GoogleSheetsSetupPanelProps {
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const GoogleSheetsSetupPanel: React.FC<GoogleSheetsSetupPanelProps> = ({ onNotify }) => {
  // Service Account States
  const [saConfigured, setSaConfigured] = useState(false);
  const [saEmail, setSaEmail] = useState('');
  const [saJsonInput, setSaJsonInput] = useState('');
  const [savingSa, setSavingSa] = useState(false);

  // Apps Script States
  const [appsScriptConfigured, setAppsScriptConfigured] = useState(false);
  const [appsScriptClientIdMasked, setAppsScriptClientIdMasked] = useState<string | null>(null);
  const [oauthClientIdInput, setOauthClientIdInput] = useState('');
  const [oauthClientSecretInput, setOauthClientSecretInput] = useState('');
  const [oauthRefreshTokenInput, setOauthRefreshTokenInput] = useState('');
  const [appsScriptModules, setAppsScriptModules] = useState<AppsScriptModuleItem[]>([]);
  const [defaultAppsScriptModules, setDefaultAppsScriptModules] = useState<AppsScriptModuleItem[]>([]);
  const [savingAppsScriptOAuth, setSavingAppsScriptOAuth] = useState(false);
  const [editingModuleDraft, setEditingModuleDraft] = useState<AppsScriptModuleItem | null>(null);
  const [isAddingNewModule, setIsAddingNewModule] = useState(false);
  const [showRawCodePreview, setShowRawCodePreview] = useState(false);

  // Load Service Account State
  useEffect(() => {
    fetch('/api/booking-list/push-sheet')
      .then((r) => r.json())
      .then(async (d: { configured?: boolean; serviceAccountEmail?: string }) => {
        if (d.configured) {
          setSaConfigured(true);
          if (d.serviceAccountEmail) setSaEmail(d.serviceAccountEmail);
          return;
        }
        const cachedJson =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('upbase_b2c_google_sa_config_v1')
            : null;
        if (cachedJson && cachedJson.trim()) {
          const restoreRes = await fetch('/api/booking-list/push-sheet', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceAccountJson: cachedJson.trim() }),
          }).catch(() => null);
          const restored = (await restoreRes?.json().catch(() => null)) as {
            configured?: boolean;
            serviceAccountEmail?: string;
          } | null;
          if (restored?.configured) {
            setSaConfigured(true);
            if (restored.serviceAccountEmail) setSaEmail(restored.serviceAccountEmail);
            return;
          }
        }
        setSaConfigured(false);
      })
      .catch(() => {});

    // Load Apps Script Config
    fetch('/api/booking-list/setup-appscript')
      .then((r) => r.json())
      .then(
        (d: {
          configured?: boolean;
          clientIdMasked?: string | null;
          modules?: AppsScriptModuleItem[];
          defaultModules?: AppsScriptModuleItem[];
        }) => {
          setAppsScriptConfigured(Boolean(d.configured));
          if (d.clientIdMasked) setAppsScriptClientIdMasked(d.clientIdMasked);
          if (Array.isArray(d.modules)) setAppsScriptModules(d.modules);
          if (Array.isArray(d.defaultModules)) setDefaultAppsScriptModules(d.defaultModules);
        }
      )
      .catch(() => {});
  }, []);

  const handleSaveServiceAccount = async () => {
    if (!saJsonInput.trim()) return;
    setSavingSa(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountJson: saJsonInput.trim() }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        configured?: boolean;
        serviceAccountEmail?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Không lưu được tài khoản Google Service Account.');
      }
      setSaConfigured(true);
      if (data.serviceAccountEmail) setSaEmail(data.serviceAccountEmail);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('upbase_b2c_google_sa_config_v1', saJsonInput.trim());
        } catch {
          /* ignore */
        }
      }
      onNotify?.(
        `Đã lưu và kết nối tài khoản dịch vụ Google (${data.serviceAccountEmail || 'thành công'}).`,
        'success'
      );
      setSaJsonInput('');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Lỗi kết nối Service Account.', 'error');
    } finally {
      setSavingSa(false);
    }
  };

  const handleSaveAppsScriptOAuthConfig = async () => {
    setSavingAppsScriptOAuth(true);
    try {
      const payload: {
        clientId?: string;
        clientSecret?: string;
        refreshToken?: string;
        modules?: AppsScriptModuleItem[];
      } = {
        modules: appsScriptModules,
      };
      if (oauthClientIdInput.trim()) payload.clientId = oauthClientIdInput.trim();
      if (oauthClientSecretInput.trim()) payload.clientSecret = oauthClientSecretInput.trim();
      if (oauthRefreshTokenInput.trim()) payload.refreshToken = oauthRefreshTokenInput.trim();

      const res = await fetch('/api/booking-list/setup-appscript', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        configured?: boolean;
        clientIdMasked?: string | null;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Không lưu được cấu hình Google Apps Script API.');
      }
      setAppsScriptConfigured(Boolean(data.configured));
      if (data.clientIdMasked) setAppsScriptClientIdMasked(data.clientIdMasked);
      setOauthClientIdInput('');
      setOauthClientSecretInput('');
      setOauthRefreshTokenInput('');
      onNotify?.('Đã lưu cấu hình Google Apps Script API thành công.', 'success');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Lỗi lưu cấu hình Apps Script.', 'error');
    } finally {
      setSavingAppsScriptOAuth(false);
    }
  };

  const handleToggleModuleEnabled = (modId: string) => {
    setAppsScriptModules((prev) =>
      prev.map((m) => (m.id === modId ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleResetDefaultModules = () => {
    if (defaultAppsScriptModules.length > 0) {
      setAppsScriptModules(defaultAppsScriptModules);
      onNotify?.('Đã khôi phục các script tiện ích mặc định.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Google Service Account (Đọc & Ghi Sheet 57 cột) */}
      <Panel
        title="1. Tài khoản dịch vụ Google (Google Service Account)"
        actions={
          <Button
            size="sm"
            variant="primary"
            icon={KeyRound}
            disabled={savingSa || !saJsonInput.trim()}
            onClick={() => void handleSaveServiceAccount()}
          >
            {savingSa ? 'Đang lưu…' : 'Lưu cấu hình Service Account'}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-sunken border border-line text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ink-2 font-medium">Trạng thái kết nối:</span>
              {saConfigured ? (
                <Status tone="positive">Đã kết nối Service Account</Status>
              ) : (
                <Status tone="warning">Chưa cấu hình Service Account</Status>
              )}
            </div>
            {saEmail && (
              <div className="text-ink-2">
                Email cấp quyền Editor trên Google Sheet:{' '}
                <code className="rounded bg-surface px-2 py-0.5 font-mono text-ink border border-line">
                  {saEmail}
                </code>
              </div>
            )}
          </div>

          <Field label="Dán mã khóa JSON của Google Service Account (tải từ Google Cloud Console)">
            <Textarea
              rows={4}
              value={saJsonInput}
              onChange={(e) => setSaJsonInput(e.target.value)}
              placeholder='{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...",\n  "client_email": "testupbae@...iam.gserviceaccount.com"\n}'
              className="font-mono text-2xs"
            />
          </Field>
        </div>
      </Panel>

      {/* 2. Google Apps Script OAuth & Tự Động Hóa Sheet (onEdit) */}
      <Panel
        title="2. Quản lý Tự động hóa Google Sheet (Google Apps Script onEdit)"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={RotateCcw}
              onClick={handleResetDefaultModules}
            >
              Khôi phục Script chuẩn
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Save}
              disabled={savingAppsScriptOAuth}
              onClick={() => void handleSaveAppsScriptOAuthConfig()}
            >
              {savingAppsScriptOAuth ? 'Đang lưu…' : 'Lưu cấu hình Apps Script'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-sunken border border-line text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ink-2 font-medium">OAuth 2.0 API Apps Script:</span>
              {appsScriptConfigured ? (
                <Status tone="positive">
                  Đã cấu hình API {appsScriptClientIdMasked ? `(${appsScriptClientIdMasked})` : ''}
                </Status>
              ) : (
                <Status tone="warning">Chưa nạp Refresh Token</Status>
              )}
            </div>
            <span className="text-2xs text-ink-3">
              Cho phép hệ thống đẩy mã Macro onEdit đóng dấu ngày giờ duyệt tự động trực tiếp vào file Sheet của Brand.
            </span>
          </div>

          {/* Form nhập OAuth nếu chưa có hoặc muốn đổi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Google Client ID">
              <Input
                value={oauthClientIdInput}
                onChange={(e) => setOauthClientIdInput(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
              />
            </Field>
            <Field label="Google Client Secret">
              <Input
                type="password"
                value={oauthClientSecretInput}
                onChange={(e) => setOauthClientSecretInput(e.target.value)}
                placeholder="GOCSPX-xxxx"
              />
            </Field>
            <Field label="OAuth Refresh Token">
              <Input
                type="password"
                value={oauthRefreshTokenInput}
                onChange={(e) => setOauthRefreshTokenInput(e.target.value)}
                placeholder="1//04xxxx..."
              />
            </Field>
          </div>

          {/* Danh mục Modules Apps Script */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="text-xs font-semibold text-ink">
              Các tiện ích Macro tự động trên Sheet ({appsScriptModules.filter((m) => m.enabled).length}/{appsScriptModules.length} kích hoạt)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {appsScriptModules.map((mod) => (
                <div
                  key={mod.id}
                  className={`p-3 rounded-lg border transition ${
                    mod.enabled
                      ? 'bg-surface border-line-strong'
                      : 'bg-sunken/40 border-line opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={mod.enabled}
                        onChange={() => handleToggleModuleEnabled(mod.id)}
                        className="rounded border-line-strong text-primary focus:ring-0"
                      />
                      <span className="text-xs font-semibold text-ink">{mod.name}</span>
                    </label>
                    <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-sunken text-ink-3">
                      {mod.triggerType}
                    </span>
                  </div>
                  <div className="text-2xs text-ink-3 mt-1 leading-relaxed">
                    {mod.purpose}
                  </div>
                  <div className="text-3xs text-accent mt-1.5 font-mono">
                    Cột tác động: {mod.targetColumns}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};
