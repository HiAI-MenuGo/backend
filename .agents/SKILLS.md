# HiAI-MenuGo — Design System, UI/UX Standards & Mastery Guide

> Cẩm nang quy chuẩn toàn diện về kiến trúc giao diện, hệ thống Design Tokens, trải nghiệm người dùng (UI/UX) và các pattern hiển thị đặc thù cho cả **Mobile App** và **Web Frontend** của **HiAI-MenuGo**.
>
> - 📖 Nghiệp vụ: [BUSINESS.md](./BUSINESS.md) · 🏗️ Stack: [TECHS.md](./TECHS.md)
> - ⛔ Luật cấm: [RULES.md](./RULES.md) · 🧭 Index: [AGENTS.md](./AGENTS.md)

---

## 1. Bản Đồ Màu Sắc & Tâm Lý Học Bề Mặt Nền (Color & Mood Engineering)

Màu sắc trong F&B không chỉ để trang trí mà là công cụ trực tiếp kích thích cảm giác ngon miệng và điều hướng tâm lý khách hàng:

### A. Quy luật bề mặt nền (Background Surface Dynamics)
- **Web Admin, POS, KDS (Dark Mode mặc định `bg-zinc-950`):**
  - Giảm mỏi mắt tối đa cho nhân viên thu ngân và đầu bếp khi làm việc liên tục 8-12 tiếng.
  - Tăng độ tương phản cho các nhãn trạng thái (Pending màu Vàng cam, Preparing màu Xanh dương, Ready màu Xanh lá).
- **Mobile App & QR Menu Khách Hàng (Light & Elegant):**
  - Nền bề mặt tiêu chuẩn: `#F8FAFC` (Slate subtle) hoặc `#FFFFFF`.
  - Nền mộc cao cấp: Trắng kem `#F7F6F2` dành cho không gian cafe thư giãn.
  - Tuyệt đối không dùng màu thô nguyên bản (Raw RGB/Pure Hex) gây chói mắt.

### B. Bản đồ sắc thái màu chủ đạo F&B
| Sắc thái | Mã Hex chuẩn | Cảm xúc & Ngữ cảnh áp dụng |
|---|---|---|
| **Xanh Tươi Rực** | `#22C55E` / `#10B981` | Kích thích vị giác, tươi mới, ngon miệng, biểu tượng món ăn phục vụ tốt |
| **Xanh Lục Bảo Sâu** | `#059669` / `#047857` | Nút hành động chính (Primary CTA), đặt món, thanh toán thành công |
| **Cam Hổ Phách** | `#F59E0B` / `#D97706` | Cảnh báo bàn chờ thanh toán, đơn bếp đang chờ (Pending), món tạm hết |
| **Đỏ San Hô** | `#EF4444` / `#DC2626` | Nút hủy món, cảnh báo kho cạn kiệt, badge số lượng giỏ hàng |
| **Tím Indigo** | `#6366F1` / `#7C3AED` | Điểm nhấn phân hệ quản trị Admin Dashboard, mã giảm giá Voucher |

