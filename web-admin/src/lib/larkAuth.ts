// ==============================================================================
// UPBASE B2C MARKETING OPERATIONS HUB — LARK OAUTH 2.0 / SSO SERVICE
// ==============================================================================
import { UserProfile, UserRole } from './types';
import { USERS } from './mockData';

export const SESSION_COOKIE_NAME = 'b2c_ops_session';

export interface LarkConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  domain: string;
  isConfigured: boolean;
}

export interface LarkUserRaw {
  open_id: string;
  union_id?: string;
  user_id?: string;
  name: string;
  en_name?: string;
  email?: string;
  enterprise_email?: string;
  avatar_url?: string;
  avatar_thumb?: string;
  avatar_middle?: string;
  avatar_big?: string;
  mobile?: string;
}

/**
 * Lấy thông tin cấu hình Lark từ Environment Variables
 */
export function getLarkConfig(): LarkConfig {
  const appId = process.env.LARK_APP_ID || '';
  const appSecret = process.env.LARK_APP_SECRET || '';
  const domain = process.env.LARK_DOMAIN || 'open.larksuite.com'; // Default cho Lark Suite quốc tế & UpBase
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = process.env.LARK_REDIRECT_URI || `${appUrl}/api/auth/lark/callback`;

  // Kiểm tra cấu hình có hợp lệ không (loại trừ các chuỗi placeholder)
  const isConfigured = Boolean(
    appId &&
    appSecret &&
    !appId.includes('YOUR_') &&
    !appSecret.includes('YOUR_')
  );

  return {
    appId,
    appSecret,
    redirectUri,
    domain,
    isConfigured
  };
}

/**
 * Tạo URL ủy quyền đăng nhập Lark (OAuth 2.0 Authorization URL)
 */
export function buildLarkAuthUrl(state: string = 'upbase_b2c_sso'): string {
  const config = getLarkConfig();
  const encodedRedirect = encodeURIComponent(config.redirectUri);
  return `https://${config.domain}/open-apis/authen/v1/index?app_id=${config.appId}&redirect_uri=${encodedRedirect}&state=${encodeURIComponent(state)}`;
}

/**
 * Lấy App Access Token nội bộ từ Lark Open Platform
 */
export async function fetchLarkAppAccessToken(): Promise<string> {
  const config = getLarkConfig();
  if (!config.isConfigured) {
    throw new Error('Lark App Credentials chưa được cấu hình trong .env (LARK_APP_ID, LARK_APP_SECRET)');
  }

  const response = await fetch(`https://${config.domain}/open-apis/auth/v3/app_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret
    }),
    cache: 'no-store'
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Lỗi lấy Lark app_access_token [code ${data.code}]: ${data.msg}`);
  }

  return data.app_access_token;
}

/**
 * Đổi authorization code lấy user info từ Lark Open API
 */
export async function exchangeLarkCodeForUser(code: string): Promise<LarkUserRaw> {
  const config = getLarkConfig();
  const appAccessToken = await fetchLarkAppAccessToken();

  // Gọi endpoint authen v1 / access_token
  const response = await fetch(`https://${config.domain}/open-apis/authen/v1/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appAccessToken}`
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code
    }),
    cache: 'no-store'
  });

  const resJson = await response.json();
  if (resJson.code !== 0) {
    throw new Error(`Lỗi xác thực mã code Lark [code ${resJson.code}]: ${resJson.msg}`);
  }

  const userData = resJson.data;
  return {
    open_id: userData.open_id,
    union_id: userData.union_id,
    user_id: userData.user_id,
    name: userData.name || userData.en_name || 'Lark User',
    en_name: userData.en_name,
    email: userData.enterprise_email || userData.email,
    enterprise_email: userData.enterprise_email,
    avatar_url: userData.avatar_url || userData.avatar_big || userData.avatar_thumb,
    mobile: userData.mobile
  };
}

/**
 * Phân giải Lark User thành UserProfile chuẩn của B2C Ops Hub
 */
export function resolveUserProfile(larkUser: LarkUserRaw): UserProfile {
  const email = (larkUser.enterprise_email || larkUser.email || '').toLowerCase().trim();
  const name = larkUser.name || 'Thành viên UpBase';

  // 1. Đối soát với danh sách thành viên cốt lõi đã có trong USERS
  const existingUser = USERS.find(u => 
    (email && u.email.toLowerCase() === email) ||
    u.name.toLowerCase() === name.toLowerCase()
  );

  if (existingUser) {
    return {
      ...existingUser,
      name: larkUser.name || existingUser.name,
      avatar: larkUser.name ? getInitials(larkUser.name) : existingUser.avatar,
      larkOpenId: larkUser.open_id,
      larkAvatarUrl: larkUser.avatar_url
    };
  }

  // 2. Xác định vai trò tự động nếu chưa có trong danh sách
  let role: UserRole = 'BOOKING_MEMBER';
  let roleTitle = 'Chuyên viên Vận hành B2C';

  if (email.includes('lead') || email.includes('manager') || name.toLowerCase().includes('trưởng phòng') || name.toLowerCase().includes('lead')) {
    role = 'MANAGER';
    roleTitle = 'Lead Điều phối Vận hành (Lark SSO)';
  } else if (email.includes('brand') || name.toLowerCase().includes('brand')) {
    role = 'BRAND_MEMBER';
    roleTitle = 'Brand Campaign Specialist (Lark SSO)';
  } else if (email.includes('content') || name.toLowerCase().includes('content')) {
    role = 'CONTENT_MEMBER';
    roleTitle = 'Content & Script Specialist (Lark SSO)';
  }

  return {
    id: `lark_${larkUser.open_id}`,
    name,
    email: email || `${larkUser.open_id}@upbase.vn`,
    role,
    roleTitle,
    avatar: getInitials(name),
    larkOpenId: larkUser.open_id,
    larkAvatarUrl: larkUser.avatar_url
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Mã hóa UserProfile thành token lưu cookie (Base64 Safe Token)
 */
export function encodeSessionToken(user: UserProfile): string {
  const payload = {
    user,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 ngày
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Giải mã token từ cookie
 */
export function decodeSessionToken(token: string): UserProfile | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.user || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.user as UserProfile;
  } catch {
    return null;
  }
}
