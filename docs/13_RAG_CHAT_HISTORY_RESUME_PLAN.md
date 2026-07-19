# Kế Hoạch Triển Khai Lịch Sử Hỏi Đáp Và Resume Chat AI

**Phiên bản:** 1.0  
**Cập nhật:** 18/07/2026  
**Phạm vi:** Tính năng bổ sung sau MVP core RAG  
**Owner tổng hợp:** Frontend + Backend + AI Service

## 1. Mục Tiêu

Bổ sung khả năng lưu lịch sử hỏi đáp với AI theo từng tài liệu, để người dùng có thể:

- Mở lại trang chi tiết tài liệu và thấy lại các câu hỏi/câu trả lời đã hỏi trước đó.
- Tiếp tục hỏi trong cùng một mạch hội thoại sau khi reload hoặc quay lại trang.
- Xem lịch sử hỏi đáp theo từng tài liệu.
- Xóa lịch sử hỏi đáp của chính mình trên một tài liệu khi cần.
- Vẫn giữ nguyên nguyên tắc RAG: câu trả lời và citation phải dựa trên các document chunks thật.

Tính năng này không thay thế RAG proxy hiện tại. Nó nâng flow chat hiện tại từ **local state/stateless** thành flow có **persistence ở Backend**.

## 2. Quyết Định Kiến Trúc

### 2.1. Chốt Ownership

| Phần | Owner | Trách nhiệm |
|---|---|---|
| Frontend | FE | Hiển thị hội thoại, load lịch sử, gửi câu hỏi mới, clear history, xử lý loading/error |
| Backend | BE | Lưu conversation/messages, kiểm quyền, lấy history gần nhất, gọi AI Service, trả response cho FE |
| AI Service | AI | Tiếp tục stateless, nhận `history`, retrieval + generation, không lưu conversation |

### 2.2. Nguyên Tắc Quan Trọng

- FE không gọi AI Service trực tiếp.
- AI Service không lưu conversation trong DB.
- Backend là source of truth cho lịch sử hội thoại.
- Trong v1, mỗi user có một conversation mặc định trên mỗi document.
- Lịch sử hội thoại là riêng tư theo user; Teacher A không thấy lịch sử chat của Teacher B.
- Chat history không thay thế citation. Citation vẫn lấy từ retrieved chunks thật.
- Nếu answer `notFound=true`, Backend vẫn có thể lưu assistant message, nhưng phải lưu `citations=[]`.
- Không lưu prompt nội bộ, full retrieved context, hoặc internal API key vào lịch sử chat.

## 3. Scope MVP Cho Tính Năng Này

### Làm Trong V1

- Single conversation per user per document.
- Resume lịch sử khi user mở lại detail page.
- Lưu user message và assistant message cho mỗi lượt hỏi đáp.
- Backend lấy tối đa 6 messages gần nhất để gửi sang AI Service qua field `history`.
- FE hiển thị messages cũ giống messages mới.
- FE nút clear chat sẽ gọi Backend để xóa/purge messages của conversation.

### Không Làm Trong V1

- Nhiều conversation/thread trên cùng một document.
- Đổi tên conversation.
- Search trong chat history.
- Share conversation cho user khác.
- Export chat history.
- Streaming/SSE.
- Lưu prompt/context nội bộ của AI.
- Admin audit lịch sử chat.

## 4. Luồng Người Dùng

### 4.1. Mở Chat Lần Đầu

```txt
User mở Library/MyDocument detail
-> FE gọi BE get-or-create conversation theo documentId
-> BE kiểm quyền document RAG
-> Nếu chưa có conversation: tạo conversation rỗng
-> BE trả conversation + messages=[]
-> FE hiển thị empty state/gợi ý câu hỏi
```

### 4.2. Hỏi Câu Hỏi Mới

