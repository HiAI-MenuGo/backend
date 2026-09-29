# HiAI-MenuGo — Business Domain & F&B Operations Manual

> Tài liệu quy chuẩn toàn bộ kiến thức nghiệp vụ (Domain Knowledge), mô hình vận hành và chu trình kinh doanh F&B của hệ sinh thái **HiAI-MenuGo**. Mọi lập trình viên và AI Agent cần nắm vững tài liệu này để phát triển tính năng đúng logic nghiệp vụ.
>
> - 🏗️ **Kiến trúc kỹ thuật & Entry point:** Xem [AGENTS.md](./AGENTS.md)
> - ⛔ **Luật bắt buộc (RBAC, API, Mobile, Frontend):** Xem [RULES.md](./RULES.md)
> - 🎨 **Design System & UI/UX:** Xem [SKILLS.md](./SKILLS.md)

---

## 1. Mô Hình Kinh Doanh Multi-Tenant SaaS F&B

HiAI-MenuGo là nền tảng SaaS phục vụ ngành F&B (Nhà hàng, Quán cafe, Quán ăn) theo mô hình **Đa khách thuê (Multi-Tenant)** với cấu trúc phân cấp chặt chẽ:

```
Platform (SaaS Operator)
 └── Tenant (Chủ thương hiệu / Doanh nghiệp F&B)
      ├── TenantBranding (Logo, màu sắc nhận diện, banner)
      ├── MembershipTier (Hạng thành viên: Đồng, Bạc, Vàng, Kim Cương)
      ├── Voucher / Promotion (Chương trình khuyến mãi chung)
      └── Branch (Chi nhánh cửa hàng độc lập)
           ├── Table (Sơ đồ bàn theo khu vực)
           ├── Staff / TenantUser (Quản lý, Bếp, Thu ngân, Phục vụ)
           ├── Inventory / Ingredient (Kho nguyên liệu riêng của chi nhánh)
           └── OrderSession / Order (Phiên gọi món & đơn hàng)
```

### Nguyên tắc cô lập dữ liệu (Tenant Isolation)
- Dữ liệu giữa các Tenant **tuyệt đối không được phép nhìn thấy nhau**.
- Một Tenant có thể sở hữu 1 hoặc nhiều Chi nhánh (`Branch`). Chi nhánh dùng chung Menu hoặc có menu riêng, nhưng kho nguyên liệu và doanh thu được hạch toán độc lập theo từng chi nhánh.
- Khách hàng vãng lai khi quét QR chỉ thấy thông tin của đúng chi nhánh và bàn mình đang ngồi.

---

## 2. Ma Trận Phân Quyền RBAC (Role-Based Access Control)

Hệ thống phân cấp 5 nhóm quyền hạn tương ứng với các vị trí trong vận hành:

| Vai trò (Role) | Đối tượng sử dụng | Phạm vi dữ liệu | Quyền hạn nghiệp vụ |
|---|---|---|---|
| `PLATFORM_ADMIN` | Đội ngũ vận hành SaaS | Toàn hệ thống nền tảng | Quản lý danh sách Tenant, cấu hình các gói cước (Free/Pro/Enterprise), theo dõi subscription & hóa đơn. **TUYỆT ĐỐI KHÔNG** xem doanh thu, đơn hàng, dữ liệu nội bộ của bất kỳ Tenant nào. |
| `ADMIN` | Chủ thương hiệu / Giám đốc F&B | Toàn bộ chi nhánh thuộc Tenant | Toàn quyền cấu hình: Thực đơn, công thức định lượng (BOM), cài đặt chi nhánh, nhân sự, tài khoản ngân hàng nhận tiền, chương trình khuyến mãi, báo cáo tài chính tổng. |
| `MANAGER` | Quản lý cửa hàng / Cửa hàng trưởng | Chi nhánh được phân công (`req.user.branchId`) | Quản lý nhân viên chi nhánh, sơ đồ bàn, nhập/xuất/kiểm kê kho, duyệt hóa đơn, xuất báo cáo ca làm việc (Z-Report). |
| `KITCHEN` | Đầu bếp / Nhân viên pha chế | Màn hình KDS chi nhánh | Xem danh sách món cần chế biến theo thứ tự thời gian, chuyển trạng thái món (Pending ➔ Preparing ➔ Ready), bật/tắt báo hết món (Sold Out) tức thì. |
| `CASHIER` | Thu ngân / Nhân viên phục vụ | POS / Quầy thanh toán chi nhánh | Tạo đơn tại quầy, thao tác POS, áp dụng voucher/tích điểm thành viên, xác nhận thanh toán tiền mặt / VietQR, in bill, hủy món và hoàn kho đơn hủy. |

