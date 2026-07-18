# Test RAG Chat History Resume API bằng Postman

> Áp dụng cho endpoints mới `POST /api/v1/rag/conversations/...` và `GET /api/v1/rag/conversations/...`

---

## 1. Chuẩn bị

### 1.1. Start services

```bash
# Nếu dùng Docker
docker compose up -d

# Nếu chạy local
cd backend
./mvnw spring-boot:run
```

### 1.2. Tạo Collection variables trong Postman

| Variable | Initial Value | Mô tả |
|---|---|---|
| `base_url` | `http://localhost:8080` | Backend URL |
| `teacher_token` | (để trống) | Token của Teacher |
| `document_id` | (để trống) | ID document đã PUBLISHED + PROCESSED |
| `conversation_id` | (để trống) | ID conversation tự động lấy sau |

---

## 2. Tiền đề: Cần một document đã PROCESSED

Bạn phải có một document tồn tại trong DB với:

```txt
publication_status = PUBLISHED
processing_status = PROCESSED
```

Nếu chưa có, chạy flow sau:

### Step 2.1: Teacher login

```txt
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "teacher.a@example.com",
  "password": "123456"
}
```

Copy `access_token` vào collection variable `teacher_token`.

### Step 2.2: Upload + submit review + admin approve

Dùng file `scripts/test_admin_review_postman.md` để tạo document và approve.

Sau đó copy `document_id` vào collection variable `document_id`.

---

## 3. Flow test RAG Chat History Resume

### Step 3.1: Get or create conversation theo document

**Request:**

```txt
GET {{base_url}}/api/v1/rag/conversations/by-document/{{document_id}}
Authorization: Bearer {{teacher_token}}
```

**Expected Response (lần đầu - tạo mới):**

```json
{
  "success": true,
  "data": {
    "conversationId": 1,
    "documentId": 123,
    "documentTitle": "Bài giảng test",
    "messageCount": 0,
    "lastMessageAt": null,
    "messages": []
  },
  "message": "Lấy conversation thành công"
}
```

**Action:** Copy `data.conversationId` vào collection variable `conversation_id`.

**Expected Response (lần sau - đã có history):**

```json
{
  "success": true,
  "data": {
    "conversationId": 1,
    "documentId": 123,
    "documentTitle": "Bài giảng test",
    "messageCount": 4,
    "lastMessageAt": "2026-07-18T10:00:00Z",
    "messages": [
      {
        "id": 1,
        "role": "user",
        "content": "Tóm tắt bài giảng",
        "notFound": false,
        "citations": [],
        "tokensUsed": 0,
        "createdAt": "2026-07-18T09:55:00Z"
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "...",
        "notFound": false,
        "citations": [...],
        "tokensUsed": 150,
        "createdAt": "2026-07-18T09:55:02Z"
      }
    ]
  },
  "message": "Lấy conversation thành công"
}
```

---

### Step 3.2: GửI câu hỏi đầu tiên

**Request:**

```txt
POST {{base_url}}/api/v1/rag/conversations/{{conversation_id}}/messages
Authorization: Bearer {{teacher_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "question": "Tóm tắt nội dung chính của tài liệu này",
  "topK": 5,
  "language": "vi"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "conversationId": 1,
    "userMessage": {
      "id": 1,
      "role": "user",
      "content": "Tóm tắt nội dung chính của tài liệu này",
      "notFound": false,
      "citations": [],
      "tokensUsed": 0,
      "createdAt": "2026-07-18T10:00:00Z"
    },
    "assistantMessage": {
      "id": 2,
      "role": "assistant",
      "content": "Nội dung chính của tài liệu là...",
      "notFound": false,
      "citations": [
        {
          "chunkId": 1,
          "documentId": 123,
          "pageNumber": 1,
          "chunkIndex": 0,
          "excerpt": "...",
          "score": 0.85
        }
      ],
      "tokensUsed": 200,
      "createdAt": "2026-07-18T10:00:02Z"
    }
  },
  "message": "Trả lờI thành công"
}
```

---

### Step 3.3: GửI follow-up question (test resume + history)

**Request:**

```txt
POST {{base_url}}/api/v1/rag/conversations/{{conversation_id}}/messages
Authorization: Bearer {{teacher_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "question": "Giải thích chi tiết hơn điều đó",
  "topK": 5,
  "language": "vi"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "conversationId": 1,
    "userMessage": {
      "id": 3,
      "role": "user",
      "content": "Giải thích chi tiết hơn điều đó",
      "notFound": false,
      "citations": [],
      "tokensUsed": 0,
      "createdAt": "2026-07-18T10:05:00Z"
    },
    "assistantMessage": {
      "id": 4,
      "role": "assistant",
      "content": "Tôi sẽ giải thích chi tiết hơn...",
      "notFound": false,
      "citations": [...],
      "tokensUsed": 250,
      "createdAt": "2026-07-18T10:05:03Z"
    }
  },
  "message": "Trả lờI thành công"
}
```

**Cách verify history được gửI đi:**

Nhìn log AI Service hoặc Backend console. Bạn sẽ thấy request tới `/v1/answer-question` có `history` chứa 2 messages (câu hỏi + answer trước đó).

---

### Step 3.4: Get messages list

**Request:**

```txt
GET {{base_url}}/api/v1/rag/conversations/{{conversation_id}}/messages
Authorization: Bearer {{teacher_token}}
```

