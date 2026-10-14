# Audit phân quyền và master data — 14/10/2026

Kết luận: chưa đủ điều kiện mở sử dụng với dữ liệu thật. Có đường tự cấp phiên quản trị trong production; cấu hình quyền trên UI chưa phải nguồn quyền máy chủ; nhiều thao tác master data chưa lưu bền vững.

## Phạm vi và bằng chứng

- Rà soát checkout hiện tại `web-admin`, gồm các thay đổi chưa commit đang có. Không sửa mã ứng dụng.
- Kiểm tra middleware, xác thực Lark/đối tác, RBAC, API hồ sơ brand, API kế hoạch, master data và liên kết màn hình.
- Chạy `node --import tsx --test tests/contract-auth.test.ts tests/brand-profile.test.ts`: 7 tests, 6 pass, 1 fail. Test production thất bại ngay ở `/api/auth/me`: thực tế 200, kỳ vọng 401; các assertion sandbox phía sau trong test này chưa được chạy.
- Gọi riêng handler GET sandbox bằng NextRequest trong tiến trình local với NODE_ENV=production: trả 307 và cookie giải mã có role ADMIN, provider SANDBOX. Không gọi deployment thực tế.
- UI/UX được đánh giá qua mã nguồn, chưa kiểm tra hình ảnh, mobile, bàn phím, screen reader hay phiên production thực tế. Không kiểm tra cấu hình secret triển khai. Không ghi dữ liệu vào dịch vụ production.

## Phát hiện ưu tiên

### A01 — P0: Chưa đăng nhập vẫn nhận phiên quản trị

`web-admin/src/app/api/auth/me/route.ts:32` tự cấp USERS[0] khi thiếu cookie và không có `strict=1`. `web-admin/src/app/api/auth/lark/sandbox/route.ts:143` cũng mặc định USERS[0], không chặn production. Middleware bỏ qua `/api/auth`, nên nhánh chặn người chưa đăng nhập ở middleware không bảo vệ hai đường này.

Ảnh hưởng: có thể có phiên quản trị mà không cần chứng minh danh tính. `strict=1` do caller chọn không phải ranh giới bảo mật. Kiểm thử hiện hữu xác nhận lỗi ở auth/me.

Sửa: auth/me luôn trả 401 khi thiếu phiên; sandbox bị vô hiệu ở production cho cả GET/POST; nếu cần demo, dùng môi trường và dữ liệu tách biệt. Tiêu chí: cả ba request không cookie đều không được phát cookie phiên quản trị.

### A02 — P1: Đăng nhập đối tác không xác minh chủ tài khoản

`web-admin/src/app/api/auth/partner/login/route.ts:14` tra email/accountId trong danh sách tĩnh rồi ký phiên, không xác minh mật khẩu, Google token, OTP hay magic link.

Ảnh hưởng: biết định danh đối tác là đủ để đăng nhập dưới danh tính đó. Sửa bằng luồng xác minh danh tính thực và lấy trạng thái tài khoản từ nguồn máy chủ. Kiểm tra: chỉ email/accountId không đủ để nhận phiên.

### A03 — P1: Quyền trên UI và quyền hiệu lực không đồng bộ

`web-admin/src/lib/rbacData.ts:1286` lưu override, quy tắc phòng ban, quyền màn hình, vai trò nhân sự trong localStorage. `CentralizedRbacHubView.tsx:651` chỉ đổi ma trận bằng React state. Trong khi đó `larkAuth.ts:150` đọc USERS và `:178` phân loại bằng INITIAL_DEPARTMENT_ACCESS_RULES với override rỗng.

Ảnh hưởng: admin thấy “đã khóa/đã cập nhật” nhưng đăng nhập trên thiết bị khác vẫn theo cấu hình cũ; ma trận mất khi tải lại. Token chứa bản sao user và tồn tại 7 ngày, decode không tra trạng thái thu hồi hiện hành.

Sửa: một nguồn quyền trên máy chủ, API quản trị có kiểm tra quyền, phiên tham chiếu user/policy version; UI hiển thị quyền hiệu lực và nguồn kế thừa. Kiểm tra hai trình duyệt và phiên đang mở sau khi thu hồi quyền.

### A04 — P1: API kế hoạch thiếu kiểm tra phạm vi dữ liệu

`web-admin/src/app/api/monthly-plans/_shared.ts:7` chỉ loại người không có phiên hoặc có partnerType. `web-admin/src/lib/server/monthlyPlanStore.ts:150` trả mọi kế hoạch chưa xóa; `:212` cập nhật theo ID/revision, không kiểm tra actor có được quản lý brand/store hoặc thực hiện chuyển trạng thái đó không. Actor chủ yếu dùng để ghi tên người sửa.

Ảnh hưởng: nhân viên nội bộ có thể đọc kế hoạch ngoài phạm vi và gửi cập nhật trực tiếp dù UI đã lọc. Sửa bằng kiểm tra tài nguyên và hành động trên server, bao gồm duyệt/chốt/tạo phiên bản. Revision chỉ ngăn ghi đè, không thay thế phân quyền.

