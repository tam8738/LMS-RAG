# 📝 Typography System - Hướng Dẫn Sử Dụng

## 🎯 Tổng Quan

Hệ thống typography đã được tối ưu hóa để đảm bảo:
- ✅ Kích cỡ chữ nhất quán trên toàn ứng dụng
- ✅ Màu sắc phân cấp rõ ràng
- ✅ Khoảng cách đều đặn
- ✅ Dễ bảo trì và mở rộng

---

## 📏 Cấu Trúc Kích Cỡ Chữ

### Headings (Tiêu đề)

| Class      | Font Size | Weight | Margin | Sử dụng                          |
|----------|-----------|--------|--------|----------------------------------|
| `h1`     | 2rem (32px) | 700   | 1.5rem 0 1rem 0 | Tiêu đề trang chính           |
| `h2`     | 1.5rem (24px) | 600 | 1.25rem 0 0.75rem 0 | Tiêu đề phần lớn             |
| `h3`     | 1.125rem (18px) | 600 | 1rem 0 0.625rem 0 | Tiêu đề phần nhỏ             |
| `h4`/`.text-h4` | 1rem (16px) | 600 | 0.75rem 0 0.5rem 0 | Tiêu đề subsection          |

### Body Text (Văn bản nội dung)

| Class      | Font Size | Weight | Line Height | Sử dụng                          |
|----------|-----------|--------|-------------|----------------------------------|
| `.body-text` / `body-lg` | 0.9375rem (15px) | 400 | 1.6 | Văn bản chính (mặc định) |
| `.body-md`  | 0.875rem (14px) | 400 | 1.6 | Văn bản trung bình              |
| `.body-sm`  | 0.8125rem (13px) | 500 | 1.5 | Văn bản nhỏ, nhãn           |
| `.body-xs`  | 0.75rem (12px) | 600 | 1.5 | Văn bản rất nhỏ, chú thích      |

### Special Classes (Lớp đặc biệt)

| Class           | Sử dụng                                  | Ví dụ              |
|-----------------|------------------------------------------|-------------------|
| `.subtitle`     | Mô tả dưới tiêu đề chính                | "Chào mừng trở lại bạn..." |
| `.description`  | Mô tả chi tiết (văn bản mịn hơn)       | Mô tả khóa học    |
| `.label`        | Nhãn, tiêu đề cột bảng (uppercase)     | "TÊN KHÓA HỌC"   |
| `.caption`      | Chú thích nhỏ                           | "Cập nhật 2 giờ trước" |
| `.stat-value`   | Giá trị thống kê lớn                   | "12" (số khóa học) |
| `.stat-label`   | Nhãn thống kê                          | "Khóa học"       |
| `.section-header` | Tiêu đề phần                          | "Hoạt động gần đây" |
| `.section-subheader` | Tiêu đề phụ của phần                 | Mô tả phần      |

---

## 🎨 Hệ Thống Màu Sắc

### Text Colors

```css
.text-text-primary      /* #1E293B - Chữ chính (đậm) */
.text-text-secondary    /* #475569 - Chữ phụ (xám) */
.text-text-tertiary     /* #94A3B8 - Chữ nhạt (nhạt xám) */
.text-text-muted        /* #CBD5E1 - Chữ mờ (rất nhạt) */
```

### Utility Classes

```css
.text-muted      /* Áp dụng màu tertiary */
.text-subtle     /* Áp dụng màu muted */
```

---

## 📐 Hệ Thống Khoảng Cách

### Gap (Khoảng giữa các phần tử)

```css
.gap-section    /* 2rem (32px) - Giữa các phần lớn */
.gap-block      /* 1rem (16px) - Giữa các khối */
.gap-element    /* 0.5rem (8px) - Giữa các phần tử nhỏ */
```

### Margin

```css
/* Margin Bottom */
.mb-section     /* margin-bottom: 2rem */
.mb-block       /* margin-bottom: 1rem */
.mb-element     /* margin-bottom: 0.5rem */

/* Margin Top */
.mt-section     /* margin-top: 2rem */
.mt-block       /* margin-top: 1rem */
.mt-element     /* margin-top: 0.5rem */
```

---

## 💻 Ví Dụ Sử Dụng

### 1️⃣ Header với Title và Mô Tả

```jsx
<div>
  <h1>Tổng quan</h1>
  <p className="body-text mt-1">
    Chào mừng bạn trở lại, Nguyễn Văn Khoa 👋
  </p>
</div>
```

**CSS tự động áp dụng:**
- h1: font-size 2rem, weight 700, margin tự động
- p: font-size 0.9375rem, weight 400, color: #475569

---

### 2️⃣ Thẻ Thống Kê (Stat Card)

```jsx
<div className="bg-white rounded-2xl p-5">
  <div className="stat-value">12</div>
  <div className="stat-label">Khóa học</div>
  <div className="caption text-emerald-600">+2 so với tháng trước ↑</div>
</div>
```

