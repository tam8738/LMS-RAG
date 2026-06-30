# ✅ Typography System - Migration Checklist

## 📊 Trạng Thái Cập Nhật

### Updated Components (Đã cập nhật)

- [x] **TeacherDashboard.jsx** - ✅ Hoàn tất
  - Header (h1 + subtitle)
  - Stats cards (value + label)
  - Table headers (label class)
  - Table rows (body-md, body-xs)
  - Quick actions section
  - AI tip section

- [x] **StudentDashboard.jsx** - ✅ Hoàn tất
  - Header (h1 + subtitle)
  - Stats cards (stat-value, stat-label)
  - Section header (h3 → text-h4)

- [x] **StudentCoursesPage.jsx** - ✅ Hoàn tát
  - Header (h1 + subtitle)

- [x] **StudentCourseDetailPage.jsx** - ✅ Hoàn tất
  - Back button (body-md)
  - Course header (h1 + course code)
  - Description (body-lg)
  - Progress indicator (body-xs)

### Components Cần Cập Nhật (TODO)

- [ ] **CoursesPage.jsx** (teacher)
  - [ ] Header
  - [ ] Section titles
  - [ ] Table headers & cells
  - [ ] Quick actions

- [ ] **CourseDetailPage.jsx** (teacher)
  - [ ] Page header
  - [ ] Section headers
  - [ ] Breadcrumb text
  - [ ] Form labels

- [ ] **LectureDetailPage.jsx** (teacher)
  - [ ] Page title
  - [ ] Lecture name
  - [ ] Description

- [ ] **LectureViewPage.jsx** (student)
  - [ ] Lecture title
  - [ ] Navigation text
  - [ ] Content descriptions

- [ ] **LoginPage.jsx**
  - [ ] Form labels
  - [ ] Button text
  - [ ] Error messages

- [ ] **AppLayout.jsx**
  - [ ] Navigation text
  - [ ] Breadcrumb styling

### UI Components (shadcn/ui)

- [ ] **button.jsx** - Review default text sizes
- [ ] **card.jsx** - Check heading styling
- [ ] **table.jsx** - Verify table typography
- [ ] **form.jsx** - Form label styling
- [ ] **alert.jsx** - Alert text sizing
- [ ] **badge.jsx** - Badge text sizing
- [ ] **breadcrumb.jsx** - Breadcrumb styling

---

## 🎯 Chiến Lược Cập Nhật

### Phase 1: Main Pages (Hoàn tất ✅)
- [x] TeacherDashboard
- [x] StudentDashboard
- [x] StudentCoursesPage
- [x] StudentCourseDetailPage

### Phase 2: Detail Pages (TODO)
- [ ] CoursesPage (teacher)
- [ ] CourseDetailPage (teacher)
- [ ] LectureDetailPage (teacher)
- [ ] LectureViewPage (student)

### Phase 3: Auth & Layout (TODO)
- [ ] LoginPage
- [ ] AppLayout
- [ ] Navigation components

### Phase 4: UI Components (TODO)
- [ ] Review & optimize shadcn components
- [ ] Ensure consistency across all UI elements

---

## 📝 Hướng Dẫn Cập Nhật Từng Component

### Bước 1: Tìm các inline styles
```bash
grep -n "fontSize\|fontWeight" src/components/path/Component.jsx
```

### Bước 2: Xác định loại text
- **Heading** (h1, h2, h3, h4) → Sử dụng `text-h{n}` hoặc `text-h4`
- **Body text** → `body-text`, `body-md`, `body-sm`, `body-xs`
- **Special** (label, caption, stat) → Dùng class đặc biệt

### Bước 3: Thay thế inline styles
```javascript
// ❌ Cũ
style={{ fontSize: '0.875rem', fontWeight: 500 }}

// ✅ Mới
className="body-md"
```

### Bước 4: Cập nhật màu sắc nếu cần
```javascript
// ❌ Cũ
className="text-slate-500"

// ✅ Mới (phụ thuộc ngữ cảnh)
className="text-text-secondary"  // body text
className="text-text-tertiary"   // labels, captions
```

### Bước 5: Kiểm tra kết quả
- [ ] Font size hiển thị đúng
- [ ] Weight (đậm/nhạt) chính xác
- [ ] Màu sắc phù hợp ngữ cảnh
- [ ] Khoảng cách margins tự động

---

## 🔍 Quick Reference - Sizes

| Sử dụng | Class | Size | Weight |
|--------|-------|------|--------|
| Page title | `h1` | 2rem | 700 |
| Section title | `h2`/`text-h4` | 1.5rem/1rem | 600 |
| Body text | `body-text` | 0.9375rem | 400 |
| Small text | `body-sm` | 0.8125rem | 500 |
| Labels | `label` | 0.75rem | 600 |
| Stats value | `stat-value` | 1.875rem | 700 |
| Stats label | `stat-label` | 0.8125rem | 500 |

---

## ✅ Kiểm Tra Hoàn Tất

Trước khi commit:

- [ ] Tất cả text sizes nhất quán
- [ ] Màu sắc theo hệ thống (primary, secondary, tertiary, muted)
- [ ] Không có inline `fontSize` styles
- [ ] Không có rogue `font-weight` inline styles
- [ ] Margins/padding tự động được áp dụng
- [ ] Responsive trên mobile
- [ ] Hover states vẫn hoạt động

---

## 📌 Ghi Chú

- Typography system được load từ `src/style/index.css`
- Tailwind config extensions được định nghĩa trong `tailwind.config.js`
- Tất cả CSS classes được định nghĩa trong `src/style/typography.css`
- Mã màu được định nghĩa trong `src/style/theme.css`

---

**Cập nhật lần cuối: 2026-06-12**
**Trạng thái: Phase 1 hoàn tất, Phase 2-4 chờ thực hiện**
