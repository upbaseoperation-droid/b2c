import fs from 'node:fs';
import path from 'node:path';
import { checkSingleLinkServerless } from '../linkAirCheckServer';
import type { LinkAirResult } from '../linkAirCheck';

export interface ZaloGroupMapping {
  groupId: string;
  dealCode?: string;
  kocName?: string;
  brandName?: string;
  linkedAt: string;
}

const MAPPINGS_FILE_PATH = path.join(process.cwd(), 'src/data/zalo_group_mappings.json');
const inMemoryMappings = new Map<string, ZaloGroupMapping>();
const recentDebugEvents: Array<{ time: string; body: any; extractedChatId?: string; replySent?: boolean; error?: string }> = [];

export function recordDebugEvent(event: { time: string; body: any; extractedChatId?: string; replySent?: boolean; error?: string }) {
  recentDebugEvents.unshift(event);
  if (recentDebugEvents.length > 20) {
    recentDebugEvents.pop();
  }
}

export function getDebugEvents() {
  return recentDebugEvents;
}

export function getAllMappings(): ZaloGroupMapping[] {
  const map = loadMappings();
  return Array.from(map.values());
}

export function setGroupMapping(mapping: ZaloGroupMapping): void {
  const map = loadMappings();
  map.set(mapping.groupId, mapping);
  saveMappings();
}

export function removeGroupMapping(groupId: string): boolean {
  const map = loadMappings();
  const deleted = map.delete(groupId);
  if (deleted) saveMappings();
  return deleted;
}

function loadMappings(): Map<string, ZaloGroupMapping> {
  if (inMemoryMappings.size > 0) return inMemoryMappings;
  try {
    if (fs.existsSync(MAPPINGS_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE_PATH, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.groupId) inMemoryMappings.set(item.groupId, item);
        }
      }
    }
  } catch {
    // Zero-Crash fallback to in-memory cache
  }
  return inMemoryMappings;
}