### A05 — P1: API hồ sơ brand trả toàn bộ dữ liệu cho người có phiên

`web-admin/src/app/api/brands/profiles/route.ts:25` trả `listProfiles()` không lọc theo brand hoặc trường dữ liệu; không gọi requireReader trong GET. Middleware chỉ kiểm tra có phiên.

Ảnh hưởng: tài khoản đối tác có thể nhận hồ sơ các brand khác, bao gồm các phần có trong profile như pháp lý và ratecard. Việc UI ẩn trường không ngăn dữ liệu nằm trong response. Sửa bằng lọc brand và trường trên server; kiểm tra tài khoản brand A không nhận profile brand B.

### A06 — P1: Nguồn định danh và phạm vi quyền dễ khớp nhầm

`larkAuth.ts:150` chấp nhận email HOẶC trùng tên hiển thị để lấy vai trò có sẵn. `rbacScope.ts:87` dùng includes hai chiều với tên brand; các PIC cũng khớp theo chuỗi tên. Các filter tại `:276` trở đi trả toàn bộ khi user null. `canViewAllBrands` cũng được coi là global trong helper có tên “AdminOrManager”.

Ảnh hưởng: trùng tên người, brand có tên bao hàm nhau, thiếu user hoặc hiểu sai quyền “xem tất cả” có thể mở rộng phạm vi ngoài dự kiến. Sửa bằng ID bất biến, đối chiếu tenant + định danh Lark, mặc định từ chối khi thiếu user; tách quyền xem và quyền sửa.

### A07 — P1 có điều kiện: Có khóa ký phiên dự phòng cố định

`larkAuth.ts:210` dùng chuỗi cố định khi thiếu AUTH_SECRET/SESSION_SECRET. Nếu deployment thiếu cả hai biến, chữ ký phiên không còn là ranh giới đáng tin cậy. Chưa xác minh production có thiếu biến hay không.

Sửa: dừng khởi động production nếu thiếu secret, không fallback; thay khóa và thu hồi phiên nếu từng triển khai bằng khóa mặc định.

### M01 — P1: Phạm vi rỗng bị thay bằng toàn bộ master data

`MasterDataHubView.tsx:150` thay brands rỗng bằng INITIAL_BRANDS; `:190` làm tương tự với stores. Khi props mới rỗng, nhánh đồng bộ bỏ qua nên dữ liệu cũ vẫn còn. `page.tsx:1093` thực sự truyền scopedBrands/scopedStores vào đây.

Ảnh hưởng: tài khoản không được giao brand/store vẫn thấy danh mục mặc định, hoặc còn thấy dữ liệu từ phạm vi trước. Sửa: phân biệt “chưa tải” với “đã tải nhưng rỗng”; render trạng thái “Chưa được phân công”, không fallback dữ liệu đầy đủ.

### M02 — P1: Báo lưu thành công nhưng master data chỉ nằm trong màn hình

`MasterDataHubView.tsx:441,611,673,744` tạo/sửa brand, sản phẩm, pillar bằng setState; không có API lưu cho các thao tác này. `page.tsx:1093` không truyền callback tạo/cập nhật brand cho hub. Các danh mục VideoFormats, KocNiches, CastTiers cũng chỉnh state cục bộ.

Ảnh hưởng: tải lại mất sửa đổi; brand mới chưa xuất hiện trong nguồn dữ liệu của màn hình hồ sơ dù thông báo hướng người dùng sang đó. Hồ sơ brand có API lưu riêng, nhưng điều đó không có nghĩa các danh mục này đã được lưu.

Sửa: CRUD master data dùng chung có xác nhận server trước toast thành công, trạng thái đang lưu/lỗi/thử lại và version chống ghi đè. Kiểm tra tạo brand → mở hồ sơ → reload → người khác nhìn thấy cùng dữ liệu.

### M03 — P1: Đổi tên/xóa brand chưa bảo toàn liên kết

`MasterDataHubView.tsx:611` đổi tên chỉ cập nhật store/product trong state của hub. `:659` cho xóa brand có liên kết sau khi nhập tên nhưng chỉ loại brand khỏi danh sách; không xử lý các liên kết khác. API hồ sơ tra master bằng tên tại `brands/profiles/route.ts:73`.

Ảnh hưởng: tên brand ở kế hoạch/hồ sơ/phân công có thể khác nhau; xóa để lại store/product tham chiếu brand đã mất. Hiện ảnh hưởng chủ yếu ở state cục bộ; cần giải quyết trước khi nối lưu thật.

Sửa: liên kết bằng brandId, chặn xóa khi có phụ thuộc, ưu tiên archive; đổi tên không đổi định danh. Hiển thị đầy đủ số lượng đối tượng chịu ảnh hưởng trước thao tác.

### M04 — P2: Luồng lưu hồ sơ có hai chỗ UI và API không khớp

