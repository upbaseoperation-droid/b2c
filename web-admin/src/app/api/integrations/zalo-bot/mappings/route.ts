import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import {
  getAllMappings,
  setGroupMapping,
  removeGroupMapping,
  getAllUserPermissions,
  setUserPermission,
  removeUserPermission,
  getSecurityPolicy,
  setSecurityPolicy,
  getReplyConfig,
  setReplyConfig,
  resetReplyConfigToDefault,
  hydrateZaloBotStateFromDb,
  buildDealBriefMessage,
  buildSettlementSummaryMessage,
  buildSingleGroupAirReminderMessage,
  parseVnDateToYmdAndDiff,
  formatVnDatePlusDays,
  runBulkSlaReminders,
  runAirScheduleReminders,
  sendZaloMessage,
  type ZaloGroupMapping,
  type ZaloGroupRole,
  type ZaloGroupAccessStatus,
  type ZaloDealWorkflowStatus,
  type ZaloUserPermission,
  type ZaloStaffRole,
} from '@/lib/server/zaloBot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await requestActor(req);
  if (actor && (actor.partnerType || actor.role.endsWith('_PARTNER'))) {
    return NextResponse.json(
      { ok: false, error: 'Tài khoản đối tác không có quyền truy cập cấu hình Zalo Bot nội bộ.' },
      { status: 403 }
    );
  }
  await hydrateZaloBotStateFromDb({ forceFresh: true });
  return NextResponse.json({
    ok: true,
    mappings: getAllMappings(),
    userPermissions: getAllUserPermissions(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requestActor(req);
    if (actor && (actor.partnerType || actor.role.endsWith('_PARTNER'))) {
      return NextResponse.json(
        { ok: false, error: 'Tài khoản đối tác không có quyền thao tác cấu hình Zalo Bot nội bộ.' },
        { status: 403 }
      );
    }
    const body = await req.json().catch(() => null);
    const action = String(body?.action || 'LINK').toUpperCase();

    const ADMIN_ONLY_ZALO_ACTIONS = new Set([
      'UPDATE_SECURITY_POLICY',
      'UPDATE_REPLY_CONFIG',
      'RESET_REPLY_CONFIG',
      'SAVE_USER_PERMISSION',
      'REMOVE_USER_PERMISSION',
      'BULK_APPROVE_DISCOVERED',
    ]);
    if (
      ADMIN_ONLY_ZALO_ACTIONS.has(action) &&
      actor &&
      !['ADMIN', 'MANAGER', 'LEADER'].includes(actor.role) &&
      !actor.permissions?.includes('ALL_PERMISSIONS')
    ) {
      return NextResponse.json(
        { ok: false, error: 'Chỉ Quản trị viên, Giám đốc B2C hoặc Trưởng nhóm mới được thay đổi cấu hình bảo mật và phân quyền Zalo Bot.' },
        { status: 403 }
      );
    }

    // 1. Quản lý Chính sách Bảo mật Toàn cục (Global Security Policy)
    if (action === 'UPDATE_SECURITY_POLICY') {
      const updatedPolicy = setSecurityPolicy({
        requireGroupWhitelist: Boolean(body?.requireGroupWhitelist),
        lockRoleElevationFromChat: Boolean(body?.lockRoleElevationFromChat),
        enforceBrandScopeInInternalGroups: Boolean(body?.enforceBrandScopeInInternalGroups),
        restrictDraftReviewToStaff: Boolean(body?.restrictDraftReviewToStaff),
        isolateCrossDealLookupInKocGroup: Boolean(body?.isolateCrossDealLookupInKocGroup),
      });
      return NextResponse.json({
        ok: true,
        message: 'Đã lưu cấu hình chính sách bảo mật nhóm Zalo.',
        securityPolicy: updatedPolicy,
      });
    }

    // 1B. Quản lý Kịch bản & Tin nhắn trả lời của Bot (Reply Templates & Broadcast Templates)
    if (action === 'UPDATE_REPLY_CONFIG') {
      const updatedReplyConfig = setReplyConfig({
        sendHoldingPhotoOnAirCheck:
          typeof body?.sendHoldingPhotoOnAirCheck === 'boolean'
            ? body.sendHoldingPhotoOnAirCheck
            : undefined,
        sendScanningProgressMessage:
          typeof body?.sendScanningProgressMessage === 'boolean'
            ? body.sendScanningProgressMessage
            : undefined,
        autoReplyTemplates: Array.isArray(body?.autoReplyTemplates)
          ? body.autoReplyTemplates
          : undefined,
        broadcastTemplates: Array.isArray(body?.broadcastTemplates)
          ? body.broadcastTemplates
          : undefined,
      });
      return NextResponse.json({
        ok: true,
        message: 'Đã lưu cấu hình kịch bản & mẫu tin nhắn trả lời của Bot.',
        replyConfig: updatedReplyConfig,
      });
    }

    if (action === 'RESET_REPLY_CONFIG') {
      const resetCfg = resetReplyConfigToDefault();
      return NextResponse.json({
        ok: true,
        message: 'Đã khôi phục toàn bộ mẫu tin nhắn trả lời của Bot về mặc định.',
        replyConfig: resetCfg,
      });
    }

    // 2. Quản lý Phân quyền Nhân sự trên Zalo
    if (action === 'SAVE_USER_PERMISSION') {
      const zaloUserId = String(body?.zaloUserId || '').trim();
      const staffName = String(body?.staffName || '').trim();
      if (!zaloUserId || !staffName) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng nhập Mã người dùng Zalo và Tên nhân sự.' },
          { status: 400 }
        );
      }

      const role = (body?.role || 'PIC') as ZaloStaffRole;
      const roleLabelMap: Record<ZaloStaffRole, string> = {
        CEO: 'Tổng Giám Đốc (CEO)',
        LEAD_B2C: 'Giám Đốc Marketing B2C (Lead B2C)',
        LEADER: 'Trưởng Nhóm Booking (8 gian hàng trọng điểm)',
        PIC: 'Chuyên viên thực thi (PIC)',
        KOC: 'Đối tác KOC / Creator',
      };

      const perm: ZaloUserPermission = {
        zaloUserId,
        displayName: String(body?.displayName || staffName).trim(),
        staffName,
        staffEmail: String(body?.staffEmail || '').trim(),
        role,
        roleLabel: roleLabelMap[role] || 'Chuyên viên thực thi (PIC)',
        assignedBrands: Array.isArray(body?.assignedBrands)
          ? body.assignedBrands
          : String(body?.assignedBrands || 'Tất cả')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
        updatedAt: new Date().toISOString(),
      };

      setUserPermission(perm);
      return NextResponse.json({
        ok: true,
        message: 'Đã lưu phân quyền nhân sự Zalo.',
        permission: perm,
      });
    }

    if (action === 'REMOVE_USER_PERMISSION') {
      const zaloUserId = String(body?.zaloUserId || '').trim();
      if (!zaloUserId) {
        return NextResponse.json({ ok: false, error: 'Thiếu zaloUserId' }, { status: 400 });
      }
      removeUserPermission(zaloUserId);
      return NextResponse.json({ ok: true, message: 'Đã xóa phân quyền nhân sự.' });
    }

    if (action === 'BULK_APPROVE_DISCOVERED') {
      const all = getAllMappings();
      let approvedCount = 0;
      for (const m of all) {
        if (m.accessStatus === 'PENDING_APPROVAL' || m.isAutoDiscovered) {
          setGroupMapping({
            ...m,
            accessStatus: 'APPROVED',
            isAutoDiscovered: false,
            updatedAt: new Date().toISOString(),
          });
          approvedCount += 1;
        }
      }
      return NextResponse.json({
        ok: true,
        approvedCount,
        message: `Đã phê duyệt nhanh ${approvedCount} nhóm chat Zalo mới phát hiện.`,
      });
    }

    if (action === 'BULK_SLA_REMINDER') {
      const { summaryText, remindedCount } = await runBulkSlaReminders({
        actuallySend: true,
        filterBrand: body?.brandName ? String(body.brandName) : undefined,
      });
      return NextResponse.json({
        ok: true,
        remindedCount,
        previewText: summaryText,
        message: `Đã rà soát và phát thông báo nhắc hạn SLA tới ${remindedCount} nhóm KOC.`,
      });
    }

    if (action === 'BULK_AIR_REMINDER') {
      const { summaryText, remindedCount } = await runAirScheduleReminders({
        actuallySend: true,
        filterQuery: body?.brandName ? String(body.brandName) : undefined,
      });
      return NextResponse.json({
        ok: true,
        remindedCount,
        previewText: summaryText,
        message: `Đã rà soát lịch Air và phát thông báo nhắc lịch lên sóng tới ${remindedCount} nhóm KOC.`,
      });
    }

    // 2. Quản lý Nhóm chat Zalo & Thao tác nghiệp vụ
    const groupId = String(body?.groupId || '').trim();
    if (!groupId) {
      return NextResponse.json({ ok: false, error: 'Thiếu groupId' }, { status: 400 });
    }

    if (action === 'UNLINK') {
      removeGroupMapping(groupId);
      return NextResponse.json({ ok: true, message: 'Đã hủy liên kết nhóm.' });
    }

    const existing = getAllMappings().find((m) => m.groupId === groupId);

    if (action === 'QUICK_APPROVE_GROUP') {
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy nhóm liên kết.' }, { status: 404 });
      }
      const nextAccess = (body?.accessStatus || 'APPROVED') as ZaloGroupAccessStatus;
      const nextRole = (body?.groupRole || existing.groupRole || 'KOC_GROUP') as ZaloGroupRole;
      const updated: ZaloGroupMapping = {
        ...existing,
        accessStatus: nextAccess,
        groupRole: nextRole,
        isAutoDiscovered: false,
        updatedAt: new Date().toISOString(),
      };
      setGroupMapping(updated);
      return NextResponse.json({
        ok: true,
        mapping: updated,
        message: `Đã cập nhật trạng thái nhóm [${updated.groupName || groupId}] sang ${nextAccess}.`,
      });
    }

    if (action === 'SEND_BRIEF') {
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy nhóm liên kết.' }, { status: 404 });
      }
      const briefText = buildDealBriefMessage(existing);
      const sent = await sendZaloMessage(groupId, briefText);
      return NextResponse.json({
        ok: true,
        sentToZalo: sent,
        message: sent
          ? 'Đã gửi Brief chiến dịch vào nhóm Zalo thành công.'
          : 'Đã tạo nội dung Brief (nhóm mẫu chưa phát sinh hội thoại thật trên Zalo Server).',
        previewText: briefText,
      });
    }

    if (action === 'SEND_SLA_REMINDER') {
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy nhóm liên kết.' }, { status: 404 });
      }
      const slaText = [
        `⏰ NHẮC HẠN NỘP BÀI CHIẾN DỊCH (SLA TRACKING)`,
        `----------------------------------------`,
        `• Mã Deal: ${existing.dealCode || '—'} (${existing.brandName || '—'})`,
        `• KOC thực hiện: ${existing.kocName || existing.kocHandle || '—'}`,
        `• Trạng thái hiện tại: ${existing.dealStatus}`,
        `• Hạn chót nộp bài: ${existing.deadlineDate || 'Sắp đến hạn'}`,
        `• PIC phụ trách: ${existing.picName || '—'}`,
        `----------------------------------------`,
        `👉 KOC vui lòng gửi link video nháp (/nopnhap <link_drive>) hoặc link TikTok đã đăng vào nhóm đúng tiến độ cam kết nhé!`,
      ].join('\n');

      const sent = await sendZaloMessage(groupId, slaText);
      return NextResponse.json({
        ok: true,
        sentToZalo: sent,
        message: sent
          ? 'Đã gửi tin nhắc hạn SLA vào nhóm Zalo.'
          : 'Đã khởi tạo lệnh nhắc hạn SLA.',
        previewText: slaText,
      });
    }

    if (action === 'SEND_AIR_REMINDER') {
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy nhóm liên kết.' }, { status: 404 });
      }
      const airMeta = parseVnDateToYmdAndDiff(existing.deadlineDate) || {
        ymd: new Date().toISOString().slice(0, 10),
        display: existing.deadlineDate || formatVnDatePlusDays(0),
        diffDays: 0,
      };
      const airText = buildSingleGroupAirReminderMessage({
        dealCode: existing.dealCode || 'DEAL',
        kocHandle: (existing.kocHandle || 'koc').replace(/^@/, ''),
        kocName: existing.kocName || existing.kocHandle || 'KOC',
        brandName: existing.brandName || 'B2C',
        storeName: existing.storeName || 'Gian hàng chính hãng',
        picName: existing.picName || 'Team Booking',
        productName: existing.productName || 'Sản phẩm chiến dịch',
        requiredHashtags: existing.requiredHashtags || [],
        plannedAirDateDisplay: airMeta.display,
        plannedAirDateYmd: airMeta.ymd,
        diffDays: airMeta.diffDays,
        bucket:
          airMeta.diffDays < 0 ? 'OVERDUE' : airMeta.diffDays === 0 ? 'TODAY' : 'UPCOMING',
        dealStatus: existing.dealStatus || 'ĐÃ_DUYỆT_NHÁP',
        airedVideoUrl: existing.airedVideoUrl,
        draftVideoUrl: existing.draftVideoUrl,
        zaloGroupId: groupId,
        zaloGroupName: existing.groupName,
      });

      const sent = await sendZaloMessage(groupId, airText);
      return NextResponse.json({
        ok: true,
        sentToZalo: sent,
        message: sent
          ? 'Đã gửi tin nhắc lịch Air vào nhóm Zalo KOC.'
          : 'Đã khởi tạo nội dung nhắc lịch Air.',
        previewText: airText,
      });
    }

    if (action === 'SEND_BBNT_SUMMARY') {
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy nhóm liên kết.' }, { status: 404 });
      }
      const bbntText = buildSettlementSummaryMessage(existing, groupId);
      const sent = await sendZaloMessage(groupId, bbntText);
      return NextResponse.json({
        ok: true,
        sentToZalo: sent,
        message: sent
          ? 'Đã gửi phiếu đối soát BBNT & Thuế vào nhóm Zalo.'
          : 'Đã tạo phiếu đối soát BBNT & Thuế.',
        previewText: bbntText,
      });
    }

    if (action === 'UPDATE_DEAL_STATUS') {
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy nhóm liên kết.' }, { status: 404 });
      }
      const nextStatus = (body?.dealStatus || existing.dealStatus) as ZaloDealWorkflowStatus;
      const reviewNote = String(body?.reviewNote || '').trim();
      const updated: ZaloGroupMapping = {
        ...existing,
        dealStatus: nextStatus,
        draftReviewNote: reviewNote || existing.draftReviewNote,
        updatedAt: new Date().toISOString(),
      };
      setGroupMapping(updated);

      const statusNotification = [
        `🔔 CẬP NHẬT TRẠNG THÁI DEAL TỪ WEB-ADMIN`,
        `----------------------------------------`,
        `• Mã Deal: ${updated.dealCode || '—'} (${updated.brandName || '—'})`,
        `• KOC: ${updated.kocName || updated.kocHandle || '—'}`,
        `• Trạng thái mới: ${updated.dealStatus}`,
        reviewNote ? `• Ghi chú từ PIC/Quản lý: ${reviewNote}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const sent = await sendZaloMessage(groupId, statusNotification);
      return NextResponse.json({
        ok: true,
        sentToZalo: sent,
        mapping: updated,
        message: 'Đã cập nhật trạng thái Deal và đồng bộ thông báo.',
      });
    }

    // Mặc định: LINK hoặc cập nhật thông tin nhóm
    const rawHashtags = body?.requiredHashtags;
    const parsedHashtags = Array.isArray(rawHashtags)
      ? rawHashtags
      : typeof rawHashtags === 'string' && rawHashtags.trim()
        ? rawHashtags
            .split(/[,\s]+/)
            .map((h) => h.replace(/^#/, '').trim())
            .filter(Boolean)
        : existing?.requiredHashtags || ['UpbaseB2C', 'ReviewChinhHang'];

    const rawAllowedBrands = body?.allowedBrands;
    const parsedAllowedBrands = Array.isArray(rawAllowedBrands)
      ? rawAllowedBrands
      : typeof rawAllowedBrands === 'string' && rawAllowedBrands.trim()
        ? rawAllowedBrands
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean)
        : existing?.allowedBrands || (body?.brandName ? [String(body.brandName).trim()] : undefined);

    const mapping: ZaloGroupMapping = {
      groupId,
      groupName: body?.groupName
        ? String(body.groupName).trim()
        : existing?.groupName || `[${body?.brandName || 'B2C'} x ${body?.kocName || groupId}]`,
      groupRole: (body?.groupRole || existing?.groupRole || 'KOC_GROUP') as ZaloGroupRole,
      accessStatus: (body?.accessStatus || existing?.accessStatus || 'APPROVED') as ZaloGroupAccessStatus,
      allowedBrands: parsedAllowedBrands,
      dealCode: body?.dealCode ? String(body.dealCode).trim() : existing?.dealCode,
      kocHandle: body?.kocHandle
        ? String(body.kocHandle).replace(/^@/, '').trim()
        : existing?.kocHandle,
      kocName: body?.kocName ? String(body.kocName).trim() : existing?.kocName,
      brandName: body?.brandName ? String(body.brandName).trim() : existing?.brandName,
      storeName: body?.storeName ? String(body.storeName).trim() : existing?.storeName,
      picName: body?.picName ? String(body.picName).trim() : existing?.picName || 'Hà Thị Thủy',
      leaderName: body?.leaderName ? String(body.leaderName).trim() : existing?.leaderName,
      productName: body?.productName ? String(body.productName).trim() : existing?.productName,
      pillarName: body?.pillarName ? String(body.pillarName).trim() : existing?.pillarName,
      briefSummary: body?.briefSummary ? String(body.briefSummary).trim() : existing?.briefSummary,
      requiredHashtags: parsedHashtags,
      expectedProductUrl: body?.expectedProductUrl
        ? String(body.expectedProductUrl).trim()
        : existing?.expectedProductUrl,
      deadlineDate: body?.deadlineDate
        ? String(body.deadlineDate).trim()
        : existing?.deadlineDate || '31/10/2026',
      bookingFeeNet:
        body?.bookingFeeNet !== undefined
          ? Math.round(Number(body.bookingFeeNet || 0))
          : existing?.bookingFeeNet,
      dealStatus: (body?.dealStatus || existing?.dealStatus || 'ĐANG_QUAY_NHÁP') as ZaloDealWorkflowStatus,
      draftVideoUrl: body?.draftVideoUrl ? String(body.draftVideoUrl).trim() : existing?.draftVideoUrl,
      airedVideoUrl: body?.airedVideoUrl ? String(body.airedVideoUrl).trim() : existing?.airedVideoUrl,
      trackingCode: body?.trackingCode ? String(body.trackingCode).trim().toUpperCase() : existing?.trackingCode,
      sampleShippedAt: body?.sampleShippedAt ? String(body.sampleShippedAt).trim() : existing?.sampleShippedAt,
      sparkAdsCode: body?.sparkAdsCode ? String(body.sparkAdsCode).trim() : existing?.sparkAdsCode,
      linkedAt: existing?.linkedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setGroupMapping(mapping);
    return NextResponse.json({
      ok: true,
      message: 'Đã lưu cấu hình liên kết nhóm Zalo.',
      mapping,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi lưu thông tin liên kết.' },
      { status: 500 }
    );
  }
}
