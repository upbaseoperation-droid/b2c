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
  if (!token) return false;

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

    return res.ok;
  } catch (err) {
    console.error('[ZaloBot] Gửi tin thất bại:', err);
    return false;
  }
}

const TIKTOK_URL_REGEX = /(https?:\/\/(?:vt\.tiktok\.com|www\.tiktok\.com|tiktok\.com)\/[^\s]+)/i;

/**
 * Xử lý sự kiện Webhook từ Zalo Bot
 */
export async function processZaloWebhookEvent(body: any): Promise<{ handled: boolean; reply?: string }> {
  if (!body || !body.result || !body.result.message) {
    return { handled: false };
  }

  const message = body.result.message;
  const chatId = String(message.chat?.id || message.chat_id || '');
  const rawText = String(message.text || '').trim();

  if (!chatId || !rawText) {
    return { handled: false };
  }

  const mappings = loadMappings();
  const currentMapping = mappings.get(chatId);

  // 1. LỆNH TRỢ GIÚP /start hoặc /help
  if (rawText === '/start' || rawText === '/help' || rawText.toLowerCase().includes('hướng dẫn')) {
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
    return { handled: true, reply: helpMsg };
  }

  // 2. LỆNH LIÊN KẾT NHÓM: /link <DEAL_CODE>
  if (rawText.startsWith('/link')) {
    const dealCode = rawText.replace('/link', '').trim();
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
    return { handled: true, reply: successMsg };
  }

  // 3. LỆNH KIỂM TRA TRẠNG THÁI: /status
  if (rawText === '/status') {
    const statusMsg = currentMapping
      ? `📋 THÔNG TIN LIÊN KẾT NHÓM:\n• Chat/Group ID: ${chatId}\n• Mã Deal: ${currentMapping.dealCode}\n• Thời gian kết nối: ${new Date(currentMapping.linkedAt).toLocaleString('vi-VN')}`
      : `📋 THÔNG TIN NHÓM:\n• Chat/Group ID: ${chatId}\n• Trạng thái: Chưa liên kết Deal.\n👉 Gõ /link <MÃ_DEAL> để liên kết.`;

    await sendZaloMessage(chatId, statusMsg);
    return { handled: true, reply: statusMsg };
  }

  // 4. TỰ ĐỘNG BẮT LINK TIKTOK ĐỂ NGHIỆM THU (AIR CHECK)
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
      return { handled: true, reply: resultMsg };
    } catch (err: any) {
      const errMsg = `❌ Không thể quét dữ liệu video: ${err?.message || 'Lỗi không xác định'}. Vui lòng kiểm tra lại link.`;
      await sendZaloMessage(chatId, errMsg);
      return { handled: true, reply: errMsg };
    }
  }

  return { handled: false };
}
