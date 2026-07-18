# Backend Changes Log - 2026-07-18

Tài liệu ghi lại các thay đổI trên Backend cho tính năng **RAG Chat History Resume**.

---

## Tổng quan

Triển khai đầy đủ Backend cho tính năng lưu và resume lịch sử hỏi đáp RAG theo từng document.
Backend là source of truth cho conversation history; AI Service vẫn giữ stateless.

---

## 1. Database migration mới

### File

```txt
backend/src/main/resources/db/migration/V7__create_rag_conversation_history.sql
```

### Thay đổI

- Tạo bảng `rag_conversations`:
  - `id`, `user_id`, `document_id`, `title`, `message_count`, `last_message_at`, `created_at`, `updated_at`, `deleted_at`
  - Unique constraint `(user_id, document_id)`
  - Index trên `(user_id, document_id)`, `(document_id)`, `(user_id, last_message_at)`

- Tạo bảng `rag_messages`:
  - `id`, `conversation_id`, `role`, `content`, `not_found`, `citations_json`, `tokens_used`, `error_code`, `created_at`
  - Check constraint `role IN ('user', 'assistant')`
  - Check constraint `citations_json` là JSON array
  - Index trên `(conversation_id, created_at, id)` và `(conversation_id, role, created_at)`

---

## 2. Entity và enum mới

### Các file

```txt
backend/src/main/java/com/lmsrag/backend/entity/RagConversation.java
backend/src/main/java/com/lmsrag/backend/entity/RagMessage.java
backend/src/main/java/com/lmsrag/backend/enums/RagMessageRole.java
```

### Thay đổI

- `RagConversation` entity với `@ManyToOne` tới `User`, `Document` và `@OneToMany` tới `RagMessage`.
- `RagMessage` entity với `@ManyToOne` tới `RagConversation`, `@Enumerated` cho `role`, `@JdbcTypeCode(SqlTypes.JSON)` cho `citationsJson`.
- `RagMessageRole` enum: `user`, `assistant`.

---

## 3. Repository mới

### Các file

```txt
backend/src/main/java/com/lmsrag/backend/repository/RagConversationRepository.java
backend/src/main/java/com/lmsrag/backend/repository/RagMessageRepository.java
```

### Các method chính

- `RagConversationRepository.findByUserIdAndDocumentId(...)`
- `RagConversationRepository.existsByUserIdAndDocumentId(...)`
- `RagConversationRepository.findByUserIdAndDeletedAtIsNullOrderByLastMessageAtDesc(...)`
- `RagConversationRepository.softDeleteByIdAndUserId(...)`
- `RagMessageRepository.findByConversationIdOrderByCreatedAtAsc(...)`
- `RagMessageRepository.findByConversationIdOrderByCreatedAtDesc(..., Pageable)`
- `RagMessageRepository.findRecentMessagesBefore(...)`
- `RagMessageRepository.deleteByConversationId(...)`

---

## 4. DTO mới

### Các file

```txt
backend/src/main/java/com/lmsrag/backend/dto/rag/RagConversationResponse.java
backend/src/main/java/com/lmsrag/backend/dto/rag/RagMessageResponse.java
backend/src/main/java/com/lmsrag/backend/dto/rag/RagSendMessageRequest.java
backend/src/main/java/com/lmsrag/backend/dto/rag/RagSendMessageResponse.java
```

### Chức năng

- `RagConversationResponse`: response cho get-or-create conversation.
- `RagMessageResponse`: response cho một message.
- `RagSendMessageRequest`: request gửi câu hỏi mới với `question`, `topK`, `language`.
- `RagSendMessageResponse`: response sau khi gửi message, chứa user message và assistant message.

---

## 5. Service mới

### File

```txt
backend/src/main/java/com/lmsrag/backend/service/RagConversationService.java
```

### Các method chính

- `getOrCreateConversation(User user, Long documentId)`
- `sendMessage(User user, Long conversationId, RagSendMessageRequest request)`
- `getMessages(User user, Long conversationId, Pageable pageable)`
- `clearMessages(User user, Long conversationId)`

### Luồng send message

```txt
1. Kiểm tra conversation thuộc user
2. Kiểm tra document vẫn PUBLISHED + PROCESSED
3. Lưu user message
4. Lấy 6 messages gần nhất trước user message làm history
5. GọI AI Service /v1/answer-question
6. Lưu assistant message với answer, citations, notFound, tokensUsed
7. Cập nhật conversation counters
```

---

## 6. Controller mới

### File

```txt
backend/src/main/java/com/lmsrag/backend/controller/RagConversationController.java
```

### Endpoints

```txt
GET    /api/v1/rag/conversations/by-document/{documentId}
POST   /api/v1/rag/conversations/{conversationId}/messages
GET    /api/v1/rag/conversations/{conversationId}/messages
DELETE /api/v1/rag/conversations/{conversationId}/messages
```

---

## 7. Error code mới

### File

```txt
backend/src/main/java/com/lmsrag/backend/exception/ErrorCode.java
```

### Thêm

```java
CONVERSATION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy cuộc hội thoại"),
CONVERSATION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "Không có quyền truy cập cuộc hội thoại này"),
```

---

## 8. Unit tests

### File

```txt
backend/src/test/java/com/lmsrag/backend/service/RagConversationServiceTest.java
```

### Kết quả

- 14 test cases pass.
- Cover: get/create conversation, send message, get messages, clear messages, permission denied, document not published/processed, AI service error.

```powershell
./mvnw test -Dtest=RagConversationServiceTest
# Tests run: 14, Failures: 0, Errors: 0, Skipped: 0
```

---

## 9. Docs cập nhật

| File | Nội dung cập nhật |
|---|---|
| `docs/02_MVP_IMPLEMENTATION_PLAN.md` | Thêm BE-RAG-HIST-01 đến BE-RAG-HIST-05 vào bảng tracking với trạng thái DONE; thêm INT-RAG-HIST-01 |
| `docs/13_RAG_CHAT_HISTORY_RESUME_PLAN.md` | Cập nhật trạng thái BE task DONE; thêm cột trạng thái trong task summary; ghi chú Backend hoàn thành |
| `docs/05_DATABASE_SCHEMA_CONTRACT.md` | Thêm `rag_conversations` và `rag_messages` vào bảng core; cập nhật quan hệ bảng; thêm section contract cho 2 bảng mới |
| `docs/BACKEND_CHANGES_2026-07-18.md` | File này |

---

## 10. Build & Test

```powershell
cd backend
./mvnw clean test
```

Kết quả:

```txt
Tests run: 15, Failures: 0, Errors: 0, Skipped: 1
```

(15 tests: 14 RagConversationServiceTest + 1 disabled BackendApplicationTests)

---

## 11. Lưu ý

- AI Service `/v1/answer-question` không thay đổI contract, vẫn nhận `history` optional.
- `POST /api/v1/rag/answer` cũ được giữ lại để backward compatibility.
- Transaction trong `sendMessage` hiện rollback toàn bộ nếu AI call lỗi (Option B theo docs).
- Cần chạy migration thật (`./mvnw flyway:migrate` hoặc start app) để tạo bảng trong DB.