```txt
User nhập question
-> FE append user message tạm thời với state=submitting
-> FE POST question vào conversation
-> BE kiểm quyền document RAG
-> BE lưu user message
-> BE lấy 6 messages gần nhất trước câu hỏi hiện tại làm history
-> BE gọi AI Service /v1/answer-question
-> AI retrieval + generation + citations
-> BE lưu assistant message + citations + notFound + tokensUsed
-> BE trả assistant message cho FE
-> FE thay loading bằng assistant answer
```

### 4.3. Resume Sau Reload

```txt
User reload/mở lại detail
-> FE gọi get conversation
-> BE trả messages đã lưu theo created_at
-> FE map DB messages thành LocalChatMessage
-> User tiếp tục hỏi như bình thường
```

### 4.4. Clear History

```txt
User bấm icon xóa chat
-> FE confirm nếu cần
-> FE DELETE conversation messages
-> BE xóa messages hoặc mark deleted
-> FE set messages=[]
```

## 5. Database Design Đề Xuất

### 5.1. Bảng `rag_conversations`

Một conversation mặc định cho mỗi cặp `user_id + document_id`.

```sql
CREATE TABLE rag_conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    document_id BIGINT NOT NULL REFERENCES documents(id),
    title VARCHAR(255),
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT uk_rag_conversation_user_document UNIQUE (user_id, document_id)
);

CREATE INDEX idx_rag_conversations_user_document
    ON rag_conversations(user_id, document_id);

CREATE INDEX idx_rag_conversations_document
    ON rag_conversations(document_id);
```

### 5.2. Bảng `rag_messages`

```sql
CREATE TABLE rag_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES rag_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    not_found BOOLEAN NOT NULL DEFAULT FALSE,
    citations_json TEXT,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    error_code VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rag_message_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX idx_rag_messages_conversation_created
    ON rag_messages(conversation_id, created_at, id);
```

### 5.3. Ghi Chú Schema

- `citations_json` có thể dùng `TEXT` cho MVP đơn giản. Nếu Backend đang dùng PostgreSQL JSONB thì nên dùng `JSONB`.
- `not_found` chỉ có ý nghĩa với assistant message; user message để default `false`.
- `tokens_used` chỉ có ý nghĩa với assistant message.
- `message_count` có thể cập nhật sau mỗi lần insert để UI hiển thị nhanh.
- `deleted_at` cho phép clear conversation nhưng vẫn giữ audit tối thiểu. Nếu muốn đơn giản hơn, có thể hard delete messages và giữ conversation.

## 6. Backend API Contract Đề Xuất

Base path đề xuất:

```txt
/api/v1/rag/conversations
```

### 6.1. Get Or Create Conversation Theo Document

```http
GET /api/v1/rag/conversations/by-document/{documentId}
Authorization: Bearer <jwt>
```

Behavior:

- Kiểm tra user có quyền RAG document.
- Nếu conversation của `currentUser + documentId` chưa tồn tại thì tạo mới.
- Trả conversation và messages gần nhất.

Response:

```json
{
  "success": true,
  "data": {
    "conversationId": 101,
    "documentId": 12,
    "documentTitle": "Thông tin và xử lý thông tin",
    "messageCount": 4,
    "lastMessageAt": "2026-07-18T22:10:00",
    "messages": [
      {
        "id": 1001,
        "role": "user",
        "content": "Tóm tắt các ý chính của tài liệu?",
        "notFound": false,
        "citations": [],
        "tokensUsed": 0,
        "createdAt": "2026-07-18T22:09:00"
      },
      {
        "id": 1002,
        "role": "assistant",
        "content": "Tài liệu trình bày các khái niệm chính về thông tin, dữ liệu và tri thức...",
        "notFound": false,
        "citations": [
          {
            "chunkId": 20,
            "documentId": 12,
            "pageNumber": 1,
            "chunkIndex": 0,
            "excerpt": "...",
            "score": 0.82
          }
        ],
        "tokensUsed": 512,
        "createdAt": "2026-07-18T22:09:05"
      }
    ]
  }
}
```

### 6.2. Gửi Message Mới Vào Conversation