### C. Màu sắc nhận diện thương hiệu động (Dynamic Branding)
- Hệ thống hỗ trợ nạp màu theo từng quán từ API `/api/branding`.
- Không hardcode màu cố định trong QR Menu và Modal chọn món; luôn đọc từ `primaryColor` và `secondaryColor`:
  ```tsx
  // Dynamic inline styling
  style={{
    borderColor: primaryColor,
    color: primaryColor,
    backgroundColor: `color-mix(in srgb, ${primaryColor} 6%, #ffffff)`
  }}
  ```

---

## 2. Nhịp Điệu Chữ & Nghệ Thuật Ghép Đôi Font (Typography Hierarchy)

Bộ font được cấu hình trong `app/layout.tsx` và ứng dụng di động:
- **Font không chân hiện đại (`Be Vietnam Pro`, `Geist Mono`, `System Sans`):**
  - Dùng cho: Toàn bộ thông số giá tiền, nhãn nút bấm, bảng định lượng kho, mã đơn, số lượng món.
  - Tác dụng: Quét mắt cực nhanh (Scannability) ở kích thước nhỏ (11px - 14px) trên màn hình cảm ứng di động.
- **Font có chân cổ điển (`Playfair Display`, `Serif`):**
  - Dùng cho: Tên thương hiệu nhà hàng, lời chào trên trang chủ (*"Thực Đơn Tinh Hoa"*), danh mục món cao cấp.
  - Tác dụng: Tôn vinh đẳng cấp không gian ẩm thực.

### 3 Cặp tương phản kinh điển trên giao diện thực đơn:
1. **Tên món to đậm + Mô tả nguyên liệu mảnh nhẹ:** `Trà Đào Cam Sả` (Font-bold 15px) đi kèm *Đào miếng ngâm giòn, sả tươi và cam vàng* (Font-normal 12px, xám nhạt).
2. **Giá tiền nổi bật + Đơn vị tính:** `45.000` (Extrabold 16px, `primaryDark`) đi kèm `đ` (Regular 11px).
3. **Món chính + Tùy chọn đi kèm:** Tên món màu chữ đậm, dòng tùy chọn size/đá/đường thụt đầu dòng màu cam/xanh dịu mắt.

---

## 3. Ngôn Ngữ Hình Học 4 Cấp Độ & Hiệu Ứng Chiều Sâu (Geometry & Depth)

| Cấp độ | Bo góc `borderRadius` | Đối tượng áp dụng | Mục đích tâm lý |
|---|---|---|---|
| **Pill (Viên thuốc)** | `999px` | Nút CTA ("Gọi món", "Xem giỏ"), thanh tìm kiếm, bộ đếm số lượng `- 1 +`, tag danh mục | Mềm mại, mời gọi đầu ngón tay chạm vào |
| **Large Sheet Top** | `28px - 36px` | Mép trên của Bottom Sheet, Modal chọn Size/Topping | Tạo ranh giới êm ái khi vuốt từ dưới màn hình lên |
| **Container Card** | `16px - 20px` | Card món ăn, Card bàn ăn, Khối thông tin doanh thu | Ôm trọn nội dung ngăn nắp, tách bạch rõ ràng |
| **Action Tile / Square** | `10px - 14px` | Nút lọc, nút `+` thêm nhanh, ô chọn ảnh, nút in phiếu | Dứt khoát, cảm giác công cụ chuyên nghiệp |

### Kỹ thuật 3D Overlapping Hero:
Cho ảnh đĩa thức ăn/ly nước nổi một nửa đè lên trên khối Header và một nửa nằm trong thân Card. Kỹ thuật này tạo cảm giác đĩa thức ăn tràn ra khỏi màn hình đầy sống động mà không tốn tài nguyên render 3D nặng nề.

---

## 4. Công Thái Học Vùng Ngón Tay Cái (Thumb Zone Affordance)

Mọi thao tác cốt lõi trên thiết bị di động phải nằm trong **nửa dưới màn hình (Natural Thumb Zone)**:
- Nút CTA mua hàng & Nút Xác nhận đơn luôn cố định ở Bottom Bar hoặc Floating Dock.
- **Thanh Dock điều hướng nổi (Floating BottomNav):**
  - Luôn cách mép đáy màn hình một khoảng Safe Area (`useSafeAreaInsets().bottom`).
  - Bo tròn pill mềm mại (`height: 60, borderRadius: 30`), có bóng đổ float mềm.
  - Tự động ẩn khi người dùng chuyển sang các màn hình thao tác con (Sub-views) để giải phóng diện tích làm việc.

---

## 5. Chu Trình 5 Chặng Trải Nghiệm Trên Mobile & QR Menu

```
[Chặng 1: Quét QR & Nhận bàn] ➔ [Chặng 2: Khám phá Thực đơn] ➔ [Chặng 3: Tùy biến món]
                                                                        │
                                                                        ▼