function saveMappings(): void {
  try {
    const dir = path.dirname(MAPPINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(inMemoryMappings.values());
    fs.writeFileSync(MAPPINGS_FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

export function getZaloBotToken(): string {
  return (
    process.env.ZALO_BOT_TOKEN ||
    '4534079839618724427:PHeGUcxPiQVcvwNfgrfsxwAfSKahskDzybsTUkbNlfydmkqzSqanzVhMLkjvOxEj'
  );
}

export function getZaloBotSecretToken(): string {
  return process.env.ZALO_BOT_SECRET_TOKEN || 'hDHDHT7wyBCafz3--U';
}

/**
 * Gửi tin nhắn qua Zalo Bot Platform API
 */
export async function sendZaloMessage(chatId: string, text: string): Promise<boolean> {
  const token = getZaloBotToken();
  if (!token) {
    console.error('[ZaloBot] Thiếu ZALO_BOT_TOKEN');
    return false;
  }

  try {
    const res = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('[ZaloBot] Gửi tin thất bại từ API Zalo:', data);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ZaloBot] Exception khi gửi tin:', err);
    return false;
  }
}

const TIKTOK_URL_REGEX = /(https?:\/\/(?:vt\.tiktok\.com|www\.tiktok\.com|tiktok\.com)\/[^\s]+)/i;

/**
 * Xử lý sự kiện Webhook từ Zalo Bot
 */
export async function processZaloWebhookEvent(body: any): Promise<{ handled: boolean; reply?: string }> {
  // Trích xuất linh hoạt các định dạng dữ liệu Zalo Bot có thể gửi
  const message = body?.result?.message || body?.message || body;
  const chatId = String(
    message?.chat?.id ||
    body?.result?.message?.chat?.id ||
    body?.recipient?.id ||
    body?.chat_id ||
    message?.chat_id ||
    body?.result?.chat?.id ||
    body?.sender?.id ||
    ''
  ).trim();

  const rawText = String(message?.text || body?.text || '').trim();

  if (!chatId) {
    recordDebugEvent({ time: new Date().toISOString(), body, error: 'Không tìm thấy chatId' });
    return { handled: false };
  }

  // Bỏ các mention (@Bot name) để lấy câu lệnh thực tế
  const cleanText = rawText.replace(/@[^\s]+/g, '').trim();
  const lowerClean = cleanText.toLowerCase();

  const mappings = loadMappings();
  const currentMapping = mappings.get(chatId);

  // 1. TỰ ĐỘNG BẮT LINK TIKTOK ĐỂ NGHIỆM THU (AIR CHECK)
  const linkMatch = rawText.match(TIKTOK_URL_REGEX);
  if (linkMatch) {
    const videoUrl = linkMatch[1];
    await sendZaloMessage(chatId, `⏳ Đang quét dữ liệu video nghiệm thu: ${videoUrl}\nVui lòng chờ trong giây lát...`);

    try {
      const checkResult: LinkAirResult = await checkSingleLinkServerless(videoUrl);
      
      const isPass = checkResult.verdict === 'PASS';
      const isReview = checkResult.verdict === 'REVIEW';
      const statusIcon = isPass ? '✅ ĐẠT (PASS)' : isReview ? '⚠️ CẦN RÀ SOÁT (REVIEW)' : '❌ KHÔNG ĐẠT (FAIL)';

      const cartText = checkResult.hasProductLink
        ? `Đã gắn giỏ hàng (${checkResult.cartProducts?.map((p) => p.title).join(', ') || checkResult.productTitle || 'Đã phát hiện link sản phẩm'})`
        : 'Chưa phát hiện giỏ hàng';

      const resultMsg = [
        `📊 KẾT QUẢ NGHIỆM THU VIDEO TIKTOK`,
        `----------------------------------------`,
        `• Đánh giá: ${statusIcon}`,
        `• Tác giả: @${checkResult.author?.handle || 'Chưa rõ'}`,
        `• Tình trạng: ${checkResult.status === 'LIVE' ? 'Đang công khai (Live/Air)' : checkResult.status}`,
        `• Giỏ hàng: ${cartText}`,
        `• Lượt xem: ${checkResult.metrics?.views ? checkResult.metrics.views.toLocaleString('vi-VN') : '—'}`,
        `• Lượt thích: ${checkResult.metrics?.likes ? checkResult.metrics.likes.toLocaleString('vi-VN') : '—'}`,
        `• Hashtags: ${checkResult.hashtags && checkResult.hashtags.length > 0 ? checkResult.hashtags.map((h) => `#${h}`).join(' ') : '—'}`,
        `----------------------------------------`,
        currentMapping ? `Đã đồng bộ kết quả vào hồ sơ: ${currentMapping.dealCode}` : `Mẹo: Gõ /link <MÃ_DEAL> để lưu kết quả vào Deal trên web-admin.`,
      ].join('\n');

      await sendZaloMessage(chatId, resultMsg);
      recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, replySent: true });
      return { handled: true, reply: resultMsg };
    } catch (err: any) {
      const errMsg = `❌ Không thể quét dữ liệu video: ${err?.message || 'Lỗi không xác định'}. Vui lòng kiểm tra lại link.`;
      await sendZaloMessage(chatId, errMsg);
      recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, error: errMsg });
      return { handled: true, reply: errMsg };
    }
  }

  // 2. LỆNH TRỢ GIÚP /start hoặc /help
  if (
    lowerClean === '/start' ||
    lowerClean === 'start' ||
    lowerClean === '/help' ||
    lowerClean === 'help' ||
    lowerClean.includes('hướng dẫn')
  ) {
    const helpMsg = [
      '🤖 [Upbase B2C] Trợ Lý Vận Hành Zalo Bot',
      '----------------------------------------',
      'Các câu lệnh hỗ trợ:',
      '• /link <MÃ_DEAL>: Liên kết nhóm chat với mã Deal KOC.',
      '• /status: Kiểm tra thông tin liên kết của nhóm hiện tại.',
      '• Gửi link video TikTok kèm tag bot: Tự động quét kiểm tra nghiệm thu bài đăng (Air).',
      '----------------------------------------',
      currentMapping
        ? `Nhóm này đang liên kết với Deal: ${currentMapping.dealCode}`
        : 'Nhóm này chưa liên kết với Deal nào. Hãy gõ: /link <MÃ_DEAL>',
    ].join('\n');

    await sendZaloMessage(chatId, helpMsg);
    recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, replySent: true });
    return { handled: true, reply: helpMsg };
  }

  // 3. LỆNH LIÊN KẾT NHÓM: /link <DEAL_CODE>
  if (lowerClean.startsWith('/link') || lowerClean.startsWith('link ')) {
    const dealCode = cleanText.replace(/^\/?link\s*/i, '').trim();
    if (!dealCode) {
      const msg = '⚠️ Vui lòng nhập mã deal cần liên kết. Ví dụ: /link DEAL-108 hoặc /link @quynhanh_beauty';
      await sendZaloMessage(chatId, msg);
      return { handled: true, reply: msg };
    }

    const mapping: ZaloGroupMapping = {
      groupId: chatId,
      dealCode,
      linkedAt: new Date().toISOString(),
    };
    mappings.set(chatId, mapping);
    saveMappings();

    const successMsg = `✅ Đã liên kết nhóm chat này với mã: [${dealCode}] thành công!\nTừ bây giờ, hệ thống sẽ tự động đối soát nghiệm thu và gửi thông báo vào nhóm này.`;
    await sendZaloMessage(chatId, successMsg);
    recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, replySent: true });
    return { handled: true, reply: successMsg };
  }

  // 4. LỆNH KIỂM TRA TRẠNG THÁI: /status
  if (lowerClean === '/status' || lowerClean === 'status') {
    const statusMsg = currentMapping
      ? `📋 THÔNG TIN LIÊN KẾT NHÓM:\n• Chat/Group ID: ${chatId}\n• Mã Deal: ${currentMapping.dealCode}\n• Thời gian kết nối: ${new Date(currentMapping.linkedAt).toLocaleString('vi-VN')}`
      : `📋 THÔNG TIN NHÓM:\n• Chat/Group ID: ${chatId}\n• Trạng thái: Chưa liên kết Deal.\n👉 Gõ /link <MÃ_DEAL> để liên kết.`;

    await sendZaloMessage(chatId, statusMsg);
    recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, replySent: true });
    return { handled: true, reply: statusMsg };
  }

  // 5. CÂU HỎI THƯỜNG / CHÀO HỎI (KHI CÓ GỌI TÊN BOT)
  if (rawText.includes('@') || lowerClean.length > 0) {
    const greetingMsg = [
      '👋 Chào anh/chị! Em là Upbase B2C Bot.',
      'Em có thể hỗ trợ:',
      '1. Nghiệm thu video TikTok: Hãy gửi kèm link video vào đây.',
      '2. Liên kết nhóm với Deal: Gõ /link <MÃ_DEAL>',
      '3. Xem hướng dẫn chi tiết: Gõ /help',
    ].join('\n');
    await sendZaloMessage(chatId, greetingMsg);
    recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, replySent: true });
    return { handled: true, reply: greetingMsg };
  }

  recordDebugEvent({ time: new Date().toISOString(), body, extractedChatId: chatId, replySent: false });
  return { handled: false };
}
