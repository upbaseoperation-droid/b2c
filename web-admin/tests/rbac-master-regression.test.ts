import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterScopedBrands, filterScopedStores, isBrandManagedByUser, isPlanManagedByUser } from '../src/lib/rbacScope';
import { isBrandPartnerForBrand } from '../src/lib/brands/domain';
import { USERS, INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS } from '../src/lib/mockData';
import { resolveUserProfile } from '../src/lib/larkAuth';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterScopedBrands, filterScopedStores, isBrandManagedByUser, isPlanManagedByUser, isStaffGlobalAdminOrManager } from '../src/lib/rbacScope';
import { isBrandPartnerForBrand } from '../src/lib/brands/domain';
import { USERS, INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS } from '../src/lib/mockData';
import { resolveUserProfile } from '../src/lib/larkAuth';
import {
  INITIAL_PERMISSION_MATRIX,
  canUserPerformAction,
  isTabAllowedForRole,
  getAllowedTabsForRole,
  getDefaultLandingTabForRole,
  ROLE_ALLOWED_TABS,
  type RoleDefinition,
  type RbacAction,
} from '../src/lib/rbacData';
import type { UserProfile, UserRole } from '../src/lib/types';

test('Thiếu danh tính không nhận toàn bộ danh mục', () => {
  assert.deepEqual(filterScopedBrands(INITIAL_BRANDS, null), []);
  assert.deepEqual(filterScopedStores(INITIAL_STORE_PORTFOLIOS, null), []);
});

test('Tên brand bao hàm nhau không được dùng để mở rộng quyền', () => {
  const user = { ...USERS[0], role: 'BOOKING_MEMBER' as const, permissions: [], assignedBrands: ['Clio'], linkedEntityName: undefined };
  assert.equal(isBrandManagedByUser('ClubClio', user), false);
  assert.equal(isBrandManagedByUser('Clio', user), true);
  assert.equal(isBrandPartnerForBrand({ ...user, role: 'BRAND_PARTNER' }, 'ClubClio'), false);
});

test('Tên PIC rỗng không khớp mọi kế hoạch', () => {
  const user = { ...USERS[0], name: '', role: 'BOOKING_MEMBER' as const, permissions: [], assignedBrands: [], linkedEntityName: undefined };
  assert.equal(isPlanManagedByUser({ pic: 'Một người khác' } as never, user), false);
});

test('SSO không lấy vai trò quản trị chỉ vì trùng tên', () => {
  assert.throws(() => resolveUserProfile({ open_id: 'unknown', name: USERS[0].name, email: 'unknown@example.test' }));
});

test('Đăng nhập Lark tài khoản Trần Hữu Chiến trả về đúng hồ sơ Business Operation Leader, không bị gán nhầm Giám đốc', () => {
  const byName = resolveUserProfile({ open_id: 'ou_chien_lark', name: 'Trần Hữu Chiến' });
  assert.equal(byName.id, 'user-huu-chien');
  assert.equal(byName.name, 'Trần Hữu Chiến');
  assert.equal(byName.roleTitle, 'Business Operation Leader (Operation)');

  const byEmail = resolveUserProfile({ open_id: 'ou_chien_lark_2', name: 'Tran Huu Chien', email: 'chienth@upbase.vn' });
  assert.equal(byEmail.id, 'user-huu-chien');
  assert.equal(byEmail.name, 'Trần Hữu Chiến');
});

// =========================================================================
// KIỂM THỬ TOÀN DIỆN MA TRẬN PHÂN QUYỀN RBAC & CRUD CHO TẤT CẢ VAI TRÒ
// =========================================================================

test('Audit 1: Ma trận phân quyền tính năng nghiệp vụ có đủ định nghĩa cho tất cả các vai trò cốt lõi', () => {
  const requiredRoles: UserRole[] = [
    'ADMIN',
    'MANAGER',
    'GROWTH_MANAGER',
    'MEDIA_MANAGER',
    'LEADER',
    'MEMBER',
    'LEGAL',
    'FINANCE',
    'SIGN_ADMIN',
    'BRAND_PARTNER',
    'KOC_PARTNER',
    'CTV_PARTNER',
  ];

  assert.ok(INITIAL_PERMISSION_MATRIX.length >= 26, `Ma trận phải đủ tối thiểu 26 tính năng nghiệp vụ (thực tế: ${INITIAL_PERMISSION_MATRIX.length})`);

  for (const item of INITIAL_PERMISSION_MATRIX) {
    assert.ok(item.id, 'Mỗi mục trong ma trận phải có id');
    assert.ok(item.featureName, `Mục ${item.id} thiếu tên tính năng`);
    for (const role of requiredRoles) {
      const level = item.permissions[role];
      assert.ok(
        level && ['ALL', 'APPROVE', 'SCOPED', 'VIEW', 'DENIED'].includes(level),
        `Tính năng ${item.id} thiếu hoặc sai định nghĩa mức quyền cho vai trò ${role} (nhận được: ${level})`
      );
    }
  }
});

