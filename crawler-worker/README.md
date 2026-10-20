# crawler-worker

Worker crawl chạy riêng, tách khỏi web-admin. Bản đầu làm một việc: **kiểm tra link air của KOC** trên TikTok, Shopee Video, Facebook và Instagram, phục vụ bước nghiệm thu trong quy trình booking.

Với mỗi link, worker trả về:
- link có đúng là một bài đăng (có ID) không, và bài còn hiển thị công khai không;
- kênh đăng, ngày air, caption, hashtag;
- view, like, bình luận, chia sẻ, lưu (trường nào nền tảng có công khai);
- có gắn giỏ hàng hoặc link sản phẩm không, kèm trích xuất trực tiếp **link giỏ hàng (`productUrl`)**, **mã sản phẩm (`productId`)**, **mã gian hàng (`sellerId`)** và danh sách sản phẩm trong giỏ (`cartProducts`);
- kết quả đối chiếu với điều kiện của deal: đúng kênh, đúng lịch air, đủ hashtag, có nhắc brand, có gắn sản phẩm, đạt view tối thiểu.

Kết luận gồm 3 mức: `PASS` (đạt), `REVIEW` (cần người xem lại, thường do nền tảng không công khai dữ liệu đó) và `FAIL` (không đạt).

## Chạy

Cần Node 24 trở lên. Worker không có dependency khi chạy.

```bash
cp .env.example .env       # điền WORKER_TOKEN
npm start                  # http://localhost:8790
npm run check -- <link 1> <link 2>   # kiểm tra nhanh, không cần bật server
npm test
```

Chạy bằng Docker:

```bash
docker build -t upbase-crawler-worker .
docker run -d -p 8790:8790 --env-file .env upbase-crawler-worker
```

Phía web-admin, khai báo trong `web-admin/.env.local`:

```
CRAWLER_WORKER_URL=http://localhost:8790
CRAWLER_WORKER_TOKEN=<giống WORKER_TOKEN>
```

## API

`GET /health`: trạng thái, số bản ghi cache, độ dài hàng đợi theo nền tảng, đã cấu hình proxy hay chưa.

`POST /v1/links/check` (header `Authorization: Bearer <WORKER_TOKEN>`)

Áp cùng một điều kiện cho mọi link:

```json
{
  "links": ["https://www.tiktok.com/@abc/video/7638...", "https://sv.shopee.vn/share-video/..."],
  "expect": {
    "handle": "abc",
    "airFrom": "2026-10-01",
    "airTo": "2026-10-31",
    "requiredHashtags": ["larocheposay"],
    "requiredKeywords": ["La Roche-Posay"],
    "requireProductLink": true,
    "minViews": 10000
  }
}
```

Hoặc đặt điều kiện riêng cho từng link (mỗi link ứng với một deal): `{ "items": [{ "url": "...", "expect": { ... } }] }`.

Tối đa 100 link mỗi lần gọi. Kiểu dữ liệu trả về nằm ở `src/core/types.ts` (`LinkCheckResult`).

## Từng nền tảng lấy được gì

| | TikTok | Facebook | Instagram | Shopee Video |
|---|---|---|---|---|
| Cách lấy | Trang video (tự giải WAF) | HTML trả cho bot xem trước link | Meta tags trả cho bot xem trước link | Trang chia sẻ `sv.shopee.vn` |
| Kênh đăng | ✓ | ✓ | ✓ | ✓ |
| Ngày air | ✓ | ✓ | ✓ (theo ngày) | ✗ |
| View | ✓ | ✓ | ✗ | ✗ |
| Like / bình luận | ✓ | ✓ (tổng reactions) | ✓ (số làm tròn) | ✓ |
| Chia sẻ / lưu | ✓ | một phần | ✗ | ✗ |
| Gắn sản phẩm & Link giỏ hàng | ✓ (`seo_url`, `product_id`, `seller_id` từ `anchors[].extra`) | chỉ khi có tag sản phẩm hoặc link trong caption | chỉ khi có link trong caption | ✗ |
| Follower kênh | ✓ | ✗ | ✗ | ✗ |

Trường nào nền tảng không công khai sẽ có giá trị `null` và được ghi vào `limitations`. Điều kiện nghiệm thu dựa trên trường đó sẽ ra `REVIEW` thay vì `FAIL`.

Link rút gọn (`vt.tiktok.com`, `fb.watch`, `facebook.com/share/...`, `shp.ee`) được tự mở ra link gốc.

## Chống bị chặn

- Mỗi nền tảng có hàng đợi riêng: tối đa 3 request đồng thời, cách nhau tối thiểu 400 ms.
- Tự thử lại với backoff khi gặp lỗi mạng hoặc HTTP 429/5xx.
- Kết quả chắc chắn (`LIVE`, `UNAVAILABLE`) được cache 10 phút. Kết quả `BLOCKED`/`ERROR` không cache để lần sau thử lại.
- Proxy: đặt `HTTPS_PROXY` và `NODE_USE_ENV_PROXY=1`. Nên dùng proxy residential Việt Nam khi kiểm tra số lượng lớn.
- Log ghi dạng JSON một dòng (`http.retry`, `http.error`, `check.failed`, `links.checked`) để theo dõi khi nền tảng đổi cấu trúc trang.

## Thêm nền tảng mới

1. Thêm nhận diện link trong `src/core/detect.ts`.
2. Viết adapter trong `src/adapters/` theo interface `PlatformAdapter` (`src/core/types.ts`).
3. Đăng ký adapter và limiter trong `src/check-link.ts`.
4. Lưu một trang HTML mẫu vào `tests/fixtures/` và viết test cho phần bóc tách.
