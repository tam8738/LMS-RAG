# Screen Mapping

## 1. Login

### Goal

Teacher/Admin đăng nhập nhanh.

### Structure

- Brand/logo
- Product statement ngắn
- 2–3 lợi ích: quản lý học liệu, AI processing, RAG có citation
- Login card:
  - Email
  - Password
  - Show/hide password
  - Login button
  - Error
  - Loading

### Do not add

- Sign up
- Forgot password
- Pricing
- Testimonials
- Fake statistics

---

## 2. Library

### Goal

Khám phá tài liệu `PUBLISHED`.

### Structure

1. Sticky header
2. Page title + mô tả ngắn
3. Search
4. Filters:
   - subject
   - topic
   - chapter
   - tags
   - uploaded_by nếu API hỗ trợ
5. Result count
6. Document list/grid
7. Pagination
8. Minimal footer

### Document item

- Title
- Description ngắn
- Subject/topic/chapter
- Tags
- Author
- Updated/published time
- File type
- Open detail
- Download nếu phù hợp

### States

- Loading skeleton
- Empty library
- No results
- Error
- Pagination loading

### Do not add

- Popular
- Trending
- Recommendations
- Views
- Likes

---

## 3. Library Document Detail

### Goal

Đọc thông tin, tải file và hỏi AI.

### Structure

- Breadcrumb/back
- Title
- Metadata
- Description
- File information
- Preview optional
- Download
- Ask AI / RAG panel
- Citations
- `not_found`

Không tạo related papers, citation graph hoặc recommendation.

---

## 4. My Documents

### Goal

Teacher quản lý tài liệu của mình.

### Structure

- Page title
- Upload button
- Search
- Filter processing status
- Filter publication status
- Table/list
- Pagination

### Each row/card

- Title
- File type
- Processing status
- Publication status
- Updated time
- Contextual actions

### Actions by state

- View
- Edit metadata khi DRAFT/REJECTED
- Replace/reprocess khi được phép
- Submit review khi PROCESSED + DRAFT/REJECTED
- Delete chỉ khi nghiệp vụ cho phép
- Không sửa trực tiếp khi PENDING_REVIEW/PUBLISHED

### States

- No documents
- Processing
- Failed + retry/re-upload
- Rejected + reason
- Pending review
- Published
- Archived

---

## 5. Upload Document

### Fields

- File
- Title required
- Description
- Subject
- Topic
- Chapter
- Tags

### Validation

- PDF/TXT only
- Max 20 MB
- Required title
- File error

### Flow

Có thể là single page hoặc 3 bước nhẹ:

1. Select file
2. Enter metadata
3. Upload/processing confirmation

Không dùng wizard quá dài.

### Post-upload

- Upload success
- AI processing state
- Back to My Documents
- Không giả vờ xử lý xong tức thì

---

## 6. My Document Detail

- Title + file info
- Metadata
- Processing status
- Publication status
- Status timeline đơn giản
- Error nếu FAILED
- Rejection reason nếu REJECTED
- Actions theo quyền
- Preview/download
- AI Chat khi hợp lệ

Không có analytics, views hoặc popularity.

---

## 7. Admin Review Queue

- Page title
- Queue count
- Search nếu API hỗ trợ
- Review table/list
- Teacher
- Submitted time
- Subject/topic
- Open review
- Pagination

Không tạo KPI dashboard phức tạp.

---

## 8. Admin Review Detail

- Document information
- Uploader
- Metadata
- File preview/download
- Processing status
- Approve
- Reject
- Reject reason bắt buộc
- Archive chỉ khi PUBLISHED
- Confirmation + toast

---

## 9. Scoped AI Chat

Chỉ tạo nếu dùng route độc lập.

- Document scope selector
- Selected document chips
- Conversation
- Citations
- Question input
- New conversation
- `not_found`

Không có global chat toàn thư viện.

---

## 10. Profile / Account

- Name
- Email
- Role
- Change password nếu scope cho phép
- Logout

Không biến thành social profile.
