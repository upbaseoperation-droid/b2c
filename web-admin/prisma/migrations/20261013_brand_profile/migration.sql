-- Hồ sơ thương hiệu do phòng B2C quản lý (định vị, sản phẩm, quy chuẩn, pháp lý, trần thù lao, tài liệu).
CREATE TABLE "BrandProfileRecord" (
  "key" TEXT PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
