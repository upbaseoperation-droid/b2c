import { OcrLegalExtractionResult, RecommendedContractTemplate } from './types';

export const SAMPLE_OCR_PRESETS: Record<'CCCD_INDIVIDUAL' | 'BUSINESS_COMPANY' | 'BUSINESS_HOUSEHOLD', OcrLegalExtractionResult> = {
  CCCD_INDIVIDUAL: {
    documentType: 'CCCD',
    documentTypeLabel: 'Căn Cước Công Dân Gắn Chip (Cá nhân / KOC)',
    confidence: 0.98,
    extractedAt: new Date().toISOString(),
    fileName: 'CCCD_NguyenThuTrang_MatTruoc.jpg',
    fields: {
      idNumber: '001201019876',
      fullName: 'NGUYỄN THU TRANG',
      dob: '12/06/2001',
      gender: 'Nữ',
      nationality: 'Việt Nam',
      originAddress: 'Xã Nam Hồng, Huyện Tiền Hải, Tỉnh Thái Bình',
      permanentAddress: 'Phòng 1204, Imperia Garden, 203 Nguyễn Huy Tưởng, P. Thanh Xuân Trung, Q. Thanh Xuân, Hà Nội',
      issueDate: '25/08/2021',
      issuePlace: 'Cục Cảnh sát QLHC về TTXH',
      expiryDate: '12/06/2041'
    },
    recommendedTemplate: {
      templateCode: 'BM.HĐ.VID.IND.Ver052026',
      templateName: 'Hợp Đồng Dịch Vụ Quảng Bá Video — Cá Nhân / CTV',
      formType: 'INDIVIDUAL',
      sampleFileName: '1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx',
      requiresContract: true,
      legalRules: [
        'Quy chuẩn UpBase 2026: Tạm ứng ≥ 2.000.000 VNĐ hoặc Tổng giá trị ≥ 10.000.000 VNĐ bắt buộc ký Hợp đồng.',
        'Khấu trừ thuế TNCN 10% tại nguồn đối với khoản chi từ 2.000.000 VNĐ/lần.',
        'Kèm bản scan CCCD 2 mặt rõ nét để đối soát với TCKT.'
      ]
    },
    validationNotes: [
      'Số CCCD chuẩn 12 chữ số hợp lệ.',
      'Độ tuổi: 25 tuổi (Đủ năng lực hành vi dân sự ký hợp đồng).',
      'Họ tên và ngày sinh rõ nét, không bị lóa sáng.'
    ],
    rawTextPreview: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập - Tự do - Hạnh phúc\nCĂN CƯỚC CÔNG DÂN / Citizen Identity Card\nSố / No: 001201019876\nHọ và tên: NGUYỄN THU TRANG\nNgày sinh: 12/06/2001 | Giới tính: Nữ\nQuốc tịch: Việt Nam\nQuê quán: Nam Hồng, Tiền Hải, Thái Bình\nNơi thường trú: Imperia Garden, 203 Nguyễn Huy Tưởng, Thanh Xuân Trung, Thanh Xuân, Hà Nội\nCó giá trị đến: 12/06/2041'
  },

  BUSINESS_COMPANY: {
    documentType: 'BUSINESS_LICENSE',
    documentTypeLabel: 'Giấy Chứng Nhận Đăng Ký Doanh Nghiệp (Công Ty / Agency)',
    confidence: 0.96,
    extractedAt: new Date().toISOString(),
    fileName: 'DKKD_CongTyTNHH_CreatorViet.pdf',
    fields: {
      companyName: 'CÔNG TY TNHH TRUYỀN THÔNG VÀ QUẢNG CÁO CREATOR VIỆT',
      taxCode: '0109876543',
      headquartersAddress: 'Tầng 6, Tòa nhà Detech, Số 8 Tôn Thất Thuyết, Phường Mỹ Đình 2, Quận Nam Từ Liêm, TP. Hà Nội',
      legalRepresentative: 'LÊ QUANG HUY',
      legalRepTitle: 'Giám đốc',
      registrationDate: '18/04/2021',
      charterCapital: '5.000.000.000 VNĐ (Năm tỷ đồng)',
      businessLines: ['Quảng cáo', 'Tổ chức sự kiện', 'Hoạt động sản xuất phim điện ảnh, video và chương trình truyền hình']
    },
    recommendedTemplate: {
      templateCode: 'BM.HĐ.VID.COM.Ver052026',
      templateName: 'Hợp Đồng Dịch Vụ Quảng Bá Video — Pháp Nhân Doanh Nghiệp (COM)',
      formType: 'COMPANY',
      sampleFileName: '3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx',
      requiresContract: true,
      legalRules: [
        '100% bắt buộc ký hợp đồng dịch vụ không phân biệt giá trị deal.',
        'Bên B phải xuất hóa đơn GTGT (VAT điện tử) hợp pháp trước khi quyết toán.',
        'Ký đóng dấu tròn pháp nhân hoặc ký chữ ký số (Token/CA hợp lệ).'
      ]
    },
    validationNotes: [
      'Mã số doanh nghiệp 10 số hợp lệ, trạng thái đang hoạt động.',
      'Người đại diện theo pháp luật đúng theo Giấy chứng nhận ĐKDN.',
      'Có đầy đủ địa chỉ trụ sở chính để phát hành hóa đơn tài chính.'
    ],
    rawTextPreview: 'SỞ KẾ HOẠCH VÀ ĐẦU TƯ TP HÀ NỘI / PHÒNG ĐĂNG KÝ KINH DOANH\nGIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP\nCÔNG TY TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN\nMã số doanh nghiệp: 0109876543\nĐăng ký lần đầu: ngày 18 tháng 04 năm 2021\nTên công ty: CÔNG TY TNHH TRUYỀN THÔNG VÀ QUẢNG CÁO CREATOR VIỆT\nĐịa chỉ trụ sở chính: Tầng 6, Tòa nhà Detech, Số 8 Tôn Thất Thuyết, Phường Mỹ Đình 2, Quận Nam Từ Liêm, TP. Hà Nội\nNgười đại diện theo pháp luật: LÊ QUANG HUY - Chức danh: Giám đốc'
  },

  BUSINESS_HOUSEHOLD: {
    documentType: 'BUSINESS_HOUSEHOLD',
    documentTypeLabel: 'Giấy Chứng Nhận Đăng Ký Hộ Kinh Doanh (HKD Cá Thể)',
    confidence: 0.95,
    extractedAt: new Date().toISOString(),
    fileName: 'DKKD_HoKinhDoanh_VyStudio.jpg',
    fields: {
      companyName: 'HỘ KINH DOANH VY STUDIO & MEDIA',
      taxCode: '8491238475-001',
      headquartersAddress: 'Số 45 Đường số 7, Khu dân cư Cityland, Phường 7, Quận Gò Vấp, TP. Hồ Chí Minh',
      legalRepresentative: 'NGUYỄN KHÁNH VY',
      legalRepTitle: 'Chủ hộ kinh doanh',
      registrationDate: '05/11/2022',
      businessLines: ['Dịch vụ sáng tạo nội dung, chụp ảnh, quay video quảng cáo']
    },
    recommendedTemplate: {
      templateCode: 'BM.HĐ.VID.HKD.Ver052026',
      templateName: 'Hợp Đồng Dịch Vụ Quảng Bá Video — Hộ Kinh Doanh (HKD)',
      formType: 'HOUSEHOLD',
      sampleFileName: '2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx',
      requiresContract: true,
      legalRules: [
        '100% bắt buộc ký hợp đồng dịch vụ theo quy chuẩn UpBase B2C 2026.',
        'Hộ kinh doanh phải nộp tờ khai thuế hoặc hóa đơn bán hàng cơ quan thuế cấp lẻ.',
        'Chủ hộ kinh doanh trực tiếp ký tên và đóng dấu vuông HKD (nếu có).'
      ]
    },
    validationNotes: [
      'Mã số thuế hộ kinh doanh hợp lệ.',
      'Chủ hộ kinh doanh trùng khớp với danh tính người đại diện.'
    ],
    rawTextPreview: 'ỦY BAN NHÂN DÂN QUẬN GÒ VẤP / PHÒNG TÀI CHÍNH - KẾ HOẠCH\nGIẤY CHỨNG NHẬN ĐĂNG KÝ HỘ KINH DOANH\nSố GCN: 41M8012345 | Đăng ký ngày 05/11/2022\nTên hộ kinh doanh: HỘ KINH DOANH VY STUDIO & MEDIA\nĐịa điểm kinh doanh: Số 45 Đường số 7, Cityland, P.7, Q. Gò Vấp, TP.HCM\nMã số thuế: 8491238475-001\nNgười đại diện / Chủ hộ: NGUYỄN KHÁNH VY'
  }
};
