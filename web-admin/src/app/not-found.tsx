import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold text-ink mb-2">Không tìm thấy trang</h2>
      <p className="text-sm text-ink-3 mb-4">Trang bạn yêu cầu không tồn tại hoặc đã bị di chuyển.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:opacity-90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
