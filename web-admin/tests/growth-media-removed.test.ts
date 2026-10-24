import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMasterStaffMember, INITIAL_DEPARTMENT_ACCESS_RULES } from '../src/lib/rbacData';
import { defaultPolicy, userWithPolicy } from '../src/lib/server/accessPolicy';
import type { UserProfile } from '../src/lib/types';

const staff = (department: string, team: string, position: string) =>
  ({ id: `t-${department}-${team}`, staffCode: 'TX999', name: 'Người thử', email: `thu.${team}@upbase.vn`, department, team, position, location: 'HN' }) as never;

test('Nhân sự khối Growth / Media không còn được vào hệ thống Marketing B2C', () => {
  for (const s of [staff('Growth 1', 'Growth 1', 'Growth Executive'), staff('Media TikTok', 'Media TikTok', 'Media Specialist'), staff('Growth (HCM)', 'Growth', 'Trưởng phòng Growth')]) {
    const c = classifyMasterStaffMember(s, INITIAL_DEPARTMENT_ACCESS_RULES, {});
    assert.equal(c.departmentScope, 'OTHER_BLOCKED');
    assert.equal(c.canLogin, false);
  }
  const booking = classifyMasterStaffMember(staff('Booking', 'Booking', 'Chuyên viên Booking'), INITIAL_DEPARTMENT_ACCESS_RULES, {});
  assert.equal(booking.departmentScope, 'MARKETING_B2C');
});

test('Tài khoản còn giữ vai trò Growth / Media cũ trong cấu hình đã lưu bị chặn đăng nhập', () => {
  for (const role of ['GROWTH_MANAGER', 'GROWTH_MEMBER', 'MEDIA_MANAGER', 'MEDIA_MEMBER']) {
    const user = { id: `old-${role}`, name: 'Tài khoản cũ', email: `${role.toLowerCase()}@vidu.test`, role } as unknown as UserProfile;
    assert.equal(userWithPolicy(user, defaultPolicy, 1), null, role);
  }
  const ok = { id: 'u-booking', name: 'Chuyên viên', email: 'booking@vidu.test', role: 'BOOKING_MEMBER' } as unknown as UserProfile;
  assert.notEqual(userWithPolicy(ok, defaultPolicy, 1), null);
});
