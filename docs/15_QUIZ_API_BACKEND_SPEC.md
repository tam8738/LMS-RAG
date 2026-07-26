# Quiz API - Backend Specification

**Trạng thái:** Đã triển khai cho MVP
**Phiên bản:** 1.2
**Cập nhật:** 26/07/2026
**Migration:** `V14__create_quiz_tables.sql`
**Owner:** Backend
**Liên quan:** `docs/API_ROLES.md`, `docs/04_AI_API_CONTRACT.md`, `docs/05_DATABASE_SCHEMA_CONTRACT.md`

## 1. Tổng quan

Backend quản lý vòng đời quiz được sinh từ tài liệu đã index. AI Service chỉ sinh nội dung quiz draft từ chunks thật; Backend kiểm tra quyền, validate response, lưu vào `quizzes`/`quiz_questions` và cung cấp API cho Frontend.

Luồng MVP hiện tại:

1. Teacher chọn document `PUBLISHED + PROCESSED` và yêu cầu sinh quiz.
2. Backend gọi AI Service `POST /v1/generate-quiz`.
3. Backend lưu quiz ở trạng thái `DRAFT`.
4. Teacher xem danh sách quiz của mình, review/chỉnh sửa, có thể xóa draft hoặc publish.
5. Khi publish, quiz chuyển sang `PUBLISHED` và có thể mở qua link `/quiz/public/{quizId}` ở Frontend.
6. Người học mở link public, làm bài và xem kết quả ngay trên trang.

MVP hiện chưa lưu attempt/result/xếp hạng vào database và chưa chấm điểm phía server. Trang public hiện dùng dữ liệu quiz trả về để chấm kết quả ở Frontend.

## 2. Endpoints & phân quyền

| Method | Endpoint | Role | Ghi chú |
|---|---|---|---|
| `GET` | `/api/v1/quiz/my` | `TEACHER` | Lấy danh sách quiz do Teacher hiện tại tạo, dữ liệu từ DB |
| `POST` | `/api/v1/quiz/generate` | `TEACHER` | Sinh quiz từ document đã `PUBLISHED + PROCESSED` |
| `GET` | `/api/v1/quiz/{quizId}` | `TEACHER` | Chỉ owner xem được |
| `PATCH` | `/api/v1/quiz/{quizId}` | `TEACHER` | Chỉ owner, quiz phải là `DRAFT` |
| `DELETE` | `/api/v1/quiz/{quizId}` | `TEACHER` | Chỉ owner, quiz phải là `DRAFT` |
| `POST` | `/api/v1/quiz/{quizId}/publish` | `TEACHER` | Chỉ owner, quiz phải là `DRAFT` |
| `GET` | `/api/v1/quiz/public/{quizId}` | `PUBLIC` | Chỉ trả quiz `PUBLISHED` |

`SecurityConfig` phải khai báo public matcher trước matcher `/api/v1/quiz/**`:

```java
.requestMatchers(HttpMethod.GET, "/api/v1/quiz/public/*").permitAll()
.requestMatchers("/api/v1/quiz/**").hasRole("TEACHER")
```

`JwtAuthenticationFilter` bỏ qua `/api/v1/quiz/public/` để người học mở link bằng trình duyệt không đăng nhập hoặc có stale token vẫn truy cập được endpoint public.

## 3. Quy tắc service

- `generate`: không check document owner; mọi Teacher có thể sinh quiz từ document `PUBLISHED + PROCESSED`; lưu `created_by = currentUser`.
- `listMyQuizzes`: chỉ trả quiz do Teacher hiện tại tạo.
- `getQuiz`, `updateQuiz`, `deleteQuiz`, `publishQuiz`: check owner, sai owner trả `QUIZ_ACCESS_DENIED`.
- `updateQuiz`, `deleteQuiz`, `publishQuiz`: chỉ cho quiz `DRAFT`, sai trạng thái trả `QUIZ_NOT_DRAFT`.
- `getPublicQuiz`: chỉ trả quiz `PUBLISHED`, sai trạng thái trả `QUIZ_NOT_PUBLISHED`.