[Chặng 5: Theo dõi đơn & Thanh toán] ◄── [Chặng 4: Giỏ hàng & Gửi đơn]
```

1. **Khởi đầu & Định danh:** Quét QR tự động nhận diện chi nhánh và số bàn trong 0.5 giây. Không bắt đăng nhập tài khoản.
2. **Khám phá thực đơn:** Danh mục món cuộn ngang dạng Tabs/Pills. Thanh tìm kiếm nhanh. Lưới 2 cột trực quan.
3. **Tùy biến món (Modal/BottomSheet):**
   - Đồ uống: Hiện rõ ràng các nút radio bấm chọn Đường (100/70/50/0%), Đá, Size và Checkbox Topping kèm giá cộng thêm.
   - Đồ ăn: Chỉ hiển thị ô nhập ghi chú món để tránh làm rối mắt khách.
4. **Giỏ hàng & Xác nhận đơn:** Bottom Capsule hiển thị số lượng món và tổng tiền tạm tính. Bấm vào bung Modal xác nhận tóm tắt.
5. **Theo dõi & Thanh toán:** Hiển thị thẻ món đã gửi với trạng thái trực tiếp từ bếp. Nút gọi thanh toán VietQR động.

---

## 6. Các Pattern UI/UX Bắt Buộc Đã Thiết Lập (Critical UI Rules)

> Chi tiết luật cấm tương ứng xem [RULES.md](./RULES.md#5-critical-ui-rules-đã-thiết-lập-không-được-phá). Dưới đây là code mẫu chuẩn để copy-paste.

### A. Ghi Chú Tùy Chọn Món — Định Dạng Multi-Line Bắt Buộc
> **Áp dụng cho:** `CashierClient.tsx`, `kds/page.tsx`, `KitchenTicketTemplate.tsx`, `ReceiptPrintTemplate.tsx`, `mobile/src/screens/operations/OrdersScreen.tsx`.

Chuỗi `item.note` từ backend là tổ hợp các tùy chọn nối nhau bằng dấu `•` hoặc `|`. **TUYỆT ĐỐI KHÔNG** hiển thị nguyên chuỗi dài liền mạch. Bắt buộc tách thành từng dòng riêng có bullet:

```tsx
// Hiển thị trên màn hình POS Cashier & KDS Bếp (màu cam/vàng dễ đọc):
{item.note
  .replace(/^📝?\s*Ghi chú:\s*/i, '')
  .split(/•|;|\||\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .map((line, idx) => (
    <div key={idx} className="flex items-start gap-1 leading-tight text-xs text-amber-300">
      <span className="text-orange-400/70 font-bold select-none">•</span>
      <span>{line}</span>
    </div>
  ))}

// Định dạng in bill nhiệt (KitchenTicketTemplate / ReceiptPrintTemplate) - Chữ đen nhỏ:
{item.note
  .replace(/^📝?\s*Ghi chú:\s*/i, '')
  .split(/•|;|\||\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .map((line, nIdx) => (
    <div key={nIdx} className="leading-tight text-xs text-black">- {line}</div>
  ))}
```

### B. Nút HỦY MÓN trong POS Cashier — Luôn Canh Phải
- Nút hủy món trong danh sách order của thu ngân bắt buộc canh lề phải (`justify-end`), đặt màu đỏ hồng tinh tế (`text-rose-400 border border-rose-500/20`), tránh để bên trái gây bấm nhầm khi đang thao tác nhanh.

### C. Nút Thanh Toán QR Menu — Chống Giật/Chớp Giao Diện
- Nút Thanh toán không được xuất hiện rồi biến mất đột ngột khi dữ liệu `PENDING` từ Socket.IO đang đồng bộ.
- Bắt buộc bổ sung `!isInitializing` vào điều kiện render:
  ```tsx
  {cartTab === 'history' && !isInitializing && lastOrder && lastOrder.length > 0 && (
    <div>
      {!lastOrder.some(item => item.status === 'PENDING') && lastOrder.some(item => item.status !== 'VOID') && (
        <button className="...">Yêu Cầu Thanh Toán</button>
      )}
    </div>
  )}
  ```

### D. Form Tích Điểm QR Menu — Đồng Bộ Màu Nhận Diện Thương Hiệu
- Khung container SĐT tích điểm và nút Xác nhận phải dùng `primaryColor` và `secondaryColor` của quán.
- Thẻ phân hạng thành viên (Vàng, Bạc, Đồng) giữ nguyên mã màu riêng theo `customerData.membershipTier.color`.
- Badge hạng và badge điểm đặt cùng 1 hàng ngang (side-by-side flex), không rớt dòng.

### E. Quy Chuẩn Bản In Nhiệt (Print Templates)
- **Phiếu chế biến bếp (`KitchenTicketTemplate.tsx`):** Chữ đen rõ nét trên nền trắng, in đậm số bàn và giờ vào đơn, note ghi chú gạch đầu dòng `- xxx`, không dùng icon màu hay viền lòe loẹt làm hỏng đầu kim máy in nhiệt khổ 80mm/58mm.
- **Hóa đơn thanh toán (`ReceiptPrintTemplate.tsx`):** Chữ đen sắc nét, đầy đủ thông tin tên nhà hàng, địa chỉ, số bill, bảng chi tiết món, thuế, giảm giá voucher, điểm loyalty và mã QR chuyển khoản VietQR ở chân bill.

---

## 7. Thư Viện Component React Native Chuẩn Mẫu

### 1. Stepper Pill Số Lượng (`- 1 +`)
```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';

interface StepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  primaryColor?: string;
}

export const QuantityStepper: React.FC<StepperProps> = ({
  quantity,
  onIncrement,
  onDecrement,
  primaryColor = '#10B981',
}) => {
  return (
    <View style={[styles.stepperContainer, { backgroundColor: primaryColor }]}>
      <TouchableOpacity onPress={onDecrement} style={styles.stepperBtn} activeOpacity={0.7}>
        <Minus size={14} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
      <Text style={styles.quantityText}>{quantity}</Text>
      <TouchableOpacity onPress={onIncrement} style={styles.stepperBtn} activeOpacity={0.7}>
        <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  stepperBtn: {
    padding: 3,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 16,
    textAlign: 'center',
  },
});
```

### 2. Thẻ Đơn Hàng Live (Kanban Card Component)
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

interface LiveOrderCardProps {
  tableNumber: string;
  orderCode: string;
  timeAgo: string;
  itemsCount: number;
  status: 'PENDING' | 'PREPARING' | 'READY';
}

const statusConfig = {
  PENDING: { label: 'Chờ duyệt', bg: '#FEF3C7', text: '#D97706' },
  PREPARING: { label: 'Đang nấu', bg: '#EFF6FF', text: '#2563EB' },
  READY: { label: 'Sẵn sàng', bg: '#ECFDF5', text: '#059669' },
};

export const LiveOrderCard: React.FC<LiveOrderCardProps> = ({
  tableNumber,
  orderCode,
  timeAgo,
  itemsCount,
  status,
}) => {
  const conf = statusConfig[status];
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.tableText}>{tableNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
          <Text style={[styles.statusText, { color: conf.text }]}>{conf.label}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.codeText}>#{orderCode}</Text>
        <View style={styles.timeBox}>
          <Clock size={12} color="#94A3B8" />
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
```

---

## 8. Mobile Theme Tokens Chuẩn (`mobile/src/theme/index.ts`)

Mọi màu/bo góc/bóng đổ lấy từ tokens dưới đây — cấm hardcode hex rời rạc trong component con:

```ts
export const theme = {
  colors: {
    primary: '#10B981', primaryDark: '#059669', primaryLight: '#D1FAE5', primaryTint: '#ECFDF5',
    accent: '#0284C7', accentLight: '#E0F2FE',
    success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6',
    background: '#F8FAFC', surface: '#FFFFFF', surfaceSubtle: '#F1F5F9',
    border: '#E2E8F0', borderSubtle: '#F1F5F9',
    textMain: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8', textInverse: '#FFFFFF',
  },
  radii: { pill: 999, xl: 24, lg: 18, md: 14, sm: 10 },
  shadows: {
    card:  { shadowColor:'#0F172A', shadowOffset:{w:0,h:4}, shadowOpacity:0.05, shadowRadius:10, elevation:2 },
    float: { shadowColor:'#059669', shadowOffset:{w:0,h:8}, shadowOpacity:0.25, shadowRadius:14, elevation:6 },
    dock:  { shadowColor:'#0F172A', shadowOffset:{w:0,h:-4}, shadowOpacity:0.08, shadowRadius:16, elevation:8 },
  }
}
```

Quy ước: background mặc định `background` (`#F8FAFC`), card `surface` trắng, border `#E2E8F0`. Shadow luôn kèm cả iOS (`shadow*`) + Android (`elevation`). Card chuẩn: `backgroundColor:'#FFFFFF', borderRadius:18~20, borderWidth:1, borderColor:'#E2E8F0', ...theme.shadows.card`. Pill/CTA: `borderRadius:999`.
