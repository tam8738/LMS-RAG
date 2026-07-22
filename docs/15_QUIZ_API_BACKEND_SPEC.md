# Quiz API – Backend Specification

**Trạng thái:** Đã triển khai

**Cập nhật:** 23/07/2026

**Migration:** `V14__create_quiz_tables.sql`

Implementation hiện có đủ 4 endpoint trong tài liệu, rule `TEACHER`, owner/DRAFT checks, client gọi
AI Service, persistence `quizzes`/`quiz_questions` và unit tests service/request validation. Chưa triển
khai public/student play API, attempts hoặc results theo đúng phần ngoài phạm vi.

**Phiên bản:** 1.1

**Cập nhật:** 23/07/2026

**Owner:** Backend

**Liên quan:** `docs/API_ROLES.md`, `docs/04_AI_API_CONTRACT.md`, `docs/05_DATABASE_SCHEMA_CONTRACT.md`

---

## 1. Tổng quan

Backend chịu trách nhiệm:

1. Nhận request từ Teacher, validate điều kiện document.
2. Gọi AI Service `POST /v1/generate-quiz` để sinh quiz draft.
3. Lưu kết quả vào DB kèm thông tin teacher đã tạo.
4. Cho phép Teacher xem, sửa quiz draft của mình.
5. Publish quiz và trả toàn bộ câu hỏi + đáp án về Frontend.

Frontend chịu trách nhiệm:
- Tạo URL cho student (`/quiz/play/{quizId}`).
- Chấm điểm, xếp hạng, kiểm tra đáp án — hoàn toàn bằng JavaScript, không gọi thêm backend.

> AI Service chỉ trả JSON, **không lưu gì vào DB**. Backend phải lưu toàn bộ sau khi nhận kết quả.

---

## 2. Endpoints & Phân quyền

| Method | Endpoint | Role | Ghi chú |
|---|---|---|---|
| `POST` | `/api/v1/quiz/generate` | `TEACHER` | Sinh quiz từ document đã PUBLISHED + PROCESSED |
| `GET` | `/api/v1/quiz/{quizId}` | `TEACHER` | Chỉ **owner** (teacher tạo quiz) mới xem được |
| `PATCH` | `/api/v1/quiz/{quizId}` | `TEACHER` | Chỉ **owner**, quiz phải ở trạng thái `DRAFT` |
| `POST` | `/api/v1/quiz/{quizId}/publish` | `TEACHER` | Chỉ **owner**, quiz phải ở trạng thái `DRAFT` |

### Quy tắc phân quyền

**Tầng SecurityConfig:** Thêm rule `/api/v1/quiz/**` → `hasRole("TEACHER")`. Mọi request không phải TEACHER bị chặn tại đây, trả 403 trước khi vào controller.

**Tầng Controller:** Lấy `User` từ `@AuthenticationPrincipal CustomUserDetails`, truyền xuống Service. Không xử lý logic.

**Tầng Service:**
- `generate`: Không check document owner. **Mọi Teacher đều có thể sinh quiz trên bất kỳ document PUBLISHED + PROCESSED nào.** Lưu `created_by = currentUser`.
- `getQuiz`, `updateQuiz`, `publishQuiz`: Check `quiz.getCreatedBy().getId() == currentUser.getId()`. Nếu sai → `QUIZ_ACCESS_DENIED`.

---

## 3. Điều kiện để sinh quiz

Validate theo thứ tự trước khi gọi AI:

1. `documentId` tồn tại trong DB → không: `DOCUMENT_NOT_FOUND`
2. `document.publicationStatus == PUBLISHED` → không: `DOCUMENT_NOT_PUBLISHED`
3. `document.processingStatus == PROCESSED` → không: `DOCUMENT_NOT_PROCESSED`
4. Gọi AI Service thành công → không: wrap `AiServiceException` → 502

> Không check `document.uploadedBy`. Teacher A có thể sinh quiz từ document của Teacher B.

---

## 4. State transition quiz

```
DRAFT  ──[PATCH]──────→  DRAFT        ✅ được sửa nhiều lần
DRAFT  ──[publish]────→  PUBLISHED    ✅ được publish
PUBLISHED ──[PATCH]───→  ❌ QUIZ_NOT_DRAFT
PUBLISHED ──[publish]─→  ❌ QUIZ_NOT_DRAFT
```

Không có chuyển ngược từ PUBLISHED → DRAFT.

---

## 5. Database Schema

### Migration: `V14__create_quiz_tables.sql`

Đặt tại: `backend/src/main/resources/db/migration/`

