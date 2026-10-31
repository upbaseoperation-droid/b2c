import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SESSION_COOKIE_NAME, decodeSessionToken } from '@/lib/larkAuth';
import { effectiveUser } from '@/lib/server/accessPolicy';
import { UiGallery } from '@/components/ui-gallery/UiGallery';

export const dynamic = 'force-dynamic';

/** Trang mẫu thành phần giao diện. Chỉ quản trị viên thấy; người khác nhận 404, không lộ route tồn tại. */
export default async function UiPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = token ? decodeSessionToken(token) : null;
  const actor = user ? await effectiveUser(user) : null;
  if (!actor || actor.role !== 'ADMIN') notFound();

  return (
    <main className="min-h-dvh bg-canvas">
      <UiGallery />
    </main>
  );
}
