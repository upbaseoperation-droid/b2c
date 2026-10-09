import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { 
  getStoredAdsReportsList, 
  parseAdsExcelFile, 
  ADS_FOLDER_PATH 
} from '@/lib/adsReportService';
import { INITIAL_KOCS, INITIAL_DEALS } from '@/lib/mockData';
import { getAuthenticatedUser } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

/**
 * Kiểm tra và làm sạch tên file để triệt tiêu lỗ hổng Path Traversal
 * Ngăn chặn tuyệt đối việc đọc/dò file hệ thống hoặc ghi đè file ngoài thư mục
 */
function getSafeReportFilePath(inputName: string): string {
  if (!inputName || typeof inputName !== 'string') {
    throw new Error('Tên file không hợp lệ.');
  }

  const baseName = path.basename(inputName.trim());
  if (!baseName || baseName !== inputName.trim() || baseName.includes('..') || baseName.includes('/') || baseName.includes('\\')) {
    throw new Error('Tên file không hợp lệ hoặc chứa ký tự đường dẫn bị cấm.');
  }

  const ext = path.extname(baseName).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    throw new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận .xlsx, .xls, .csv.');
  }

  const resolved = path.resolve(ADS_FOLDER_PATH, baseName);
  const safeDir = path.resolve(ADS_FOLDER_PATH);
  if (!resolved.startsWith(safeDir + path.sep)) {
    throw new Error('Truy cập file ngoài thư mục báo cáo bị từ chối.');
  }

  return resolved;
}

export async function GET(req: NextRequest) {
  // 1. Kiểm tra xác thực đăng nhập bắt buộc
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized: Vui lòng đăng nhập để xem danh sách báo cáo Ads.'
    }, { status: 401 });
  }

  try {
    const list = getStoredAdsReportsList();
    return NextResponse.json({
      success: true,
      reports: list
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Lỗi khi lấy danh sách báo cáo Ads.'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // 1. Kiểm tra xác thực đăng nhập bắt buộc
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized: Vui lòng đăng nhập để xử lý báo cáo Ads.'
    }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    // Trường hợp 1: Phân tích báo cáo đã lưu sẵn trên ổ đĩa
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { fileName, kocs, deals } = body;

      if (!fileName) {
        return NextResponse.json({ success: false, error: 'Thiếu tham số fileName' }, { status: 400 });
      }

      // Xác thực đường dẫn file an toàn tuyệt đối
      let filePath: string;
      try {
        filePath = getSafeReportFilePath(fileName);
      } catch (pathErr: any) {
        return NextResponse.json({ success: false, error: pathErr.message }, { status: 400 });
      }

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, error: `Không tìm thấy file báo cáo: ${path.basename(fileName)}` }, { status: 404 });
      }

      const kocsMaster = kocs && kocs.length > 0 ? kocs : INITIAL_KOCS;
      const dealsList = deals && deals.length > 0 ? deals : INITIAL_DEALS;

      const result = await parseAdsExcelFile(filePath, path.basename(fileName), kocsMaster, dealsList);

      return NextResponse.json({
        success: true,
        data: result
      });
    }

    // Trường hợp 2: Upload file Excel mới lên
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy file upload' }, { status: 400 });
      }

      // Làm sạch tên file và kiểm tra định dạng
      const rawName = file.name || 'report.xlsx';
      const cleanBaseName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = path.extname(cleanBaseName).toLowerCase();

      if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Chỉ chấp nhận file báo cáo định dạng .xlsx, .xls, .csv.' 
        }, { status: 400 });
      }

      if (!fs.existsSync(ADS_FOLDER_PATH)) {
        fs.mkdirSync(ADS_FOLDER_PATH, { recursive: true });
      }

      const safeSavePath = path.resolve(ADS_FOLDER_PATH, cleanBaseName);
      const safeDir = path.resolve(ADS_FOLDER_PATH);
      if (!safeSavePath.startsWith(safeDir + path.sep)) {
        return NextResponse.json({ success: false, error: 'Đường dẫn lưu file không an toàn.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(safeSavePath, buffer);

      // Phân tích nội dung file
      const result = await parseAdsExcelFile(buffer, cleanBaseName, INITIAL_KOCS, INITIAL_DEALS);

      return NextResponse.json({
        success: true,
        message: `Đã lưu và phân tích thành công báo cáo ${cleanBaseName}!`,
        data: result
      });
    }

    return NextResponse.json({ success: false, error: 'Định dạng yêu cầu không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    console.error('Error parsing ads report:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Lỗi xử lý file báo cáo Ads.'
    }, { status: 500 });
  }
}
