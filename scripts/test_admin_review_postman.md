# Test Admin Review API bằng Postman

## Chuẩn bị

1. Start Docker services:

```bash
docker compose up -d
```

2. Mở Postman và tạo một Collection mới, ví dụ `LMS-RAG Admin Review`.

3. Tạo collection variables:

| Variable | Initial Value | Mô tả |
|---|---|---|
| `base_url` | `http://localhost:8080` | Backend URL |
| `admin_token` | (để trống) | Token của Admin |
| `teacher_token` | (để trống) | Token của Teacher |
| `document_id` | (để trống) | ID document dùng để test |

## Flow test

### Step 1: Admin login

**Request:**

```txt
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
```

**Body:**

```json
{
  "email": "admin@example.com",
  "password": "123456"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin",
      "role": "ADMIN"
    }
  },
  "message": "Đăng nhập thành công"
}
```

**Action:** Copy `access_token` và paste vào collection variable `admin_token`.

---

### Step 2: Teacher login

**Request:**

```txt
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
```

**Body:**

```json
{
  "email": "teacher.a@example.com",
  "password": "123456"
}
```

**Expected Response:** `role=TEACHER`.

**Action:** Copy `access_token` và paste vào collection variable `teacher_token`.

---

### Step 3: Teacher upload document

**Request:**

```txt
POST {{base_url}}/api/v1/documents
Content-Type: multipart/form-data
Authorization: Bearer {{teacher_token}}
```

**Body (form-data):**

| Key | Type | Value |
|---|---|---|
| `file` | File | Chọn một file PDF hoặc TXT |
| `metadata` | Text | `{"title":"Bài giảng test duyệt","subject":"Test Subject","topic":"Test Topic","chapter":"Chương 1","tags":["test","demo"]}` |

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Bài giảng test duyệt",
    "processing_status": "UPLOADED",
    "publication_status": "DRAFT",
    ...
  },
  "message": "Upload tài liệu thành công"
}
```

**Action:** Copy `id` và paste vào collection variable `document_id`.

---

### Step 4: Chờ AI analyze xong

Sau upload, BE tự gọi AI analyze. Chờ 5-15 giây rồi kiểm tra status:

**Request:**

```txt
GET {{base_url}}/api/v1/my/documents/{{document_id}}
Authorization: Bearer {{teacher_token}}
```

**Expected khi xong:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "processing_status": "ANALYZED",
    "publication_status": "DRAFT",
    "rag_eligible": true,
    ...
  }
}
```

Nếu `processing_status` chưa `ANALYZED`, đợi thêm và gọi lại.

---

### Step 5: Teacher submit review

**Request:**

```txt
POST {{base_url}}/api/v1/my/documents/{{document_id}}/submit-review
Authorization: Bearer {{teacher_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "processing_status": "ANALYZED",
    "publication_status": "PENDING_REVIEW",
    ...
  },
  "message": "Gửi duyệt thành công"
}
```

---

### Step 6: Admin lấy danh sách chờ duyệt

**Request:**

```txt
GET {{base_url}}/api/v1/admin/reviews
Authorization: Bearer {{admin_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "Bài giảng test duyệt",
      "publication_status": "PENDING_REVIEW",
      "uploaded_by": 2,
      "uploader_name": "Teacher A",
      ...
    }
  ],
  "message": "Lấy danh sách thành công"
}
```

---

### Step 7: Admin lấy chi tiết review

**Request:**

```txt
GET {{base_url}}/api/v1/admin/reviews/{{document_id}}
Authorization: Bearer {{admin_token}}
```

**Expected Response:** Document detail với `publication_status=PENDING_REVIEW`.

---

### Step 8: Admin approve document

**Request:**

```txt
POST {{base_url}}/api/v1/admin/reviews/{{document_id}}/approve
Authorization: Bearer {{admin_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "processing_status": "ANALYZED",
    "publication_status": "PUBLISHED",
    "reviewed_by": 1,
    "reviewer_name": "Admin",
    "reviewed_at": "2026-07-12T...",
    "published_at": "2026-07-12T...",
    ...
  },
  "message": "Duyệt tài liệu thành công"
}
```

---

### Step 9: Verify document xuất hiện trong Library

**Request:**

```txt
GET {{base_url}}/api/v1/library
Authorization: Bearer {{teacher_token}}
```

**Expected Response:** Document vừa approve xuất hiện trong list, `publication_status=PUBLISHED`.

---

## Test case reject

Muốn test reject, lặp lại Step 3-5 để tạo một document `PENDING_REVIEW` mới, sau đó:

**Request:**

```txt
POST {{base_url}}/api/v1/admin/reviews/{{document_id}}/reject
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "reason": "Nội dung chưa phù hợp, cần bổ sung tài liệu tham khảo"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "publication_status": "REJECTED",
    "rejection_reason": "Nội dung chưa phù hợp, cần bổ sung tài liệu tham khảo",
    ...
  },
  "message": "Từ chối tài liệu thành công"
}
```

---

## Test case permission

### Teacher không được gọi admin API

**Request:**

```txt
POST {{base_url}}/api/v1/admin/reviews/{{document_id}}/approve
Authorization: Bearer {{teacher_token}}
```

**Expected Response:** 403 Forbidden.

---

## Lưu ý

- Nếu seed user `admin@example.com` hoặc `teacher.a@example.com` không tồn tại, hãy kiểm tra migration V3 hoặc tạo user thủ công.
- Nếu document chưa `ANALYZED`, submit review sẽ trả lỗi `DOCUMENT_NOT_ANALYZED`.
- Sau approve, document sẽ xuất hiện trong Library; sau reject thì không.
- Lưu ý: approve hiện tại chỉ chuyển `publication_status` sang `PUBLISHED`. Index RAG sau approve là task tiếp theo (chưa implement trong MVP này).
