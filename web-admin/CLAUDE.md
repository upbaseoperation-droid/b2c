@AGENTS.md

## Giao diện

Mọi thay đổi giao diện và câu chữ trong app tuân theo [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): token màu trong `src/app/globals.css`, thành phần trong `src/components/ui/`, định dạng số trong `src/lib/format.ts`. Đọc file đó trước khi sửa UI.

Chuyển động (animation, transition) theo §9 của DESIGN_SYSTEM.md: dùng thành phần trong `src/components/ui/motion.tsx` và token `--motion-*` / `ease-*`, không tự viết keyframe trong màn hình.