```http
POST /api/v1/rag/conversations/{conversationId}/messages
Authorization: Bearer <jwt>
Content-Type: application/json
```

Request:

```json
{
  "question": "Hàng đợi là gì?",
  "topK": 5,
  "language": "vi"
}
```

Backend behavior:

1. Load conversation.
2. Kiểm tra conversation thuộc current user.
3. Kiểm tra document vẫn đủ điều kiện RAG: `PUBLISHED` và `PROCESSED`.
4. Lưu user message.
5. Lấy tối đa 6 messages gần nhất trước user message mới, bỏ qua message lỗi nếu có.
6. Map history sang AI Service:

```json
{
  "document_ids": [12],
  "question": "Hàng đợi là gì?",
  "top_k": 5,
  "language": "vi",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

7. Gọi AI Service.
8. Lưu assistant message với answer/citations/notFound/tokensUsed.
9. Trả cả userMessage và assistantMessage cho FE.

Response:

```json
{
  "success": true,
  "data": {
    "conversationId": 101,
    "userMessage": {
      "id": 1003,
      "role": "user",
      "content": "Hàng đợi là gì?",
      "createdAt": "2026-07-18T22:11:00"
    },
    "assistantMessage": {
      "id": 1004,
      "role": "assistant",
      "content": "Không tìm thấy thông tin này trong tài liệu đã chọn.",
      "notFound": true,
      "citations": [],
      "tokensUsed": 0,
      "createdAt": "2026-07-18T22:11:02"
    }
  },
  "message": "Trả lời thành công"
}
```

### 6.3. List Messages Có Pagination

Optional cho v1 nếu get conversation đã trả đủ messages. Nên thêm nếu muốn chat dài.

```http
GET /api/v1/rag/conversations/{conversationId}/messages?page=0&size=30
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 0,
    "size": 30,
    "totalElements": 120,
    "hasNext": true
  }
}
```

### 6.4. Clear Conversation

```http
DELETE /api/v1/rag/conversations/{conversationId}/messages
```

Behavior:

- Chỉ owner của conversation được clear.
- Xóa messages hoặc mark deleted tùy design Backend.
- Reset `message_count=0`, `last_message_at=null`.

Response:

```json
{
  "success": true,
  "data": {
    "conversationId": 101,
    "messageCount": 0
  },
  "message": "Đã xóa lịch sử hỏi đáp"
}
```

## 7. Backend Implementation Tasks

### BE-RAG-HIST-01 - Database Migration Cho RAG Conversation History

Owner: Backend  
Priority: P0  
Dependencies: existing users/documents schema

Đầu việc:

- Tạo Flyway migration cho `rag_conversations` và `rag_messages`.
- Thêm unique constraint `(user_id, document_id)`.
- Thêm index query theo conversation/time.
- Chốt type cho `citations_json`: `TEXT` hoặc `JSONB`.
- Cập nhật schema docs nếu project dùng docs schema canonical.

Acceptance criteria:

- App start được với migration mới.
- DB có unique conversation per user/document.
- Index phục vụ load messages theo conversation/time.

Suggested commit:

```txt
feat(be): add rag conversation history schema
```

### BE-RAG-HIST-02 - Entities, Repositories, DTOs

Owner: Backend  
Priority: P0  
Dependencies: BE-RAG-HIST-01

Đầu việc:

- Tạo entity `RagConversation`.
- Tạo entity `RagMessage`.
- Tạo repositories:
  - `RagConversationRepository.findByUserIdAndDocumentId(...)`
  - `RagMessageRepository.findRecentByConversationId(...)`
  - `RagMessageRepository.findPageByConversationId(...)`
- Tạo DTOs:
  - `RagConversationResponse`
  - `RagMessageResponse`
  - `RagSendMessageRequest`
  - `RagSendMessageResponse`
- Tạo mapper citations JSON <-> DTO.

Acceptance criteria:

- Repository query chính có test hoặc được cover qua service tests.
- DTO không expose prompt/context nội bộ.
- Response message đủ field FE cần render.

Suggested commit:

```txt
feat(be): model rag conversations and messages
```

### BE-RAG-HIST-03 - Conversation Service Và Permission Checks

Owner: Backend  
Priority: P0  
Dependencies: BE-RAG-HIST-02

Đầu việc:

- Tạo `RagConversationService` hoặc mở rộng `RagService` với ranh giới rõ.
- Implement get-or-create conversation by document.
- Dùng lại rule validate document RAG hiện có.
- Đảm bảo user chỉ truy cập conversation của mình.
- Không cho resume/send chat với document không còn RAG được; trả error rõ nếu document bị archived/not processed.

Acceptance criteria:

- User A không đọc được conversation của User B.
- Document chưa `PROCESSED` không tạo/send conversation RAG.
- Conversation duplicate không tạo do unique constraint.

Suggested commit:

```txt
feat(be): add rag conversation service
```

### BE-RAG-HIST-04 - Persist Send-Message Flow Around AI Call

Owner: Backend  
Priority: P0  
Dependencies: BE-RAG-HIST-03

Đầu việc:

- Implement `POST /rag/conversations/{id}/messages`.
- Lưu user message trước khi gọi AI.
- Lấy 6 messages gần nhất trước user message mới để build AI `history`.
- Gọi AI Service `/v1/answer-question` như flow hiện có.
- Lưu assistant message với answer, citations, notFound, tokensUsed.
- Nếu AI call lỗi, chọn một trong hai hướng:
  - Option A: lưu user message + assistant error message.
  - Option B: lưu user message, trả error, FE hiển thị retry.
- Khuyến nghị MVP: Option B để tránh lưu assistant error như một câu trả lời thật.

Acceptance criteria:

- Sau send message thành công, DB có 2 rows: user + assistant.
- Request tiếp theo gửi đúng history gần nhất sang AI.
- `notFound=true` assistant message lưu `citations=[]`.
- Existing `/api/v1/rag/answer` có thể giữ lại để backward compatibility.

Suggested commit:

```txt
feat(be): persist rag chat messages during answer flow
```

### BE-RAG-HIST-05 - Clear History Và Tests

Owner: Backend  
Priority: P1  
Dependencies: BE-RAG-HIST-04

Đầu việc:

- Implement `DELETE /rag/conversations/{id}/messages`.
- Reset counters.
- Add tests cho clear.
- Add integration/controller tests cho get, send, permission, clear.

Acceptance criteria:

- Clear xong FE reload thấy messages rỗng.
- User khác không clear được conversation.

Suggested commit:

```txt
feat(be): support clearing rag chat history
```

## 8. Frontend Implementation Tasks

### FE-RAG-HIST-01 - Add Conversation API Client Và Types

Owner: Frontend  
Priority: P0  
Dependencies: BE-RAG-HIST API draft hoặc mock

Đầu việc:

- Thêm types:
  - `RagConversation`
  - `RagPersistedMessage`
  - `RagSendMessageResponse`
- Mở rộng `ragService.ts`:
  - `getConversationByDocument(documentId)`
  - `sendConversationMessage(conversationId, request)`
  - `clearConversationMessages(conversationId)`
- Giữ `askQuestion` cũ tạm thời nếu màn nào còn dùng.

Acceptance criteria:

- API client compile pass.
- Mapping camelCase <-> backend JSON đúng với `apiClient` hiện tại.

Suggested commit:

```txt
feat(fe): add rag conversation api client
```

### FE-RAG-HIST-02 - Load Và Resume Messages Trong RagChatPanel

Owner: Frontend  
Priority: P0  
Dependencies: FE-RAG-HIST-01, BE-RAG-HIST-03

Đầu việc:

- `RagChatPanel` load conversation khi có `document.id` và `isEligible=true`.
- Thêm state:
  - `conversationId`
  - `isLoadingHistory`
  - `historyLoadError`
- Map persisted messages sang `LocalChatMessage`.
- Hiển thị loading skeleton/disabled input khi đang load history.
- Nếu messages rỗng, hiển thị empty state như hiện tại.

Acceptance criteria:

- Reload detail page vẫn thấy messages cũ.
- Đổi document thì load conversation của document mới.
- Nếu load history lỗi, UI hiển thị lỗi nhẹ và có nút retry.

Suggested commit:

```txt
feat(fe): resume rag chat history in document detail
```

### FE-RAG-HIST-03 - Send Question Qua Conversation Endpoint

Owner: Frontend  
Priority: P0  
Dependencies: FE-RAG-HIST-02, BE-RAG-HIST-04
Status: DONE - FE đã gửi câu hỏi qua conversation endpoint, dùng persisted user/assistant messages từ BE response.

Đầu việc:

- Thay `ragService.askQuestion` trong panel bằng `sendConversationMessage`.
- FE không cần tự build `history` nữa nếu BE đã lấy từ DB.
- Vẫn append optimistic user message để UX nhanh.
- Khi BE trả message IDs, thay optimistic IDs bằng persisted IDs nếu cần.
- Assistant message lấy từ response BE.
- Đảm bảo abort/cancel UI không làm DB state sai. Nếu cần, cancel chỉ hủy request FE; BE có thể vẫn xử lý xong.

Acceptance criteria:

- Hỏi câu mới xong reload vẫn thấy cả user và assistant message.
- Không duplicate message khi request success.
- Not-found answer không hiển thị citations.

Suggested commit:

```txt
feat(fe): send rag questions through persisted conversation
```

### FE-RAG-HIST-04 - Clear Persisted Chat History

Owner: Frontend  
Priority: P1  
Dependencies: BE-RAG-HIST-05
Status: DONE - FE đã confirm nhẹ, gọi clear persisted endpoint, reset UI sau success và hiển thị lỗi inline khi fail.

Đầu việc:

- Icon trash hiển thị confirm nhẹ.
- Gọi `clearConversationMessages`.
- Sau clear success, set `messages=[]`.
- Khi clear fail, hiển thị toast/error inline.

Acceptance criteria:

- Clear xong reload không thấy messages cũ.
- Không clear local-only nữa khi BE endpoint available.

Suggested commit:

```txt
feat(fe): clear persisted rag chat history
```

### FE-RAG-HIST-05 - UX Polish Và Edge States

Owner: Frontend  
Priority: P1  
Dependencies: FE-RAG-HIST-03
Status: DONE - FE đã polish placeholder/disabled states, timestamp nhỏ, autoscroll sau resume và kiểm soát citations cho not_found.

Đầu việc:

- Hiển thị timestamp nhỏ nếu cần.
- Khi conversation dài, message list vẫn scroll trong chat panel.
- Giữ compact citations đã có.
- Không hiển thị citations cho `not_found`.
- Disable input khi document mất eligibility.

Acceptance criteria:

- Mobile/Desktop không overflow layout.
- Build pass.
- Manual QA với reload, switch document, clear.

Suggested commit:

```txt
fix(fe): polish rag chat history states
```

## 9. AI Service Implementation Tasks

AI Service hiện đã có `history` trong `/v1/answer-question`, nên không cần lưu conversation.

### AI-RAG-HIST-01 - Verify Stateless History Contract

Owner: AI  
Priority: P0  
Status: DONE
Dependencies: BE-RAG-HIST-04

Đầu việc:

- Xác nhận AI contract vẫn nhận `history` tối đa 6 messages.
- Đảm bảo Backend gửi history theo order cũ -> mới.
- Đảm bảo AI không yêu cầu `conversation_id`.
- Chạy tests hiện có cho answer-question.

Acceptance criteria:

- `POST /v1/answer-question` không đổi breaking contract.
- Regression pass.

Suggested commit:

```txt
test(ai): verify stateless rag history contract
```

### AI-RAG-HIST-02 - Optional: Strengthen History Prompt/Retrieval Tests

Owner: AI  
Priority: P1  
Status: DONE
Dependencies: AI-RAG-HIST-01

Đầu việc:

- Thêm test khi history dài thì schema chỉ chấp nhận tối đa 6 messages.
- Thêm test history order trong generation prompt.
- Thêm test `not_found` không gọi LLM nếu retrieval không có chunks.
- Nếu BE sẽ gửi assistant not-found messages trong history, xem có nên exclude không.

Acceptance criteria:

- AI tests pass.
- Không thêm DB/state vào AI Service.

Suggested commit:

```txt
test(ai): cover rag conversation history edge cases
```

### AI-RAG-HIST-03 - Optional Docs Update

Owner: AI  
Priority: P1  
Status: DONE
Dependencies: BE-RAG-HIST-04

Đầu việc:

- Cập nhật `04_AI_API_CONTRACT.md` nếu cần nói rõ Backend là owner conversation persistence.
- Cập nhật `06_AI_PIPELINE.md` nếu cần thêm flow persisted-BE-history -> stateless-AI-history.

Acceptance criteria:

- Docs không nói AI lưu conversation.
- Contract vẫn rõ FE không gọi AI trực tiếp.

Suggested commit:

```txt
docs(ai): document persisted rag history handoff
```

## 10. Thứ Tự Implement Đề Xuất

```txt
BE-RAG-HIST-01
-> BE-RAG-HIST-02
-> BE-RAG-HIST-03
-> FE-RAG-HIST-01 song song với BE-RAG-HIST-03
-> BE-RAG-HIST-04
-> FE-RAG-HIST-02
-> FE-RAG-HIST-03
-> BE-RAG-HIST-05
-> FE-RAG-HIST-04
-> AI-RAG-HIST-01/02/03 (DONE, chỉ cần chạy regression khi tích hợp FE)
-> INT-RAG-HIST-01
```

## 11. Integration Test Plan

### INT-RAG-HIST-01 - Resume Chat E2E

Owner: FE + BE + AI  
Priority: P0

Steps:

1. Login User A.
2. Mở document `PUBLISHED + PROCESSED`.
3. Gọi get conversation, expect messages rỗng.
4. Hỏi câu có trong tài liệu.
5. Expect answer + citations.
6. Reload page.
7. Expect user question và assistant answer vẫn hiển thị.
8. Hỏi câu tiếp theo phụ thuộc context trước.
9. Backend logs/AI request phải có `history`.

Pass criteria:

- Messages được resume.
- Answer thứ hai không mất context.
- Citations vẫn hiển thị khi `notFound=false`.

### INT-RAG-HIST-02 - Not Found Without Citations

Steps:

1. Hỏi câu không liên quan document.
2. Expect assistant message `notFound=true`.
3. Expect citations rỗng.
4. Reload page.
5. Expect message not-found vẫn không hiển thị citation.

Pass criteria:

- Không còn UI gây hiểu nhầm với nguồn tham khảo khi tài liệu không có thông tin.

### INT-RAG-HIST-03 - Permission Isolation

Steps:

1. User A hỏi trên Document X.
2. User B mở Document X.
3. User B không thấy history của User A.
4. User B tạo conversation riêng.

Pass criteria:

- Conversation scope theo user.

### INT-RAG-HIST-04 - Clear History

Steps:

1. User hỏi 2 lượt.
2. Bấm clear.
3. Reload.
4. Expect messages rỗng.

Pass criteria:

- DB messages bị xóa/mark deleted theo design.
- UI rỗng.

## 12. Error Handling

| Case | Backend response | Frontend behavior |
|---|---|---|
| Document not found | `DOCUMENT_NOT_FOUND` | Show error, disable chat |
| Document not published | `DOCUMENT_NOT_PUBLISHED` | Show document unavailable |
| Document not processed | `DOCUMENT_NOT_PROCESSED` | Show RAG not ready |
| Conversation không thuộc user | `FORBIDDEN` | Redirect/back hoặc show no permission |
| AI timeout/provider unavailable | 503 hoặc mapped error | Giữ user message local? show retry option |
| AI not_found | Success với assistant `notFound=true`, `citations=[]` | Show amber not-found bubble, no citations |

## 13. Security Và Privacy

- Conversation/messages là user-private.
- Backend phải filter theo current user ở mọi conversation endpoint.
- Không expose internal prompt, retrieved full chunks, hoặc internal API key.
- Citations chỉ là excerpt ngắn đã có trong answer response.
- Nếu admin cần audit chat history, đó là feature riêng, không thuộc v1.

## 14. Performance Notes

- Mỗi answer request chỉ gửi tối đa 6 messages gần nhất sang AI.
- Messages list nên paginate nếu conversation dài.
- Index `(conversation_id, created_at, id)` bắt buộc để load history nhanh.
- `citations_json` có thể lớn; chỉ lưu citations cần hiển thị, không lưu full retrieved context.

## 15. Backward Compatibility

- Giữ `POST /api/v1/rag/answer` trong giai đoạn chuyển tiếp.
- FE mới nên dùng conversation endpoint.
- Khi feature ổn định, có thể deprecate local-only chat flow.
- AI Service `/v1/answer-question` không đổi payload bắt buộc.

## 16. Definition Of Done

Feature được xem là xong khi:

- ✅ BE có migration, entities, repositories, service, controller và tests.
- FE load/resume messages, send persisted message, clear history và build pass.
- AI regression pass với stateless history.
- E2E test qua Docker: ask -> reload -> resume -> follow-up -> clear.
- Not-found answers không hiển thị citations cả trước và sau reload.
- ✅ Docs/API notes được cập nhật nếu contract thực tế khác bản đề xuất này.

**Trạng thái hiện tại (19/07/2026):** Backend đã hoàn thành toàn bộ 5 task BE-RAG-HIST. AI Service đã hoàn thành phần stateless history từ AI-08/AI-09 và đã có contract/tests/docs tương ứng. Frontend đã có API client, load/resume messages, send message qua conversation endpoint, clear persisted history và UX polish; E2E còn TODO.

## 17. Task Summary Cho Team

| Task | Owner | Priority | Output | Trạng thái |
|---|---|---:|---|---:|
| BE-RAG-HIST-01 | BE | P0 | Migration conversations/messages | DONE |
| BE-RAG-HIST-02 | BE | P0 | Entities, repositories, DTOs | DONE |
| BE-RAG-HIST-03 | BE | P0 | Get/create conversation + permission | DONE |
| BE-RAG-HIST-04 | BE | P0 | Persist send-message flow + AI call | DONE |
| BE-RAG-HIST-05 | BE | P1 | Clear history + tests | DONE |
| FE-RAG-HIST-01 | FE | P0 | API client + types | DONE |
| FE-RAG-HIST-02 | FE | P0 | Load/resume messages | DONE |
| FE-RAG-HIST-03 | FE | P0 | Send via conversation endpoint | DONE |
| FE-RAG-HIST-04 | FE | P1 | Clear persisted history | DONE |
| FE-RAG-HIST-05 | FE | P1 | UX polish | DONE |
| AI-RAG-HIST-01 | AI | P0 | Verify stateless history contract | DONE |
| AI-RAG-HIST-02 | AI | P1 | Extra history tests | DONE |
| AI-RAG-HIST-03 | AI | P1 | AI docs handoff update | DONE |
| INT-RAG-HIST-01 | ALL | P0 | Resume chat E2E | TODO |

## 18. Ghi Chú Chốt

Hướng này đúng vì nó tách trách nhiệm rõ ràng:

- Backend nắm user, permission, document status và DB nên Backend phải lưu conversation.
- AI Service chỉ cần history gần nhất để cải thiện retrieval/generation, nên vẫn stateless.
- Frontend chỉ hiển thị và điều phối UX, không phải source of truth cho chat history.

Đây là cách ít rủi ro nhất để thêm resume chat mà không làm phình AI Service và không phá flow RAG hiện có.