```sql
CREATE TABLE IF NOT EXISTS quizzes (
    id              BIGSERIAL PRIMARY KEY,
    document_id     BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_by      BIGINT NOT NULL REFERENCES users(id),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    question_count  INTEGER NOT NULL DEFAULT 0,
    language        VARCHAR(10) NOT NULL DEFAULT 'vi',
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_quiz_status        CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT ck_quiz_qcount        CHECK (question_count >= 0),
    CONSTRAINT ck_quiz_tokens        CHECK (tokens_used >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_document   ON quizzes(document_id);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id                 BIGSERIAL PRIMARY KEY,
    quiz_id            BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_index     INTEGER NOT NULL,
    question_text      TEXT NOT NULL,
    question_type      VARCHAR(30) NOT NULL DEFAULT 'single_choice',
    options_json       JSONB NOT NULL,
    correct_option_ids JSONB NOT NULL,
    explanation        TEXT,
    citations_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_quiz_question_index   UNIQUE (quiz_id, question_index),
    CONSTRAINT ck_qtype                 CHECK (question_type IN ('single_choice')),
    CONSTRAINT ck_options_array         CHECK (jsonb_typeof(options_json) = 'array'),
    CONSTRAINT ck_correct_ids_array     CHECK (jsonb_typeof(correct_option_ids) = 'array'),
    CONSTRAINT ck_citations_array       CHECK (jsonb_typeof(citations_json) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, question_index);
```

---

## 6. Cấu trúc file cần tạo

```
backend/src/main/
├── resources/db/migration/
│   └── [NEW] V14__create_quiz_tables.sql
│
└── java/com/lmsrag/backend/
    ├── enums/
    │   └── [NEW] QuizStatus.java
    │
    ├── entity/
    │   ├── [NEW] Quiz.java
    │   └── [NEW] QuizQuestion.java
    │
    ├── repository/
    │   ├── [NEW] QuizRepository.java
    │   └── [NEW] QuizQuestionRepository.java
    │
    ├── dto/
    │   ├── ai/
    │   │   ├── [NEW] AiGenerateQuizRequest.java    ← gửi sang AI Service
    │   │   ├── [NEW] AiGenerateQuizResult.java     ← nhận từ AI Service
    │   │   ├── [NEW] AiQuizQuestion.java
    │   │   ├── [NEW] AiQuizOption.java
    │   │   └── [NEW] AiQuizCitation.java
    │   │
    │   └── quiz/                                   ← giao tiếp với Frontend
    │       ├── [NEW] QuizGenerateRequest.java
    │       ├── [NEW] QuizUpdateRequest.java
    │       ├── [NEW] QuizQuestionUpdateRequest.java
    │       ├── [NEW] QuizOptionDto.java
    │       ├── [NEW] QuizCitationDto.java
    │       ├── [NEW] QuizQuestionResponse.java
    │       └── [NEW] QuizResponse.java
    │
    ├── client/ai/
    │   └── [MODIFY] AiServiceClient.java           ← thêm generateQuizSync()
    │
    ├── service/
    │   └── [NEW] QuizService.java
    │
    ├── controller/
    │   └── [NEW] QuizController.java
    │
    ├── exception/
    │   └── [MODIFY] ErrorCode.java                 ← thêm 4 error code quiz
    │
    └── config/
        └── [MODIFY] SecurityConfig.java            ← thêm rule /api/v1/quiz/**
```

### Mục đích AI DTO vs Quiz DTO

| Nhóm | Package | Dùng ở đâu | Vai trò |
|---|---|---|---|
| `Ai*` | `dto/ai/` | `AiServiceClient` ↔ AI Service | Map JSON snake_case của AI Service |
| `Quiz*` | `dto/quiz/` | Controller ↔ FE | Request/Response chuẩn camelCase cho FE |

AI DTO cần `@JsonProperty("snake_case")` cho mọi field vì AI Service dùng snake_case.
Quiz DTO không cần, Jackson tự map camelCase.

---

## 7. Quy tắc từng layer

### QuizStatus (enum)
- Chỉ 2 giá trị: `DRAFT`, `PUBLISHED`.
- Có Javadoc mô tả ý nghĩa từng giá trị.

### Entity (Quiz, QuizQuestion)
- Tuân thủ pattern `Document.java`, `RagConversation.java` hiện có.
- `@ManyToOne(fetch = FetchType.LAZY)` cho mọi FK.
- `@CreationTimestamp` / `@UpdateTimestamp` cho audit fields.
- `optionsJson`, `correctOptionIds`, `citationsJson` dùng `@JdbcTypeCode(SqlTypes.JSON)` — tham khảo `Document.tags`.
- **Không** khai báo `@OneToMany` từ `Quiz` sang `QuizQuestion`. Dùng Repository riêng.

### Repository
- Chỉ chứa query method, không chứa logic.
- `QuizRepository`: cần `findByCreatedByIdOrderByCreatedAtDesc`, `findByIdAndCreatedById`.
- `QuizQuestionRepository`: cần `findByQuizIdOrderByQuestionIndex`, `deleteByQuizId`.

### AI DTO
- Dùng `record`.
- Mỗi field map sang JSON AI Service phải có `@JsonProperty("snake_case")`.
- `AiGenerateQuizRequest` có static factory method `from(documentId, questionCount, language)`.