test('Audit 2: Vai trò Backoffice (Pháp chế, Kế toán, Điều phối ký) có đúng quyền CRUD hợp đồng & thanh toán', () => {
  const legalUser: UserProfile = { ...USERS[0], role: 'LEGAL', permissions: [] };
  const financeUser: UserProfile = { ...USERS[0], role: 'FINANCE', permissions: [] };
  const signUser: UserProfile = { ...USERS[0], role: 'SIGN_ADMIN', permissions: [] };

  // Pháp chế (LEGAL)
  assert.equal(canUserPerformAction(legalUser, 'legal_ocr_extraction', 'read'), true);
  assert.equal(canUserPerformAction(legalUser, 'legal_ocr_extraction', 'write'), true);
  assert.equal(canUserPerformAction(legalUser, 'contract_creation', 'read'), true);
  assert.equal(canUserPerformAction(legalUser, 'contract_creation', 'approve'), true);
  assert.equal(canUserPerformAction(legalUser, 'plan_target_month', 'read'), false, 'Pháp chế không xem kế hoạch tháng');
  assert.equal(canUserPerformAction(legalUser, 'deal_create_management', 'write'), false, 'Pháp chế không tạo deal');

  // Kế toán (FINANCE)
  assert.equal(canUserPerformAction(financeUser, 'payment_request_submission', 'read'), true);
  assert.equal(canUserPerformAction(financeUser, 'payment_request_submission', 'write'), true);
  assert.equal(canUserPerformAction(financeUser, 'payment_approval_disbursement', 'approve'), true);
  assert.equal(canUserPerformAction(financeUser, 'agency_financial_margins', 'read'), true);
  assert.equal(canUserPerformAction(financeUser, 'contract_creation', 'approve'), true);
  assert.equal(canUserPerformAction(financeUser, 'raw_data_export', 'read'), true);
  assert.equal(canUserPerformAction(financeUser, 'script_drafting', 'read'), false, 'Kế toán không can thiệp soạn kịch bản');

  // Điều phối ký điện tử (SIGN_ADMIN)
  assert.equal(canUserPerformAction(signUser, 'contract_creation', 'read'), true);
  assert.equal(canUserPerformAction(signUser, 'contract_creation', 'write'), true);
  assert.equal(canUserPerformAction(signUser, 'payment_approval_disbursement', 'approve'), false, 'Điều phối ký không duyệt chi');
});

test('Audit 3: CRUD actions (create, read, update, delete, approve) kiểm tra đúng cấp độ', () => {
  const adminUser: UserProfile = { ...USERS[0], role: 'ADMIN', permissions: [] };
  const managerUser: UserProfile = { ...USERS[0], role: 'MANAGER', permissions: [] };
  const memberUser: UserProfile = { ...USERS[0], role: 'BOOKING_MEMBER', permissions: [] };
  const brandPartner: UserProfile = { ...USERS[0], role: 'BRAND_PARTNER', permissions: [] };

  // 1. Admin có toàn quyền mọi thao tác CRUD
  const actions: RbacAction[] = ['create', 'read', 'update', 'delete', 'approve', 'write', 'export'];
  for (const act of actions) {
    assert.equal(canUserPerformAction(adminUser, 'master_data_brand_stores', act), true);
    assert.equal(canUserPerformAction(adminUser, 'plan_target_month', act), true);
  }

  // 2. Member có thể read/create/update deal booking trong phạm vi được giao, nhưng KHÔNG được delete master data
  assert.equal(canUserPerformAction(memberUser, 'deal_create_management', 'read'), true);
  assert.equal(canUserPerformAction(memberUser, 'deal_create_management', 'create'), true);
  assert.equal(canUserPerformAction(memberUser, 'deal_create_management', 'update'), true);
  assert.equal(canUserPerformAction(memberUser, 'master_data_brand_stores', 'delete'), false, 'Member không thể xóa Master Data');
  assert.equal(canUserPerformAction(memberUser, 'plan_target_month', 'approve'), false, 'Member không được tự duyệt chỉ tiêu');

  // 3. Manager có quyền approve chỉ tiêu và sửa master data
  assert.equal(canUserPerformAction(managerUser, 'plan_target_month', 'approve'), true);
  assert.equal(canUserPerformAction(managerUser, 'master_data_brand_stores', 'write'), true);

  // 4. Đối tác bên ngoài (Brand Partner) bị chặn xem/sửa dữ liệu nội bộ
  assert.equal(canUserPerformAction(brandPartner, 'koc_master_database', 'read'), false, 'Brand bị ẩn danh bạ độc quyền KOC');
  assert.equal(canUserPerformAction(brandPartner, 'agency_financial_margins', 'read'), false, 'Brand bị ẩn biên lợi nhuận Net');
  assert.equal(canUserPerformAction(brandPartner, 'security_audit_log_access', 'read'), false, 'Brand không xem audit log');
});