**Optional query params:**

```txt
?page=0&size=20&sort=createdAt,asc
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "role": "user",
        "content": "Tóm tắt nội dung chính của tài liệu này",
        ...
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "Nội dung chính của tài liệu là...",
        ...
      },
      {
        "id": 3,
        "role": "user",
        "content": "Giải thích chi tiết hơn điều đó",
        ...
      },
      {
        "id": 4,
        "role": "assistant",
        "content": "Tôi sẽ giải thích chi tiết hơn...",
        ...
      }
    ],
    "totalElements": 4,
    "totalPages": 1,
    "size": 20,
    "number": 0
  },
  "message": "Lấy danh sách message thành công"
}
```

---

### Step 3.5: Clear history

**Request:**

```txt
DELETE {{base_url}}/api/v1/rag/conversations/{{conversation_id}}/messages
Authorization: Bearer {{teacher_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": null,
  "message": "Đã xóa lịch sử hội thoại"
}
```

---

### Step 3.6: Verify history đã xóa

**Request:**

```txt
GET {{base_url}}/api/v1/rag/conversations/{{conversation_id}}/messages
Authorization: Bearer {{teacher_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "content": [],
    "totalElements": 0,
    "totalPages": 0,
    "size": 20,
    "number": 0
  },
  "message": "Lấy danh sách message thành công"
}
```

---

### Step 3.7: GửI lại câu hỏi sau khi xóa

**Request:**

```txt
POST {{base_url}}/api/v1/rag/conversations/{{conversation_id}}/messages
Authorization: Bearer {{teacher_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "question": "Tài liệu này có bao nhiêu chương?",
  "topK": 5,
  "language": "vi"
}
```

**Expected Response:**

- `userMessage.id` và `assistantMessage.id` mới.
- `assistantMessage.citations` có nội dung.

---

## 4. Test cases nâng cao

### 4.1. Test resume chat sau khi reload

1. GửI 2-3 câu hỏi.
2. GọI `GET /api/v1/rag/conversations/by-document/{{document_id}}` lại.
3. Verify `messages` trả về đúng lịch sử.
4. GửI tiếp câu hỏi thứ 4, verify AI có context từ các câu trước.

### 4.2. Test history limit (6 messages)

1. GửI liên tiếp 8 câu hỏi.
2. GửI câu thứ 9.
3. Verify trong log AI Service request chỉ chứa 6 messages gần nhất trước câu thứ 9.

### 4.3. Test not found

1. GửI câu hỏi hoàn toàn không liên quan đến document.
2. Expected response:

```json
{
  "success": true,
  "data": {
    "assistantMessage": {
      "notFound": true,
      "content": "Tôi không tìm thấy thông tin liên quan trong tài liệu.",
      "citations": []
    }
  },
  "message": "Không tìm thấy ngữ cảnh phù hợp"
}
```

### 4.4. Test permission denied

Dùng token của Teacher B (teacher.b@example.com) gọI:

```txt
GET {{base_url}}/api/v1/rag/conversations/{{conversation_id}}/messages
Authorization: Bearer {{teacher_b_token}}
```

**Expected:** `403 Forbidden` với `CONVERSATION_ACCESS_DENIED`.

### 4.5. Test document chưa PUBLISHED

Thử gọI `GET /api/v1/rag/conversations/by-document/{{document_id}}` với document đang ở `DRAFT` hoặc `PENDING_REVIEW`.

**Expected:** `400 Bad Request` với `DOCUMENT_NOT_PUBLISHED`.

### 4.6. Test document chưa PROCESSED

Tạo document, approve nhưng chưa index (processing_status != PROCESSED).

**Expected:** `400 Bad Request` với `DOCUMENT_NOT_PROCESSED`.

---

## 5. Postman Tests (scripts tự động verify)

Bạn có thể thêm tab **Tests** trong Postman cho mỗi request:

### Test lấy conversation thành công

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response success", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data.conversationId).to.exist;
});

pm.test("Save conversation_id", function () {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("conversation_id", jsonData.data.conversationId);
});
```

### Test send message thành công

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has user and assistant messages", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data.userMessage.role).to.eql("user");
    pm.expect(jsonData.data.assistantMessage.role).to.eql("assistant");
});
```

### Test clear history

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("History cleared", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.be.null;
});
```

---

## 6. Lưu ý

- AI Service phải đang chạy và `INTERNAL_API_KEY` trong `application.yml` của Backend phải khớp với AI Service.
- Nếu gặp `AI_SERVICE_ERROR`, kiểm tra log Backend và AI Service.
- Endpoint `/api/v1/library` có thể dùng để lấy `document_id` của document đã PUBLISHED.
- Nếu cần test với user khác, dùng `teacher.b@example.com` / `123456`.

---

## 7. CURL thay thế (nếu không dùng Postman)

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher.a@example.com","password":"123456"}'

# Get conversation
export TOKEN=your_token
export DOCUMENT_ID=123
curl -X GET "http://localhost:8080/api/v1/rag/conversations/by-document/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Send message
export CONVERSATION_ID=1
curl -X POST "http://localhost:8080/api/v1/rag/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Tóm tắt nội dung chính","topK":5,"language":"vi"}'

# Get messages
curl -X GET "http://localhost:8080/api/v1/rag/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $TOKEN"

# Clear history
curl -X DELETE "http://localhost:8080/api/v1/rag/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $TOKEN"
```