### Quiz DTO (Frontend)
- Request dùng class thường với `@NotNull`, `@Min`, `@Max` trên các field cần validate.
- Response dùng `@Data @Builder @NoArgsConstructor @AllArgsConstructor @JsonInclude(NON_NULL)`.
- `QuizOptionDto`, `QuizCitationDto` dùng `record`.
- `QuizResponse` luôn kèm `questions` (không lazy) — FE cần full data.

### AiServiceClient
- Thêm `generateQuizSync(AiGenerateQuizRequest): AiGenerateQuizResult`.
- Pattern giống `answerQuestionSync()`: gọi đồng bộ `.block()`, bắt `WebClientResponseException`, throw `AiServiceException`.
- URI: `POST /v1/generate-quiz`, header `X-Internal-Key`.

### QuizService
- `@Slf4j @Service @RequiredArgsConstructor`.
- Method write: `@Transactional`. Method read: `@Transactional(readOnly = true)`.
- `generateQuiz`: validate document → gọi AI → lưu `Quiz` + `QuizQuestion` → trả response.
- `getQuiz`, `updateQuiz`, `publishQuiz`: load quiz → `requireOwner()` → xử lý → trả response.
- Helper `requireOwner(Quiz, User)` dùng chung, throw `QUIZ_ACCESS_DENIED` nếu không phải owner.
- Không chứa HTTP logic (ResponseEntity, HttpStatus).

### QuizController
- `@RestController @RequestMapping("/api/v1/quiz") @RequiredArgsConstructor @Slf4j`.
- `@Tag(name = "Quiz", description = "...")` cho Swagger.
- Mỗi method: `@AuthenticationPrincipal CustomUserDetails` → lấy `User` → gọi service → wrap `ApiResponse`.
- Log tại controller: `log.info("[QUIZ-CTRL] Nhận yêu cầu ... | userId={} | ..."`.
- `POST /generate` trả `201 Created`. Các method còn lại trả `200 OK`.
- Không chứa business logic, không gọi Repository, không gọi AI.

---

## 8. Quy tắc validate

| Field | Rule |
|---|---|
| `QuizGenerateRequest.documentId` | `@NotNull` |
| `QuizGenerateRequest.questionCount` | `@Min(1) @Max(10)`, default `5` |
| `QuizGenerateRequest.language` | `"vi"` hoặc `"en"`, default `"vi"` |
| `QuizQuestionUpdateRequest.id` | `@NotNull`, phải thuộc quiz đang sửa |

---

## 9. Error Codes mới

Thêm vào `ErrorCode.java`, tạo nhóm `===== QUIZ =====`:

```java
QUIZ_NOT_FOUND    (404, "QUIZ_NOT_FOUND",    "Không tìm thấy quiz"),
QUIZ_ACCESS_DENIED(403, "QUIZ_ACCESS_DENIED", "Không có quyền truy cập quiz này"),
QUIZ_NOT_DRAFT    (400, "QUIZ_NOT_DRAFT",    "Chỉ có thể sửa hoặc publish quiz ở trạng thái DRAFT"),
QUIZ_GENERATE_FAILED(502, "QUIZ_GENERATE_FAILED", "AI Service không thể sinh quiz"),
```

---

## 10. SecurityConfig

Thêm vào `authorizeHttpRequests`, trước `.anyRequest().authenticated()`:

```java
.requestMatchers("/api/v1/quiz/**").hasRole("TEACHER")
```

---

## 11. Logging convention

| Prefix | Layer | Khi nào |
|---|---|---|
| `[QUIZ-CTRL]` | Controller | Nhận request |
| `[QUIZ]` | Service | Bắt đầu xử lý, validate thất bại, hoàn thành |
| `[AI]` | AiServiceClient | Gửi request, nhận kết quả, thất bại |

Mức log:
- `INFO`: nhận request, hoàn thành thành công, kết quả AI.
- `WARN`: validate thất bại (không phải owner, sai state, document không hợp lệ).
- `ERROR`: AI Service lỗi, exception không mong đợi.

Bắt buộc log các field: `userId`, `quizId`, `documentId`, trạng thái liên quan. Không log nội dung câu hỏi đầy đủ.

---

## 12. Response format

Dùng `ApiResponse<T>` có sẵn. Không tạo wrapper mới.

`QuizResponse.questions` luôn được trả về (kể cả `correctOptionIds` và `explanation`) — Teacher cần xem đáp án đúng khi review.

---

## 13. Các điều KHÔNG được làm

- ❌ Controller gọi Repository hoặc AI Service trực tiếp.
- ❌ Tạo endpoint public cho quiz (student dùng data FE cache sau khi publish).
- ❌ Lưu quiz_attempts, quiz_results, thông tin student vào DB.
- ❌ Dùng `Optional.get()` — luôn dùng `.orElseThrow()`.
- ❌ Hardcode URL AI Service — dùng `AiServiceProperties`.
- ❌ Thêm endpoint ngoài 4 endpoint đã định nghĩa ở mục 2.
- ❌ Catch `Exception` chung trong Service — ném `AppException(ErrorCode)` cụ thể.
- ❌ Tạo `@OneToMany` từ `Quiz` sang `QuizQuestion` trong entity.
