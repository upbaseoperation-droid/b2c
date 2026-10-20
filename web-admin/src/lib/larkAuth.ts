// ==============================================================================
// UPBASE B2C MARKETING OPERATIONS HUB — LARK OAUTH 2.0 / SSO SERVICE
// ==============================================================================
import crypto from 'crypto';
import { UserProfile, UserRole } from './types';
import { USERS } from './mockData';
import { UPBASE_STAFF_MASTER } from './importedMasterData';
import { classifyMasterStaffMember, INITIAL_DEPARTMENT_ACCESS_RULES } from './rbacData';

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
  tenant_key?: string;
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
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '';
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    vercelProdUrl ||
    (process.env.NODE_ENV === 'production' ? 'https://b2c-theta.vercel.app' : 'http://localhost:3000')
  ).replace(/\/$/, '');
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
export function buildLarkAuthUrl(state: string = 'upbase_b2c_sso', requestOrigin?: string): string {
  const config = getLarkConfig();
  let redirectUri = config.redirectUri;
  // Tự động đồng bộ redirect_uri theo origin thực tế (hỗ trợ song song cả https://b2c-theta.vercel.app và http://localhost:3000)
  if (requestOrigin) {
    const cleanOrigin = requestOrigin.replace(/\/$/, '');
    const isLocalRequest = cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1');
    const isLocalRedirect = redirectUri.includes('localhost') || redirectUri.includes('127.0.0.1');
    if (isLocalRequest !== isLocalRedirect) {
      redirectUri = `${cleanOrigin}/api/auth/lark/callback`;
    }
  }
  const encodedRedirect = encodeURIComponent(redirectUri);
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

  const userData = resJson.data || {};
  let userInfo = userData;

  // Nếu có user access_token, gọi thêm /open-apis/authen/v1/user_info để lấy đầy đủ email/avatar mới nhất
  if (userData.access_token && (!userData.email && !userData.enterprise_email)) {
    try {
      const infoRes = await fetch(`https://${config.domain}/open-apis/authen/v1/user_info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`
        },
        cache: 'no-store'
      });
      const infoJson = await infoRes.json();
      if (infoJson.code === 0 && infoJson.data) {
        userInfo = { ...userData, ...infoJson.data };
      }
    } catch {
      // Giữ nguyên dữ liệu từ bước access_token nếu gọi user_info thất bại
    }
  }

  return {
    open_id: userInfo.open_id,
    union_id: userInfo.union_id,
    user_id: userInfo.user_id,
    name: userInfo.name || userInfo.en_name || 'Lark User',
    en_name: userInfo.en_name,
    email: userInfo.enterprise_email || userInfo.email,
    enterprise_email: userInfo.enterprise_email,
    avatar_url: userInfo.avatar_url || userInfo.avatar_big || userInfo.avatar_thumb,
    mobile: userInfo.mobile,
    tenant_key: userInfo.tenant_key
  };
}