`BrandProfileDetail.tsx:2525` gửi WORKFLOW_RULES, nhưng danh sách SECTIONS ở `brands/profiles/route.ts:13` không nhận giá trị này → 400. API POST gọi `permissionsFor(user, master?.accountPic)` không truyền brandName; trong `brands/domain.ts:83`, quyền sửa của BRAND_PARTNER cần brandName → đối tác đúng brand vẫn bị từ chối.

Sửa: thống nhất danh mục section và tham số tính quyền giữa UI/server; kiểm thử lưu quy tắc vận hành và đối tác đúng brand/sai brand ở tầng route, không chỉ test helper.

### M05 — P2: Đồng bộ và nhật ký trình bày như thao tác thật

`MasterDataHubView.tsx:555` nút đồng bộ Lark dùng timeout và danh sách mẫu cố định, không gọi Lark. `CentralizedRbacHubView.tsx:309,666` ghi audit trong state với IP/device cố định.

Ảnh hưởng: người dùng tin dữ liệu đã được đồng bộ và quyền đã được ghi nhận truy vết. Sửa: kết nối thật hoặc ghi rõ “Dữ liệu minh họa”; nhật ký do server ghi, có actor, before/after, thời điểm và request ID.

### M06 — P2: Giá trị 0 bị âm thầm đổi thành mặc định

`MasterDataHubView.tsx:701,719` dùng `Number(commissionRate) || 15`, làm 0% thành 15%; `:766,783` dùng benchmarkUnitCost `|| 1000000`, làm chi phí 0 thành 1 triệu.

Sửa: phân biệt rỗng/NaN với 0; nếu 0 không hợp lệ thì báo lỗi cụ thể, không tự thay giá trị. Kiểm tra round-trip 0, số âm, rỗng và giá trị hợp lệ.

## UI/UX cần cải thiện theo luồng

1. Quản trị quyền: trình bày “Vai trò → Phạm vi brand/store → Quyền hành động → Ngoại lệ”, kèm quyền hiệu lực và nguồn kế thừa. Hiện nhiều lớp chỉnh sửa tạo cảm giác đã áp dụng trong khi server dùng dữ liệu khác.
2. Xem thử vai trò: ghi rõ chế độ xem thử và danh tính thật; chỉ kết luận đúng quyền sau khi API cũng kiểm tra danh tính tương ứng.
3. Master data: thông báo thành công chỉ sau lưu bền vững; có trạng thái đang lưu, thất bại, xung đột và dữ liệu chưa lưu.
4. Phạm vi rỗng: hiển thị lý do và hướng liên hệ quản trị; không hiển thị dữ liệu mẫu như dữ liệu được cấp quyền.
5. Xóa/lưu trữ: mặc định archive, hiển thị tác động và liên kết đến đối tượng phụ thuộc. Nhập tên xác nhận không giải quyết tính toàn vẹn dữ liệu.
6. Đồng bộ/import: có preview thêm/sửa/bỏ qua/lỗi, nguồn và thời điểm đồng bộ cuối; không báo đã đồng bộ khi chỉ nạp mẫu.

Những điểm đang có ích: tìm kiếm/lọc/phân trang, kiểm tra trùng tên brand/SKU, xác nhận xóa và lựa chọn tạm dừng; hồ sơ brand có kiểm tra revision và lịch sử. Tuy nhiên chúng chưa bù được lỗi xác thực và lưu dữ liệu ở trên.

## Thứ tự thực hiện đề xuất

1. Chặn A01, A02; kiểm tra A07. Bổ sung test production ở từng route để một assertion thất bại không che các nhánh còn lại.
2. Tập trung nguồn quyền máy chủ, thu hồi phiên và áp dụng scope/action cho API kế hoạch/hồ sơ.
3. Sửa M01, M04; sau đó nối CRUD master data bền vững với ID và ràng buộc liên kết.
4. Chỉnh thông báo, audit, import/sync; kiểm thử E2E theo admin, manager, nhân viên được giao/chưa được giao, đối tác A/B trên hai phiên độc lập.

## Tự đánh giá chất lượng báo cáo

Theo skill agent-self-evaluation: accuracy 4/5 (có bằng chứng mã nguồn và test; chưa xác nhận deployment), completeness 3/5 (chưa có QA trực quan/mobile), clarity 4/5 (có mức độ và tác động nhưng nhiều phát hiện), actionability 4/5 (có cách sửa/tiêu chí kiểm chứng, chưa có bản sửa), conciseness 4/5 (báo cáo dài để giữ bằng chứng). Trung bình 3,8/5.

Cải thiện ưu tiên: kiểm thử UI trực tiếp theo vai trò, kiểm thử API scope bằng fixture cô lập, xác minh cấu hình deployment. Người dùng có thể đồng ý với đánh giá nếu xem đây là audit mã nguồn và logic luồng; không nên coi là chứng nhận UI/UX trực quan hoàn chỉnh.