**Kết quả:**
- Số 12: 1.875rem, weight 700
- "Khóa học": 0.8125rem, weight 500, gray
- "Chi tiết": 0.75rem, xám nhạt

---

### 3️⃣ Bảng với Tiêu Đề Cột

```jsx
<table className="w-full">
  <thead>
    <tr>
      {['Tên khóa học', 'Bài giảng', 'Trạng thái'].map((h) => (
        <th key={h} className="label">
          {h}
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="body-md font-semibold-custom">React Basics</td>
      <td className="body-md">15</td>
    </tr>
  </tbody>
</table>
```

**Kết quả:**
- Tiêu đề: 0.75rem, 600 weight, UPPERCASE, 0.06em spacing
- Nội dung: 0.875rem, 400 weight

---

### 4️⃣ Hộp Hoạt Động Gần Đây

```jsx
<div className="bg-white rounded-2xl">
  <div className="px-6 py-4">
    <h3 className="text-h4">Hoạt động gần đây</h3>
  </div>
  <div className="p-4">
    <div className="body-text">Bạn đã hoàn thành bài kiểm tra...</div>
    <div className="caption">2 giờ trước</div>
  </div>
</div>
```

---

### 5️⃣ Tiêu Đề Khóa Học (Hero Section)

```jsx
<div style={{ background: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)' }}>
  <div className="text-white/70 body-xs">REACT101</div>
  <h1 className="text-white">Lập trình Web với React</h1>
  <p className="text-white/80 body-lg">
    Khóa học giúp bạn xây dựng ứng dụng web hiện đại...
  </p>
</div>
```

---

## 🔄 Font Weight Utilities

```css
.font-semibold-custom   /* font-weight: 600 */
.font-bold-custom       /* font-weight: 700 */
```

---

## ✨ Khuyến Nghị Best Practices

### ✅ NÊN LÀM

```jsx
// ✅ Đúng: Sử dụng CSS classes
<h1>Tiêu đề</h1>
<p className="body-text">Văn bản nội dung</p>
<div className="body-sm">Văn bản nhỏ</div>

// ✅ Đúng: Kết hợp với Tailwind
<h3 className="text-h4">Tiêu đề phần</h3>
<div className="body-md font-semibold-custom">Nhấn mạnh</div>
```

### ❌ KHÔNG NÊN LÀM

```jsx
// ❌ Sai: Inline styles cho typography
<h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tiêu đề</h1>

// ❌ Sai: Class Tailwind tùy ý
<p className="text-sm text-gray-500">Văn bản</p>

// ❌ Sai: Nhiều style objects cho cùng một yếu tố
<div className="text-slate-900" style={{ 
  fontSize: '0.875rem', 
  fontWeight: 500,
  margin: '1rem 0'
}}>
  Nội dung
</div>
```

---

## 🎓 Kiến Trúc CSS

### File cấu trúc:

```
src/style/
├── typography.css        ← Tất cả typography classes
├── globals.css           ← Global resets
├── theme.css            ← CSS variables & theme
└── index.css            ← Import tất cả

tailwind.config.js        ← Tailwind extensions
```

### Tailwind Config Extensions

```javascript
// tailwind.config.js
fontSize: {
  'h1': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
  'h2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
  'body-lg': ['0.9375rem', { fontWeight: '400' }],
  // ...
}
```

---

## 📋 Responsive Adjustments

Trên mobile (< 768px):
- h1 → h2 size
- h2 → h3 size
- h3 → h4 size
- Margins giảm ~30%

```css
@media (max-width: 768px) {
  h1 { @apply text-h2; margin: 1rem 0 0.75rem 0; }
  h2 { @apply text-h3; margin: 0.75rem 0 0.5rem 0; }
}
```

---

## 🚀 Cập Nhật Components

Khi cập nhật component cũ:

1. **Tìm các inline `style={{}}` cho typography**
   ```javascript
   // ❌ Cũ
   style={{ fontSize: '0.875rem', fontWeight: 500 }}
   
   // ✅ Mới
   className="body-md"
   ```

2. **Thay thế className màu text**
   ```javascript
   // ❌ Cũ
   className="text-slate-500"
   
   // ✅ Mới (tùy ngữ cảnh)
   className="text-text-secondary"   /* cho body text */
   className="text-text-tertiary"    /* cho labels */
   ```

3. **Kiểm tra margins**
   ```javascript
   // ✅ Mới: Để CSS tự động áp dụng
   <h1>Tiêu đề</h1>  /* margin tự động */
   ```

---

## 📞 Hỗ Trợ & Câu Hỏi

Nếu cần thêm class hoặc điều chỉnh, hãy:

1. Thêm vào `src/style/typography.css`
2. Cập nhật tài liệu này
3. Cập nhật `tailwind.config.js` nếu cần

---

**Tài liệu này được cập nhật lần cuối: 2026-06-12**