> Quy tắc code tương ứng (tenantId bắt buộc trong mọi Prisma query, middleware `requireRole`): xem [RULES.md](./RULES.md#1-multi-tenant-rbac-critical--quy-tắc-bảo-mật-số-1).

---

## 3. Chu Trình Vận Hành Khép Kín (Full F&B Lifecycle)

```
[Khách quét QR tại bàn] ─── (1. Đặt món) ───► [Order Session khởi tạo]
                                                         │
         ┌───────────────────────────────────────────────┴───────────────────────────────┐
         ▼ (2. Báo chế biến realtime)                                                    ▼ (3. Thu ngân thấy đơn)
[Màn hình Bếp KDS]                                                              [Màn hình POS Thu ngân]
   │                                                                               │
   ├─► PENDING: Đơn mới chờ xác nhận                                               ├─► Áp dụng mã Voucher
   ├─► PREPARING: Bếp bấm nấu (bắt đầu tính giờ)                                   ├─► Quét SĐT tích điểm Loyalty
   └─► READY/DONE: Món hoàn thành, gọi phục vụ bưng ra bàn                        └─► Chọn phương thức thanh toán
                                                                                           │
                                                                                           ▼ (4. Thanh toán)
                                                                                [Hóa đơn hoàn tất]
                                                                                           │
         ┌─────────────────────────────────────────────────────────────────────────────────┴───┐
         ▼                                                 ▼                                   ▼
 [Tự động trừ kho theo BOM]                      [Cộng điểm khách hàng]                 [In hóa đơn nhiệt]
```

### Chi tiết các bước:
1. **Khách hàng gọi món (QR Menu):** Khách dùng điện thoại quét mã QR dán trên mặt bàn. Hệ thống định danh `tenantId`, `branchId`, `tableId`. Khách chọn món, chọn tùy chọn (size, đường, đá, topping), ghi chú và bấm Gửi đơn.
2. **Bếp tiếp nhận (KDS):** Đơn xuất hiện ngay lập tức trên màn hình bếp qua WebSocket (Socket.IO). Âm thanh chuông báo kích hoạt. Bếp chuyển trạng thái từng món: `PENDING` ➔ `PREPARING` ➔ `READY`.
3. **Phục vụ & Thu ngân:** Thu ngân kiểm tra bàn, có thể gọi thêm món từ POS Web hoặc Mobile POS. Khách yêu cầu thanh toán: thu ngân nhập SĐT tích điểm, áp dụng voucher giảm giá (nếu có).
4. **Xác nhận thanh toán:**
   - **Tiền mặt:** Thu ngân nhận tiền, hệ thống tính tiền thối, bấm xác nhận hoàn tất.
   - **Chuyển khoản (VietQR):** Hệ thống sinh mã QR động (chứa số tiền chính xác và mã thanh toán duy nhất). Khách quét app ngân hàng chuyển tiền. Hệ sinh thái SePay Webhook tự động bắt giao dịch và đóng bàn trong 1-2 giây.
5. **Hậu mãi & Quản trị kho:**
   - Đơn thành công tự động trừ số lượng nguyên liệu trong kho theo định lượng (BOM).
   - Khách được tích điểm tương ứng với giá trị hóa đơn.
   - Bàn chuyển sang trạng thái trống để đón lượt khách tiếp theo.

---

## 4. Nghiệp Vụ Thực Đơn & Tùy Chọn Món (Menu & Modifiers)

Thực đơn trong F&B được phân biệt thành hai trường phái chính:

### A. Phân loại Đồ ăn (Food) vs Đồ uống (Drink)
- **Đồ uống (Drink):** Cà phê, trà trái cây, trà sữa, sinh tố, nước ngọt...
  - Bắt buộc hỗ trợ nhóm Modifier: **Size** (M / L), **Mức đường** (100% / 70% / 50% / 30% / 0%), **Mức đá** (100% / 70% / 50% / Không đá), và danh sách **Topping** có tính phụ thu (Trân châu trắng, thạch dừa, kem cheese...).
- **Đồ ăn (Food):** Cơm, mì, bánh ngọt, snack...
  - Không có mức đường/đá. Tùy chọn chủ yếu là gia vị đi kèm hoặc ghi chú đặc thù (Không hành, ít cay, ăn kèm sốt...).

### B. Cấu trúc Modifier Group & Tùy chọn
- Một món ăn có thể liên kết với nhiều `ModifierGroup`.
- Mỗi `ModifierGroup` chứa danh sách các `ModifierOption` kèm `extraPrice` (giá cộng thêm).
- Định danh giỏ hàng (`cartItemId`): Khi khách chọn cùng một món nhưng khác tùy chọn (ví dụ: *1 Trà Đào 50% đường ít đá* và *1 Trà Đào 100% đường nhiều đá*), hệ thống phải tách thành **hai dòng sản phẩm riêng biệt** để bếp không bị nhầm lẫn.

---

## 5. Nghiệp Vụ Quản Lý Kho & Định Lượng (BOM - Bill of Materials)

Quản lý kho là trái tim lợi nhuận của doanh nghiệp F&B:

### A. Định lượng nguyên liệu (BOM)
- Mỗi món trên menu được định nghĩa công thức cấu thành từ các nguyên liệu cơ bản.
  - *Ví dụ: 1 ly Cà Phê Sữa = 25g Hạt cà phê Robusta + 30ml Sữa đặc + 1 ly nhựa + 1 ống hút.*
- Khi đơn hàng được thu ngân xác nhận thanh toán hoặc chuyển sang trạng thái chế biến, hệ thống **tự động trừ kho** đúng tỷ lệ số lượng bán ra.

### B. Kiểm kê & Điều chỉnh kho (Stock Adjustment)
- Cho phép quản lý kiểm kê thực tế theo định kỳ, ghi nhận chênh lệch và cập nhật lý do: Hao hụt tự nhiên, nguyên liệu hỏng, kiểm kê định kỳ, nhập thêm kho.
- Mọi biến động số lượng đều lưu vết vào bảng `InventoryLog` để phục vụ thanh tra.

### C. Hoàn kho khi hủy món (Void / Reverse Inventory)
- Nếu món đã chế biến nhưng khách đổi trả do lỗi hoặc đơn bị hủy (Void), thu ngân/quản lý có thể chọn:
  - **Hủy và hoàn kho:** Nguyên liệu chưa pha chế/chưa khui, cộng lại số lượng vào kho.
  - **Hủy không hoàn kho:** Món đã chế biến hỏng, ghi nhận hao hụt.

---

## 6. Nghiệp Vụ Khách Hàng Thân Thiết (Loyalty & Vouchers)

### A. Tích điểm theo số điện thoại
- Khách hàng không cần đăng ký tài khoản rườm rà; chỉ cần đọc số điện thoại khi thanh toán hoặc tự nhập trên QR Menu.
- Tỷ lệ tích điểm tiêu chuẩn: Cứ mỗi `X` VNĐ chi tiêu ➔ tích lũy `Y` điểm.
- Điểm thưởng có thể dùng để khấu trừ trực tiếp vào hóa đơn lần tới (ví dụ: 1 điểm = 1.000 VNĐ).

### B. Phân hạng thành viên (Membership Tiers)
- Hệ thống hỗ trợ 4 phân hạng tự động theo ngưỡng điểm tích lũy:
  1. **Hạng Đồng (Bronze):** Khách mới, chiết khấu mặc định 0%.
  2. **Hạng Bạc (Silver):** Tích lũy đạt ngưỡng 1, giảm 5% trên tổng bill.
  3. **Hạng Vàng (Gold):** Tích lũy đạt ngưỡng 2, giảm 10% trên tổng bill.
  4. **Hạng Kim Cương (Diamond):** Khách VIP thân thiết, giảm 15% trên tổng bill + ưu đãi riêng.
- Màu sắc hiển thị thẻ hạng (`membershipTier.color`) hiển thị đồng bộ trên thẻ khách và giao diện QR Menu.

### C. Mã giảm giá (Vouchers)
- Quản lý tạo voucher theo hình thức: Giảm theo phần trăm (`PERCENT`) có giới hạn tối đa, hoặc giảm tiền trực tiếp (`FIXED`).
- Quy định điều kiện áp dụng: Giá trị đơn tối thiểu, số lượt sử dụng tối đa, ngày bắt đầu và ngày hết hạn.

---

## 7. Nghiệp Vụ Báo Cáo, Doanh Thu & Kết Ca (Z-Report)

### A. Báo cáo kết ca (Z-Report)
- Vào cuối mỗi ca làm việc hoặc cuối ngày, thu ngân/quản lý bắt buộc thực hiện **Chốt ca (Z-Report)**:
  - Tổng số tiền thực nhận đầu ca (Tiền mặt dự phòng).
  - Doanh thu tiền mặt thực tế phát sinh trong ca.
  - Doanh thu chuyển khoản (VietQR / Thẻ).
  - Tổng số tiền khuyến mãi / voucher đã áp dụng.
  - Số lượng đơn hoàn thành, số lượng món bị hủy (Voided items).
  - Số tiền mặt thực tế kiểm đếm trong két so với số liệu phần mềm tính toán.
- Xuất file báo cáo chuẩn định dạng PDF (in nhiệt) và file Excel (cho kế toán).

### B. Phân tích doanh thu & Xu hướng bán hàng
- Dashboard cung cấp các chỉ số trọng yếu:
  - Doanh thu trung bình trên mỗi hóa đơn (AOV - Average Order Value).
  - Tần suất doanh thu theo từng khung giờ (Hour-of-day heatmap) giúp xếp lịch nhân sự.
  - Top 5 / Top 10 món bán chạy nhất và món có biên lợi nhuận cao nhất.

---

## 8. Nghiệp Vụ Nhận Diện Thương Hiệu (Tenant Branding)

Mỗi nhà hàng trên nền tảng HiAI-MenuGo được cá nhân hóa bộ nhận diện:
- **Logo:** Hiển thị trên góc màn hình QR Menu, phiếu in bếp, hóa đơn thanh toán và giữa mã QR bàn ăn.
- **Bảng màu chủ đạo:**
  - `primaryColor`: Màu nhấn chính của các nút bấm CTA, tab active, badge tích điểm, viền highlight.
  - `secondaryColor`: Màu chuyển sắc (gradient) trên nút xác nhận thanh toán và banner khuyến mãi.
- **Banner & Background:** Ảnh nền không gian quán hoặc hình ảnh món đặc trưng làm nền menu trực tuyến.