Điều kiện sinh quiz: document tồn tại, `publicationStatus=PUBLISHED`, `processingStatus=PROCESSED`; nếu không hợp lệ thì không gọi AI Service.

## 4. State transition quiz

```txt
DRAFT --[PATCH]--> DRAFT        được sửa nhiều lần
DRAFT --[DELETE]--> removed     được xóa hẳn khi còn draft
DRAFT --[publish]--> PUBLISHED  được công bố
PUBLISHED --[PATCH/DELETE/publish]--> QUIZ_NOT_DRAFT
```

Không có chuyển ngược từ `PUBLISHED` về `DRAFT` trong MVP.

## 5. Database schema

Bảng `quizzes` lưu metadata quiz, owner, document nguồn, trạng thái `DRAFT/PUBLISHED`, số câu, ngôn ngữ, token usage và thời điểm publish.

Bảng `quiz_questions` lưu câu hỏi, options JSON, correct option IDs, explanation và citations JSON. Xóa quiz thì cascade xóa câu hỏi.

Các bảng `quiz_attempts`, `quiz_results`, ranking/student profile chưa thuộc MVP hiện tại.

## 6. DTO và response

Frontend-facing DTO nằm trong `dto/quiz/`, dùng camelCase. AI-facing DTO nằm trong `dto/ai/`, map snake_case của AI Service bằng `@JsonProperty`.

`QuizResponse` hiện luôn trả `questions`, gồm cả `options`, `correctOptionIds`, `explanation` và `citations`.

Lý do: Teacher cần xem đáp án đúng khi review; trang public MVP chấm điểm ở Frontend. Nếu sau này muốn bảo mật hơn, cần tách `PublicQuizResponse` không chứa đáp án đúng trước submit và thêm submit endpoint để Backend chấm điểm.

## 7. Error codes

```java
QUIZ_NOT_FOUND        (404, "QUIZ_NOT_FOUND", "Không tìm thấy quiz"),
QUIZ_ACCESS_DENIED    (403, "QUIZ_ACCESS_DENIED", "Không có quyền truy cập quiz này"),
QUIZ_NOT_DRAFT        (400, "QUIZ_NOT_DRAFT", "Chỉ có thể sửa, xóa hoặc publish quiz ở trạng thái DRAFT"),
QUIZ_NOT_PUBLISHED    (404, "QUIZ_NOT_PUBLISHED", "Quiz chưa được công bố"),
QUIZ_GENERATE_FAILED  (502, "QUIZ_GENERATE_FAILED", "AI Service không thể sinh quiz"),
```

## 8. Những điều không thuộc MVP hiện tại

- Không lưu `quiz_attempts`, `quiz_results`, thông tin Student vào DB.
- Không xếp hạng sinh viên/lượt làm bài.
- Không chấm điểm phía server.
- Không tách DTO public để ẩn đáp án trước submit.
- Không tạo quiz từ document chưa `PUBLISHED + PROCESSED`.
- Không cho sửa/xóa quiz đã `PUBLISHED`.
- Không cho AI Service ghi bảng quiz hoặc tự tạo public URL.

## 9. Test/smoke cần có trước demo

- Teacher sinh quiz từ document `PUBLISHED + PROCESSED`.
- Teacher thấy quiz trong `/api/v1/quiz/my` và màn quản lý quiz.
- Teacher sửa draft, xáo trộn đáp án nếu cần, lưu draft.
- Teacher publish quiz.
- Mở `/quiz/public/{quizId}` ở trình duyệt không đăng nhập vẫn tải được quiz đã publish.
- Quiz draft hoặc quiz không tồn tại không mở được qua public endpoint.
- Delete chỉ hoạt động với quiz `DRAFT` của owner.