function normalizePersonName(value?: string): string {
  return (value || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Phân giải Lark User thành UserProfile chuẩn của B2C Ops Hub.
 * Kiểm tra cổng phân quyền phòng ban: chỉ nhân sự thuộc 3 khối Marketing B2C, Growth, Media
 * (hoặc được Admin cấp quyền) mới được đăng nhập.
 */
export function resolveUserProfile(larkUser: LarkUserRaw): UserProfile {
  const email = (larkUser.enterprise_email || larkUser.email || '').toLowerCase().trim();
  const name = larkUser.name || 'Thành viên UpBase';
  const normalizedName = normalizePersonName(larkUser.name);

  // 1. Đối soát với danh sách thành viên cốt lõi đã có trong USERS (theo email hoặc họ tên chuẩn B2C)
  const existingUser =
    USERS.find(u => email && u.email.toLowerCase() === email) ||
    (normalizedName
      ? USERS.find(u => normalizePersonName(u.name) === normalizedName)
      : undefined);

  if (existingUser) {
    if (existingUser.canLogin === false) {
      throw new Error(
        `Tài khoản ${existingUser.name} đã bị Admin thu hồi quyền đăng nhập hệ thống B2C.`
      );
    }
    return {
      ...existingUser,
      name: larkUser.name || existingUser.name,
      avatar: larkUser.name ? getInitials(larkUser.name) : existingUser.avatar,
      larkOpenId: larkUser.open_id,
      larkAvatarUrl: larkUser.avatar_url
    };
  }

  // 2. Đối soát với danh bạ 1.011 nhân sự UPBASE_STAFF_MASTER (theo email hoặc họ tên khi Lark chưa trả email)
  const masterMember =
    UPBASE_STAFF_MASTER.find(m => email && m.email.toLowerCase() === email) ||
    (!email && normalizedName
      ? UPBASE_STAFF_MASTER.find(m => normalizePersonName(m.name) === normalizedName)
      : undefined);

  if (masterMember) {
    const classified = classifyMasterStaffMember(masterMember, INITIAL_DEPARTMENT_ACCESS_RULES, {});
    if (!classified.canLogin) {
      throw new Error(
        `Từ chối truy cập (403): Nhân sự ${masterMember.name} (${masterMember.staffCode}) thuộc phòng "${masterMember.department || masterMember.team || 'Khác'}" không nằm trong 3 khối được phép truy cập (Marketing B2C, Growth, Media). Vui lòng liên hệ Admin nếu cần cấp quyền ngoại lệ.`
      );
    }

    return {
      id: `staff-${masterMember.id}`,
      name: masterMember.name,
      email: masterMember.email,
      role: classified.role,
      roleTitle: `${masterMember.position || masterMember.roleTitle} (${masterMember.department || 'UpBase'})`,
      avatar: masterMember.avatar || getInitials(masterMember.name),
      departmentScope: classified.departmentScope,
      departmentName: masterMember.department,
      teamName: masterMember.team,
      managerName: classified.managerName,
      canLogin: true,
      larkOpenId: larkUser.open_id,
      larkAvatarUrl: larkUser.avatar_url
    };
  }

  // 3. Nếu email không nằm trong danh sách 3 khối được cấp quyền, chặn mặc định
  throw new Error(
    `Tài khoản Lark "${name}" (${email || larkUser.open_id}) chưa được Admin phân vào khối Marketing B2C, Growth hoặc Media.`
  );
}


// Khóa bí mật dùng để ký HMAC token phiên làm việc
// Sandbox keeps working without configuration, but uses a stable fallback signing key if env secret is missing.
const fallbackSecret = 'upbase-b2c-session-auth-token-secret-2026';
function authSecret() {
  const configured = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (configured) return configured;
  return fallbackSecret;
}

function signData(data: string): string {
  return crypto.createHmac('sha256', authSecret()).update(data).digest('base64url');
}

function verifySignature(data: string, signature: string): boolean {
  try {
    const expected = signData(data);
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature);
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

export { sanitizeReturnTo } from './urlUtils';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Mã hóa UserProfile thành token lưu cookie với chữ ký số HMAC-SHA256
 * Cấu trúc: <base64url(payload)>.<signature>
 */
export function encodeSessionToken(user: UserProfile): string {
  const payload = {
    user,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 ngày
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signData(data);
  return `${data}.${signature}`;
}

/**
 * Giải mã và xác minh tính toàn vẹn của token từ cookie
 * Bắt buộc kiểm tra chữ ký số HMAC, ngăn chặn tuyệt đối giả mạo session
 */
export function decodeSessionToken(token: string): UserProfile | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) {
      // Từ chối token không có chữ ký số HMAC
      return null;
    }
    const [data, signature] = parts;
    if (!verifySignature(data, signature)) {
      // Chữ ký sai hoặc bị can thiệp
      return null;
    }
    const raw = Buffer.from(data, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.user || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.user as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Kiểm tra xác thực phiên từ NextRequest trong các API route
 * Trả về UserProfile nếu hợp lệ và chữ ký HMAC đúng, ngược lại trả về null
 */
export function getAuthenticatedUser(request: any): UserProfile | null {
  try {
    const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return decodeSessionToken(token);
  } catch {
    return null;
  }
}