test('Audit 4: Các quyền phê duyệt đặc thù (Special Staff Permissions) kích hoạt chuẩn xác', () => {
  // Chuyên viên có ngoại lệ canApproveBudget
  const memberWithBudget: UserProfile = {
    ...USERS[0],
    role: 'BOOKING_MEMBER',
    permissions: ['canApproveBudget'],
  };
  assert.equal(canUserPerformAction(memberWithBudget, 'plan_target_month', 'approve'), true);

  // Chuyên viên có ngoại lệ canApproveP3
  const memberWithP3: UserProfile = {
    ...USERS[0],
    role: 'BOOKING_MEMBER',
    permissions: ['canApproveP3'],
  };
  assert.equal(canUserPerformAction(memberWithP3, 'p3_performance_evaluation', 'approve'), true);

  // Chuyên viên có ngoại lệ canApprovePayment
  const memberWithPayment: UserProfile = {
    ...USERS[0],
    role: 'BOOKING_MEMBER',
    permissions: ['canApprovePayment'],
  };
  assert.equal(canUserPerformAction(memberWithPayment, 'payment_approval_disbursement', 'approve'), true);

  // Chuyên viên có ngoại lệ canManageMasterData
  const memberWithMaster: UserProfile = {
    ...USERS[0],
    role: 'BOOKING_MEMBER',
    permissions: ['canManageMasterData'],
  };
  assert.equal(canUserPerformAction(memberWithMaster, 'master_data_brand_stores', 'write'), true);
  assert.equal(canUserPerformAction(memberWithMaster, 'master_data_brand_stores', 'create'), true);

  // Chuyên viên có ngoại lệ canExportRawData
  const memberWithExport: UserProfile = {
    ...USERS[0],
    role: 'BOOKING_MEMBER',
    permissions: ['canExportRawData'],
  };
  assert.equal(canUserPerformAction(memberWithExport, 'raw_data_export', 'export'), true);
});

test('Audit 5: Phân quyền màn hình (Role Allowed Tabs) tuân thủ chặt chẽ nguyên tắc bảo mật HUB-2.6', () => {
  // 1. Chỉ Quản lý cấp cao mới thấy cấu hình hệ thống (api-settings)
  assert.equal(isTabAllowedForRole('ADMIN', 'api-settings'), true);
  assert.equal(isTabAllowedForRole('MANAGER', 'api-settings'), true);
  assert.equal(isTabAllowedForRole('GROWTH_MANAGER', 'api-settings'), true);
  assert.equal(isTabAllowedForRole('MEDIA_MANAGER', 'api-settings'), true);
  assert.equal(isTabAllowedForRole('LEADER', 'api-settings'), false, 'Leader không thấy api-settings');
  assert.equal(isTabAllowedForRole('BOOKING_MEMBER', 'api-settings'), false, 'Specialist không thấy api-settings');
  assert.equal(isTabAllowedForRole('BRAND_PARTNER', 'api-settings'), false, 'Đối tác không thấy api-settings');

  // 2. Chỉ ADMIN mới có quyền vào trung tâm phân quyền partner-access
  assert.equal(isTabAllowedForRole('ADMIN', 'partner-access'), true);
  assert.equal(isTabAllowedForRole('LEADER', 'partner-access'), false);
  assert.equal(isTabAllowedForRole('BOOKING_MEMBER', 'partner-access'), false);

  // 3. Tab mặc định đúng vai trò (Landing Tab)
  assert.equal(getDefaultLandingTabForRole('ADMIN'), 'cockpit');
  assert.equal(getDefaultLandingTabForRole('MANAGER'), 'cockpit');
  assert.equal(getDefaultLandingTabForRole('LEGAL'), 'contracts');
  assert.equal(getDefaultLandingTabForRole('FINANCE'), 'contracts');
  assert.equal(getDefaultLandingTabForRole('BRAND_PARTNER'), 'brand-hub');
  assert.equal(getDefaultLandingTabForRole('KOC_PARTNER'), 'koc-hub');
  assert.equal(getDefaultLandingTabForRole('CTV_PARTNER'), 'self-channel-hub');
});
