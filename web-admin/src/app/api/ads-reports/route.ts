import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { 
  getStoredAdsReportsList, 
  parseAdsExcelFile, 
  ADS_FOLDER_PATH 
} from '@/lib/adsReportService';
import { INITIAL_KOCS, INITIAL_DEALS } from '@/lib/mockData';

export async function GET() {
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
  try {
    const contentType = req.headers.get('content-type') || '';

    // Trường hợp 1: Phân tích báo cáo đã lưu sẵn trên ổ đĩa
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { fileName, kocs, deals } = body;

      if (!fileName) {
        return NextResponse.json({ success: false, error: 'Thiếu tham số fileName' }, { status: 400 });
      }

      const filePath = path.join(ADS_FOLDER_PATH, fileName);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, error: `Không tìm thấy file: ${fileName}` }, { status: 404 });
      }

      const kocsMaster = kocs && kocs.length > 0 ? kocs : INITIAL_KOCS;
      const dealsList = deals && deals.length > 0 ? deals : INITIAL_DEALS;

      const result = await parseAdsExcelFile(filePath, fileName, kocsMaster, dealsList);

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

      const fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Lưu file vào thư mục Baocao ads
      if (!fs.existsSync(ADS_FOLDER_PATH)) {
        fs.mkdirSync(ADS_FOLDER_PATH, { recursive: true });
      }
      const savePath = path.join(ADS_FOLDER_PATH, fileName);
      fs.writeFileSync(savePath, buffer);

      // Phân tích nội dung file
      const result = await parseAdsExcelFile(buffer, fileName, INITIAL_KOCS, INITIAL_DEALS);

      return NextResponse.json({
        success: true,
        message: `Đã lưu và phân tích thành công báo cáo ${fileName}!`,
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
