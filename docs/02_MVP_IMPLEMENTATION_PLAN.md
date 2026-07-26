# Kế hoạch triển khai MVP document-centric

**Phiên bản:** 2.0
**Cập nhật:** 26/07/2026
**Mục tiêu:** Demo được luồng Teacher upload tài liệu -> AI analyze -> Admin approve -> AI index RAG -> RAG citation/history -> Teacher sinh/publish quiz -> người học làm quiz public

## 1. Scope đã khóa

Core MVP tập trung vào quản lý tài liệu/học liệu cho giảng viên. `Document` là trung tâm.

Không làm trong core MVP:

- Student account/enrollment/lớp học.
- Lưu quiz attempt/result/xếp hạng vào database.
- Gamification.
- Dashboard thống kê phức tạp.
- Teacher tạo Course/Lecture như LMS.
- Bắt buộc chọn Course/Lecture trước khi upload.
- RAG toàn thư viện không giới hạn scope.
- Summary/question generation trong core demo.

Cách tổ chức tài liệu đúng:

```txt
Document
-> metadata: subject, topic, chapter, tags
-> processing_status
-> publication_status
-> chunks/vector
-> Library/RAG
```

Không dùng hướng cũ:

```txt
Course
-> Lecture
-> Document
```

## 2. Luồng demo bắt buộc

```txt
Teacher A login
-> upload PDF/TXT
-> nhập metadata subject/topic/chapter/tags
-> Backend tạo Document + lưu file
-> Backend tự gọi AI Service analyze ở background
-> AI trả can_rag, rag_status
-> Backend cập nhật processing_status = ANALYZED
-> Teacher A submit review
-> Admin approve
-> publication_status = PUBLISHED, processing_status = PROCESSING
-> Document xuất hiện trong Library ngay (song song)
-> Backend tự gọi AI Service index RAG ở background
-> AI parse/clean/chunk/embed và lưu document_chunks
-> Backend cập nhật processing_status = PROCESSED
-> Teacher B login
-> mở Document trong Library
-> hỏi RAG trên document đó (chỉ khi processing_status = PROCESSED)
-> nhận answer + citation đúng nguồn
```

## 3. Current repo snapshot

### Backend hiện có

- Spring Boot project với JWT access token, refresh-token rotation/revoke, logout blacklist và phân quyền Teacher/Admin.
- API hồ sơ cá nhân `GET/PATCH /api/v1/me/profile` và đổi mật khẩu `POST /api/v1/me/change-password`.
- Entity/repository/service/controller cho `Document`, `DocumentProcessingJob`, review, Library và RAG.
- Upload API, My Documents API, Admin review API, Library API, file content/download.
- Backend RAG proxy `POST /api/v1/rag/answer` và conversation endpoints cho resume chat.
- `AiServiceClient` gọi AI Service `/v1/analyze-document`, `/v1/index-document`, `/v1/answer-question`
  và `/v1/generate-quiz`.
- Flyway migrations cho users, documents, jobs, chunks, RAG conversation history và quiz.
- API Teacher sinh/list/xem/sửa/xóa draft/publish quiz, API public lấy quiz đã publish; Backend lưu quiz/câu hỏi và enforce owner + trạng thái DRAFT.
- Admin Teacher management đã có API list/search/filter, tạo đơn lẻ/hàng loạt, cập nhật,
  activate/deactivate và reset mật khẩu.

### Frontend hiện có

- React + Vite app với route/auth guard/API client.
- Các màn chính: Login, Library, Library detail/RAG, My Documents, Upload, My Document detail, Admin Review.
- RAG chat panel đã có load/resume messages, send qua conversation endpoint, clear persisted history, citation UI và not-found state.
- Một số API hồ sơ người dùng như profile/change password cần đồng bộ Backend nếu tiếp tục giữ trong UI.

### AI Service hiện có

- FastAPI base với internal key dependency.
- Storage resolver, file validator, PDF/TXT parser, text cleaning/chunking.
- OpenAI embedding provider và repository lưu chunks vào pgvector.
- `/v1/analyze-document` để đánh giá khả năng RAG.
- `/v1/index-document` để tạo chunks/embedding sau khi Admin approve.
- `/v1/answer-question` để retrieval theo `document_ids`, lọc threshold, dùng grounded LLM generation khi có context, trả citations từ chunk thật.
- Hỗ trợ `history` stateless để trả lời câu hỏi nối tiếp; AI Service không lưu conversation.
- `/v1/generate-quiz` để sinh quiz draft dạng JSON từ chunks đã index, phục vụ Teacher review ở FE.

### Phần còn thiếu đáng chú ý

- AI Service, Backend và Frontend đã nối luồng sinh, lưu, xem, chỉnh sửa draft, xóa draft, publish quiz và mở quiz public qua link.
- Trang public quiz hiện phục vụ làm bài/xem kết quả trên Frontend; MVP chưa lưu attempt/result/xếp hạng vào database.
- Cần chạy lại E2E tích hợp đầy đủ sau mỗi lần pull/build để xác nhận Docker, Backend, FE và AI cùng khớp contract.

## 4. Task graph tổng quan

```txt
DOCS-01
  -> BE-01 -> BE-02 -> BE-03 -> BE-04 -> BE-05 -> BE-06 -> BE-07
          \          \                                  \
           \          -> AI-01 -> AI-02 -> AI-03          -> INT-02
            \                                             /
             -> FE-01 -> FE-02 -> FE-03 -> FE-04 -> FE-05

INFRA-01 chạy sau BE-02 và AI-01.
QA-01 chạy sau BE-07, FE-05, AI-03, INFRA-01.
```

## 5. Quy ước owner

| Vai trò | Thành viên | Phạm vi chính |
|---|---|---|
| Backend | Tâm | Spring Boot, DB migration, auth, upload, review, Library, RAG proxy |
| Frontend | Việt | React UI, route, API client, screens, state, form, UX demo |
| AI | Khánh | AI Service, parser/chunk/embed/retrieval/RAG, AI docs/handoff |
| Integration | Cả nhóm | Docker, shared volume, E2E demo |

Nếu tên thành viên FE cần ghi đầy đủ hơn, sửa lại trực tiếp trong bảng này.

## 6. Bảng tracking tiến độ task

Quy ước trạng thái:

| Trạng thái | Ý nghĩa |
|---|---|
| `DONE` | Đã hoàn thành và có thể dùng cho demo/tích hợp |
| `IN_PROGRESS` | Đang làm, đã có một phần code hoặc docs |
| `TODO` | Chưa bắt đầu theo scope mới |
| `BLOCKED` | Bị chặn bởi task/phản hồi khác |
| `SHOULD_HAVE` | Không chặn core demo, làm nếu còn thời gian |

### 6.1. Backend tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| BE-01 - Migration/database schema | Tâm | P0 | Docs schema | DONE | Đã thêm Flyway dependency; tạo V1, V2, V3 migration; đổi `ddl-auto` sang `validate`; compile + test pass |
| BE-02 - Entity/enum/repository | Tâm | P0 | BE-01 | DONE | Đầy đủ entity `Document`, `DocumentProcessingJob`, enum `ProcessingStatus`/`PublicationStatus`/`DocumentFileType`, `DocumentRepository`, `DocumentProcessingJobRepository`; code compile + test pass |
| BE-03 - Upload Document/shared storage | Tâm | P0 | BE-02 | DONE | Upload API `POST /api/v1/documents` dùng multipart file + JSON metadata; validate file type/size/20MB, TEACHER only, lưu file vào `UPLOAD_ROOT/documents/{id}/v1/source.{ext}`, tạo processing job; đã test Docker upload TXT thành công và AI container đọc được file qua shared volume |
| BE-04 - Auto-processing worker/AI client | Tâm | P0 | BE-03, AI-01 | DONE | Upload xong tự động tạo analyze job, gọi AI Service `POST /v1/analyze-document` bất đồng bộ qua `WebClient`; analyze success -> `processing_status=ANALYZED`; cập nhật `rag_eligible`, `page_count`, `estimated_token_count`, `estimated_chunk_count`, `unsupported_reason`, `analyzed_at`; failure -> `FAILED`; compile + test pass |
| BE-05 - My Documents API | Tâm | P0 | BE-04 | DONE | Đã có list/detail/update/delete/submit-review cho owner; `PATCH /my/documents/{id}` hỗ trợ cập nhật cả metadata và file mới; submit review yêu cầu `processing_status=ANALYZED`; compile + test pass |
| BE-06 - Admin review API | Tâm | P0 | BE-05 | DONE | Review queue/detail/approve/reject/archive; approve -> `publication_status=PUBLISHED` + `processing_status=PROCESSING`, document xuất hiện trong Library ngay lập tức (song song), fire-and-forget gọi AI Service `/v1/index-document`; index xong -> `processing_status=PROCESSED`; Teacher reprocess qua `POST /api/v1/my/documents/{id}/reprocess-rag`; compile + test pass |
| BE-07 - Library API | Tâm | P0 | BE-06 | DONE | Đã có list/detail chỉ trả `PUBLISHED`; hỗ trợ filter `q` (search title/description/subject/topic/chapter), `subject`, `topic`, `chapter`, `tags` (comma-separated, JSONB contains), `uploadedBy`; đã test Teacher B mở `/api/v1/library` và `/api/v1/library/{id}` thành công |
| BE-08 - RAG proxy API | Tâm | P0 | BE-07, AI-03 | DONE | `POST /api/v1/rag/answer` kiểm tra document tồn tại + `processing_status=PROCESSED` + `publication_status=PUBLISHED`, sau đó gọi đồng bộ AI `/v1/answer-question` qua `AiServiceClient`; hỗ trợ `topK`, `language`, `history`; compile + test pass |
| BE-RAG-HIST-01 - Migration cho RAG conversation history | Tâm | P0 | BE-08 | DONE | Flyway migration V7 tạo bảng `rag_conversations` và `rag_messages` với unique constraint `(user_id, document_id)`, index query theo conversation/time; migration chạy được |
| BE-RAG-HIST-02 - Entities, repositories, DTOs | Tâm | P0 | BE-RAG-HIST-01 | DONE | Entity `RagConversation`, `RagMessage`, enum `RagMessageRole`, DTO `RagConversationResponse`, `RagMessageResponse`, `RagSendMessageRequest`, `RagSendMessageResponse`; repository `RagConversationRepository`, `RagMessageRepository`; compile pass |
| BE-RAG-HIST-03 - Conversation service + permission checks | Tâm | P0 | BE-RAG-HIST-02 | DONE | `RagConversationService.getOrCreateConversation`, `getMessages`, `clearMessages` với kiểm tra document `PUBLISHED` + `PROCESSED` và ownership conversation |
| BE-RAG-HIST-04 - Persist send-message flow + AI call | Tâm | P0 | BE-RAG-HIST-03 | DONE | `sendMessage` lưu user message, lấy 6 messages gần nhất làm history, gọi AI `/v1/answer-question`, lưu assistant message + citations + `notFound` + `tokensUsed`; giữ `POST /api/v1/rag/answer` cũ để backward compatibility |
| BE-RAG-HIST-05 - Clear history + tests | Tâm | P0 | BE-RAG-HIST-04 | DONE | `DELETE /api/v1/rag/conversations/{id}/messages` xóa messages và reset counters; unit test `RagConversationServiceTest` 14 cases pass |
| BE-09 - Admin Teacher management | Tâm | P1 | Auth ổn định | DONE | Đã có 7 endpoint dưới `/api/v1/admin/teachers`, phân quyền ADMIN, batch partial success tối đa 200 item và unit test cho service/validation/notification |
| BE-QUIZ-01 - Quiz generation/lifecycle API | Tâm | P1 | BE-07, AI-QUIZ-01 | DONE | Migration V14 tạo `quizzes`/`quiz_questions`; API `/api/v1/quiz/**` cho TEACHER gồm generate/my/get/update/delete draft/publish và public endpoint `/api/v1/quiz/public/{quizId}`; validate document `PUBLISHED + PROCESSED`, gọi AI, lưu full draft, enforce owner/DRAFT, public chỉ trả quiz `PUBLISHED`; backend compile pass |

### 6.2. Frontend tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| FE-01 - App shell/route guard/API client | Việt | P0 | Auth contract | DONE | React/Vite app, API client và route guard đã có |
| FE-02 - Login screen | Việt | P0 | FE-01, Auth API | DONE | Login UI đã nối Backend auth và lưu token/user |
| FE-03 - Library list/filter | Việt | P0 | FE-01, BE-07 | DONE | Library list/filter đã có trong FE |
| FE-04 - Library detail/RAG UI | Việt | P0 | FE-03, BE-08 | DONE | RAG chat UI đã có answer, citations, not-found và resume history |
| FE-RAG-HIST-01 - Conversation API client/types | Việt | P0 | BE-RAG-HIST-03 | DONE | Đã thêm types và `ragService` methods cho get-or-create conversation, send conversation message, clear conversation messages; được dùng bởi FE-RAG-HIST-02/03 |
| FE-RAG-HIST-02 - Load/resume messages | Việt | P0 | FE-RAG-HIST-01 | DONE | `RagChatPanel` load persisted conversation khi document đủ điều kiện RAG, render lại messages/citations/not_found, có loading/error/retry state; `npm run build` pass |
| FE-RAG-HIST-03 - Send qua persisted conversation | Việt | P0 | FE-RAG-HIST-02, BE-RAG-HIST-04 | DONE | `RagChatPanel` gửi câu hỏi qua conversation endpoint mới, dùng response persisted user/assistant messages và không tự build `history` cho BE nữa |
| FE-RAG-HIST-04 - Clear persisted history | Việt | P1 | FE-RAG-HIST-03, BE-RAG-HIST-05 | DONE | Nút clear chat confirm nhẹ, gọi Backend xóa persisted messages, reset UI sau success và giữ messages nếu clear fail |
| FE-RAG-HIST-05 - UX polish/history states | Việt | P1 | FE-RAG-HIST-03 | DONE | Thêm timestamp nhỏ, placeholder/disabled states khi conversation chưa sẵn sàng/đang clear, force scroll xuống cuối sau resume, giữ not_found không hiện citations |
| FE-05 - My Documents list | Việt | P0 | FE-01, BE-05 | DONE | Danh sách tài liệu của Teacher đã có status/filter/action cơ bản |
| FE-06 - Upload Document screen | Việt | P0 | FE-05, BE-03 | DONE | Upload PDF/TXT với metadata, không dùng Course/Lecture select |
| FE-07 - My Document detail | Việt | P0 | FE-05, BE-05 | DONE | Detail tài liệu, action owner, xem/tải file và RAG khi đủ điều kiện |
| FE-08 - Admin review queue | Việt | P0 | FE-01, BE-06 | DONE | Admin review queue đã có UI |
| FE-09 - Admin review detail | Việt | P0 | FE-08, BE-06 | DONE | Admin approve/reject document đã có UI |
| FE-10 - Admin Teacher management | Việt | P1 | BE-09 | DONE | Đã có giao diện quản lý tài khoản giảng viên theo plan MVP: xem danh sách, thông tin giảng viên và thao tác quản trị cơ bản |

### 6.3. AI tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| AI-01 - Align process-document contract v1.4 | Khánh | P0 | Schema contract | DONE | Đã bỏ `lecture_id`, thêm optional metadata, repository insert theo schema mới; Docker test thật đã gọi `/v1/process-document` với `document_id=2`, AI đọc `documents/2/v1/source.txt`, trả `PROCESSED`, `page_count=1`, `chunk_count=1` |
| AI-02 - Retrieval repository theo document_ids | Khánh | P0 | BE-01, AI-01 | DONE | Đã thêm `RetrievedDocumentChunk`, `search_similar_chunks`, query pgvector theo `document_ids`; đã xác nhận `document_chunks` có row thật cho `document_id=2` sau process |
| AI-03 - Answer question endpoint | Khanh | P0 | AI-02 | DONE | Đã có `/v1/answer-question`, embedding retrieval, threshold/not_found và citations; AI-09 đã bổ sung grounded LLM generation sau retrieval. |
| AI-04 - Index document endpoint | Khánh | P0 | AI-01 | DONE | Đã thêm `/v1/index-document` dùng chung `ProcessDocumentService` với legacy `/v1/process-document`; phục vụ flow Admin approve -> index RAG -> lưu `document_chunks` |
| AI-05 - RAG index safety hardening | Khánh | P0 | AI-04 | DONE | Đã map lỗi FK khi document bị xóa trong lúc index thành `DOCUMENT_DELETED_DURING_INDEX`; giữ atomic replace chunks; `pytest tests/test_document_chunk_repository.py` pass 15 tests + 6 subtests |
| AI-06 - RAG retrieval quality threshold | Khánh | P0 | AI-03 | DONE | Thêm `RAG_SIMILARITY_THRESHOLD=0.65`; lọc chunks dưới threshold trước khi compose answer/citation; regression `answer_question + document_chunk + process_document` pass 42 tests + 12 subtests |
| AI-07 - Embedding provider reliability tests | Khánh | P1 | AI-01 | DONE | Bổ sung tests retry nhiều lần, exponential backoff, timeout propagation, connection error mapping và SDK `max_retries=0`; regression nhóm AI chính pass 64 tests + 16 subtests |
| AI-08 - Stateless multi-turn RAG | Khánh | P0 | AI-03, AI-06 | DONE | `/v1/answer-question` nhận optional `history` tối đa 6 messages; AI build retrieval query từ history + current question, không lưu conversation; regression nhóm AI chính pass 67 tests + 16 subtests |
| AI-RAG-HIST-01 - Verify stateless history contract | Khánh | P0 | BE-RAG-HIST-04, AI-08 | DONE | Contract AI đã nhận `history` tối đa 6 messages, không nhận/lưu `conversation_id`; Backend là owner persistence |
| AI-RAG-HIST-02 - History regression tests | Khánh | P1 | AI-RAG-HIST-01 | DONE | Đã có tests cho history hợp lệ/invalid, retrieval query dùng history, retry retrieval bằng current question khi history miss, generation prompt có history |
| AI-RAG-HIST-03 - AI docs handoff update | Khánh | P1 | AI-RAG-HIST-01 | DONE | `04_AI_API_CONTRACT.md`, `06_AI_PIPELINE.md` và `AI_LEARNING_LOG.md` đã mô tả AI stateless, không lưu conversation |

| AI-09 - Grounded LLM answer generation | Khanh | P0 | AI-03, AI-08 | DONE | Current AI-05 working task: added `GenerationProvider` + `OpenAIGenerationProvider`; after retrieval/threshold AI calls `GENERATION_MODEL` for natural grounded answers; no generation call when `not_found`; AI regression pass 81 tests. |
| AI-QUIZ-01 - Quiz draft generation endpoint | Khánh | P1 | AI-04, AI-09 | DONE | Thêm `/v1/generate-quiz` nhận `document_ids`, `question_count`, `language`, lấy chunks đại diện từ `document_chunks`, gọi grounded LLM trả JSON quiz draft `single_choice` kèm explanation và citations thật; AI chỉ sinh draft, không lưu/public/chấm điểm; `pytest tests/test_generate_quiz_api.py tests/test_generation_provider.py` pass 19 tests |

### 6.4. Infra, integration và QA tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| DOCS-01 - Cập nhật docs document-centric | Khánh | P0 | Quyết định scope | DONE | PRD, integration, schema contract, backend DB guide, AI contract, implementation plan đã cập nhật |
| INFRA-01 - Docker/shared volume | Tâm + Khánh | P0 | BE-03, AI-01 | DONE | `docker-compose.yml` đã có `postgres`, `backend`, `ai-service`, `pgadmin`, volume `uploads`; Backend mount `/storage/uploads` read-write, AI mount read-only; đã test cùng một file tồn tại trong cả hai container |
| INT-01 - Backend upload -> AI analyze | Tâm + Khánh | P0 | BE-04, AI-01, INFRA-01 | DONE | Backend upload xong tự gọi AI `POST /v1/analyze-document` qua `WebClient` fire-and-forget; AI đọc file từ shared volume, trả `can_rag` + metadata; BE tự cập nhật `processing_status` và RAG eligibility fields; đã test Docker với PDF thật |
| INT-02 - Review -> Library -> RAG | Cả nhóm | P0 | BE-08, FE-09, AI-03 | DONE | Backend/AI/FE đã có luồng review, library và RAG chat; cần tiếp tục smoke test sau mỗi pull/build |
| INT-RAG-HIST-01 - Resume chat E2E | FE + BE + AI | P0 | BE-RAG-HIST-04, AI-RAG-HIST-01, FE-RAG-HIST-05 | DONE | Đã có Backend persistence, AI stateless history và FE resume/clear; đã manual test reload/tiếp tục hội thoại ổn |
| QA-01 - E2E demo rehearsal | Cả nhóm | P0 | INT-02 | READY_FOR_FINAL_SMOKE | MVP đã nối đủ luồng document/RAG/history/quiz public; cần chạy smoke test cuối và cập nhật sơ đồ/ảnh báo cáo trước khi demo |

### 6.5. Cách cập nhật bảng tracking

Khi hoàn thành một task, người phụ trách cập nhật:

1. Đổi `Trạng thái` sang `IN_PROGRESS`, `DONE` hoặc `BLOCKED`.
2. Ghi ngắn bằng chứng vào `Ghi chú tracking`, ví dụ endpoint đã có, test đã pass, hoặc đang bị chặn bởi task nào.
3. Nếu task đổi contract API/schema, cập nhật docs liên quan trong cùng PR.

### 6.6. Snapshot kiểm thử thực tế 11/07/2026

Môi trường đã kiểm thử:

```txt
docker compose up -d --build ai-service backend
```

Services hoạt động:

```txt
postgres: healthy
backend: up, Flyway validate/migrate OK
ai-service: healthy
```

Các bước đã pass:

1. Backend login bằng seed user `teacher.a@example.com` thành công.
2. Backend upload TXT qua `POST /api/v1/documents` thành công.
3. Snapshot cũ: Document từng tạo với `processing_status=PROCESSING` khi dùng flow process trực tiếp. Flow mới phải là `UPLOADED -> ANALYZING -> ANALYZED` sau upload/analyze.
4. Backend lưu file vào `/storage/uploads/documents/2/v1/source.txt`.
5. AI container đọc được đúng file này qua shared volume read-only.
6. AI `/v1/health` trả `UP`.
7. AI `/v1/health/pgvector` trả `UP`, database `lms_rag`, pgvector `0.8.2`.
8. Gọi trực tiếp AI `POST /v1/process-document` từng trả `PROCESSED`, `page_count=1`, `chunk_count=1`. Trong flow mới, bước này tương ứng index RAG sau Admin approve và nên được expose bằng `/v1/index-document`.
9. Bảng `document_chunks` có row thật cho `document_id=2`.
10. Gọi trực tiếp AI `POST /v1/answer-question` với `document_ids=[2]` trả answer, `not_found=false` và citation thật.
11. Snapshot cũ: review/library từng pass khi set `PROCESSED` thủ công. Flow mới phải submit review ở `ANALYZED`, còn `PROCESSED` chỉ dùng sau khi index RAG xong.

Blocker tại thời điểm snapshot 11/07:

```txt
BE-04 đang cần chốt: Backend upload xong gọi AI `/v1/analyze-document` và cập nhật `ANALYZED/FAILED`.
BE-05 đang cần chốt: submit review phải yêu cầu `ANALYZED`, không yêu cầu `PROCESSED`.
BE-06 chưa hoàn chỉnh: Admin approve cần trigger index RAG (`/v1/index-document`) và cập nhật `PROCESSED/FAILED` sau index.
BE-08 đã có: Backend RAG proxy `/api/v1/rag/answer` kiểm quyền rồi gọi AI Service.
Frontend đã có app React/Vite để chạy demo UI; cần build/test lại sau mỗi lần pull.
```

Ghi chú cập nhật 14/07: các blocker Backend BE-04/05/06/08 ở snapshot này đã được hoàn thành. Trạng thái hiện tại xem bảng tracking mục 6.1 và snapshot 6.8.

Kết luận snapshot:

```txt
AI Service core đã chạy được với database/file thật.
Docker/shared volume đã chạy được.
Backend document/review/library đã chạy được từng phần.
Tại thời điểm 11/07, MVP chưa E2E hoàn chỉnh vì còn thiếu Backend auto-processing worker và RAG proxy.
```

### 6.7. Snapshot kiểm thử thực tế 12/07/2026

Môi trường đã kiểm thử:

```txt
docker compose up -d --build
```

Services hoạt động:

```txt
postgres: healthy
backend: up, Flyway migrate OK
ai-service: healthy
```

Các bước đã pass:

1. Backend login bằng seed user `teacher1@test.com` thành công.
2. Backend upload PDF qua `POST /api/v1/documents` thành công.
3. Document mới tạo có `processing_status=UPLOADED`, sau đó chuyển `ANALYZING`; analyze success phải cập nhật `ANALYZED`, không phải `PROCESSED`.
4. AI Service trả `can_rag=true`, `estimated_chunk_count=263`.
5. BE tự cập nhật `rag_eligible=true`, `page_count`, `estimated_token_count`, `estimated_chunk_count`, `analyzed_at`.
6. `PATCH /api/v1/my/documents/{id}` hỗ trợ cập nhật metadata và file mới; thay file tạo analyze job mới.
7. Library API hỗ trợ filter `q`, `subject`, `topic`, `chapter`, `tags`, `uploadedBy`.

Flow mới đang được cập nhật:

```txt
UPLOADED → ANALYZING → ANALYZED → submit review → PENDING_REVIEW
→ admin approve → PUBLISHED + PROCESSING → index RAG → PROCESSED
→ hỏi RAG / gen quiz
```

Blocker tại thời điểm snapshot 12/07:

```txt
BE-04 đang adjust: analyze success phải cập nhật ANALYZED thay vì PROCESSED.
BE-05 đang adjust: submit review yêu cầu ANALYZED thay vì PROCESSED.
BE-06 đang adjust: approve phải gọi /v1/index-document và cập nhật PROCESSED sau index.
BE-08 đã có: Backend RAG proxy `/api/v1/rag/answer` đã được triển khai.
AI Service đã có `/v1/index-document`; endpoint này reuse logic `/v1/process-document` để index RAG sau Admin approve.
Frontend đã có app React/Vite để chạy demo UI; cần build/test lại sau mỗi lần pull.
```

Ghi chú cập nhật 23/07: BE/AI/FE cho luồng Document -> Review -> Library -> RAG đã có. AI Service
và Backend đã nối luồng `/v1/generate-quiz` -> lưu draft -> Teacher owner xem/sửa/publish. Phần còn
lại nằm ở Frontend gồm UI Teacher review/public và trang làm quiz.

### 6.8. Snapshot kiểm thử thực tế 14/07/2026

Môi trường đã kiểm thử:

```txt
docker compose up -d --build
```

Services hoạt động:

```txt
postgres: healthy
backend: up, Flyway migrate OK
ai-service: healthy
```

Các bước đã pass:

1. Backend login bằng seed user `teacher1@test.com` thành công.
2. Backend upload PDF qua `POST /api/v1/documents` thành công.
3. Document mới tạo có `processing_status=UPLOADED`, sau đó chuyển `ANALYZING`; analyze success cập nhật `ANALYZED`.
4. AI Service trả `can_rag=true`, BE tự cập nhật `rag_eligible=true`, `page_count`, `estimated_token_count`, `estimated_chunk_count`, `analyzed_at`.
5. `PATCH /api/v1/my/documents/{id}` hỗ trợ cập nhật metadata và file mới; thay file tạo analyze job mới.
6. `POST /api/v1/my/documents/{id}/submit-review` yêu cầu `processing_status=ANALYZED`, chuyển sang `PENDING_REVIEW`.
7. `POST /api/v1/admin/reviews/{id}/approve` chuyển sang `PUBLISHED` + `PROCESSING`, document xuất hiện trong Library, đồng thờig fire-and-forget gọi AI `/v1/index-document`.
8. AI `/v1/index-document` xong -> BE cập nhật `processing_status=PROCESSED`.
9. `POST /api/v1/rag/answer` kiểm tra `PUBLISHED` + `PROCESSED`, gọi AI `/v1/answer-question` đồng bộ, trả answer + citations.
10. Backend compile + unit test pass (`./mvnw clean test`).

Blocker còn lại cho core E2E:

```txt
Frontend đã có app React/Vite để chạy demo UI; cần build/test lại sau mỗi lần pull.
BE-09 Admin Teacher management là P1/should-have; theo dõi trong plan riêng và cần đối chiếu code mới nhất trước demo.
```

Kết luận snapshot:

```txt
Backend core MVP document-centric đã hoàn thành: upload -> analyze -> submit review -> approve -> index RAG -> Library -> RAG proxy.
Thiếu Frontend để demo E2E hoàn chỉnh.
```

### 6.9. Lịch sử thay đổi thiết kế Backend (BE-04/05/06/08)

| Task | Thiết kế trước | Thiết kế sau | Lý do thay đổi |
|---|---|---|---|
| **BE-04** | Sau upload, BE gọi AI `/v1/process-document` hoặc `/v1/analyze-document`, cập nhật `processing_status=PROCESSED` | Sau upload, BE gọi AI `/v1/analyze-document`, cập nhật `processing_status=ANALYZED` | Tách biệt analyze (đánh giá) và index (tạo embedding). Không tốn tiền embedding cho tài liệu bị reject. |
| **BE-05** | Submit review yêu cầu `processing_status=PROCESSED` | Submit review yêu cầu `processing_status=ANALYZED` | Theo flow mới, analyze xong là đủ để submit. |
| **BE-06** | Admin approve -> `publication_status=PUBLISHED`, document vào Library. Không có bước index riêng. | Admin approve -> `publication_status=PUBLISHED` + `processing_status=PROCESSING`. Document vào Library **ngay lập tức** (song song). BE gọi AI `/v1/index-document` ở background. Index xong -> `PROCESSED`. | Document có thể hiển thị trong Library sớm mà không cần đợi index RAG xong. RAG question chỉ được khi đã `PROCESSED`. |
| **BE-08** | Hỏi RAG khi `processing_status=PROCESSED` (nghĩa là analyze xong) | Hỏi RAG khi `processing_status=PROCESSED` (nghĩa là **đã index RAG xong**) và `publication_status=PUBLISHED` | Đảm bảo embedding đã được tạo trước khi trả lời. |
| **ProcessingStatus** | `UPLOADED, ANALYZING, PROCESSING, PROCESSED, FAILED` | `UPLOADED, ANALYZING, ANALYZED, PROCESSING, PROCESSED, FAILED` | Thêm `ANALYZED` để phân biệt analyze xong và index xong. |

## 7. Backend implementation plan

### BE-01 - Chuẩn hóa migration/database schema

- TIP-ID: BE-01
- Owner: Tâm
- Priority: P0
- Depends on: `docs/05_DATABASE_SCHEMA_CONTRACT.md`, `docs/07_BACKEND_DATABASE_SCHEMA_GUIDE.md`
- Concurrency: EXCLUSIVE
- Estimate: 0.5-1 ngày

Việc cần làm:

- Chọn cơ chế migration: ưu tiên Flyway.
- Tạo migration theo thứ tự:

```txt
V1__create_users.sql
V2__create_document_mvp.sql
V3__seed_demo_users.sql
```

- Tạo extension pgvector.
- Tạo các bảng core:

```txt
users
documents
document_processing_jobs
document_chunks
```

- Không tạo dependency mới từ `documents` hoặc `document_chunks` sang `courses/lectures`.
- Giữ `courses/lectures/course_members` cũ nếu đang tồn tại trong code, nhưng không dùng trong MVP flow.
- Cân nhắc đổi `spring.jpa.hibernate.ddl-auto=update` sang `validate` sau khi migration ổn.

Acceptance criteria:

- Database sạch chạy migration thành công.
- `document_chunks.embedding` là `VECTOR(1536)`.
- `documents` có metadata `subject`, `topic`, `chapter`, `tags`.
- Không có `lecture_id` hoặc `course_id` trong `documents`/`document_chunks`.
- Có seed 1 Admin và 2 Teacher demo.

Test/check command:

```powershell
cd backend
./mvnw test
```

SQL check:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Handoff cho AI:

- DB có `documents` và `document_chunks`.
- Có ít nhất một `document_id` thật để test insert chunks.
- pgvector extension đã bật.

### BE-02 - Entity/enum/repository cho Document MVP

- TIP-ID: BE-02
- Owner: Tâm
- Priority: P0
- Depends on: BE-01
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Tạo/cập nhật:

```txt
Document
DocumentProcessingJob
ProcessingStatus
PublicationStatus
DocumentFileType
DocumentRepository
DocumentProcessingJobRepository
```

Document fields cần khớp contract:

```txt
id
uploadedBy
title
description
subject
topic
chapter
tags
originalFilename
storedFilename
storageKey
fileVersion
fileType
mimeType
fileSize
processingStatus
publicationStatus
errorCode
errorMessage
processedAt
reviewedBy
reviewedAt
rejectionReason
publishedAt
createdAt
updatedAt
```

Không thêm:

```txt
courseId
lectureId
```

Acceptance criteria:

- Entity map đúng schema.
- Enum dùng string, không dùng ordinal.
- Repository query được theo owner, status và Library.
- Code compile.

### BE-03 - Upload Document và shared storage

- TIP-ID: BE-03
- Owner: Tâm
- Priority: P0
- Depends on: BE-02
- Concurrency: EXCLUSIVE
- Estimate: 1 ngày

Endpoint:

```txt
POST /api/v1/documents
Content-Type: multipart/form-data
Authorization: Bearer <JWT>
```

Request fields:

```txt
file: PDF/TXT
title: required
description: optional
subject: optional
topic: optional
chapter: optional
tags: optional array hoặc comma-separated string
```

Backend xử lý:

1. Xác thực Teacher.
2. Validate file extension/MIME/size, max 20 MB.
3. Tạo Document với:

```txt
processing_status = UPLOADED
publication_status = DRAFT
file_version = 1
```

4. Lưu file dưới:

```txt
UPLOAD_ROOT/documents/{document_id}/v1/source.{extension}
```

5. Lưu `storage_key` dạng relative path:

```txt
documents/{document_id}/v1/source.pdf
```

6. Tạo processing job hoặc publish event để BE-04 xử lý.

Response tối thiểu:

```json
{
  "success": true,
  "data": {
    "id": 12,
    "title": "Bài giảng cơ sở dữ liệu",
    "subject": "Cơ sở dữ liệu",
    "topic": "Chuẩn hóa dữ liệu",
    "chapter": "Chương 3",
    "tags": ["database", "normalization"],
    "processing_status": "UPLOADED",
    "publication_status": "DRAFT",
    "storage_key": "documents/12/v1/source.pdf"
  }
}
```

Acceptance criteria:

- Upload không cần Course/Lecture.
- File được lưu trong shared upload root.
- `storage_key` không phải absolute path.
- File sai loại/quá size trả lỗi rõ.
- Không log JWT, file content, secret.

### BE-04 - Auto-processing worker và AI client

- TIP-ID: BE-04
- Owner: Tâm
- Priority: P0
- Depends on: BE-03, AI-01
- Concurrency: EXCLUSIVE
- Estimate: 1 ngày

Tạo/cập nhật:

```txt
AiServiceClient
DocumentProcessingService
DocumentProcessingEvent
AsyncConfig nếu cần
```

Luồng:

```txt
upload transaction commit
-> TransactionSynchronization.afterCommit
-> set processing_status = ANALYZING
-> POST AI /v1/analyze-document (WebClient async, fire-and-forget)
-> AI success: ANALYZED + rag_eligible + page_count + estimated_token_count + estimated_chunk_count + unsupported_reason + analyzed_at
-> AI fail: FAILED + error_code/error_message
```

AI request theo contract mới:

```json
{
  "document_id": 12,
  "storage_key": "documents/12/v1/source.pdf",
  "file_type": "PDF",
  "metadata": {
    "subject": "Cơ sở dữ liệu",
    "topic": "Chuẩn hóa dữ liệu",
    "chapter": "Chương 3",
    "tags": ["database", "normalization"]
  }
}
```

AI response:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "can_rag": true,
    "rag_status": "SUPPORTED",
    "page_count": 10,
    "estimated_token_count": 4200,
    "estimated_chunk_count": 263,
    "unsupported_reason": null
  }
}
```

Headers:

```txt
X-Internal-Key: <INTERNAL_API_KEY>
```

Acceptance criteria:

- Upload API không bị treo để chờ AI xử lý lâu (fire-and-forget qua WebClient).
- AI success cập nhật `ANALYZED` và các trường RAG eligibility.
- AI lỗi cập nhật `FAILED`.
- Document status ban đầu là `UPLOADED`, sau đó chuyển `ANALYZING` rồi `ANALYZED/FAILED`.
- Không có hai job `ANALYZING` cùng document.
- Không gửi `lecture_id` hoặc `course_id` sang AI.

### BE-05 - My Documents API

- TIP-ID: BE-05
- Owner: Tâm
- Priority: P0
- Depends on: BE-04
- Concurrency: EXCLUSIVE
- Estimate: 0.75 ngày

Endpoints:

```txt
GET    /api/v1/my/documents
GET    /api/v1/my/documents/{documentId}
PATCH  /api/v1/my/documents/{documentId}   (multipart: metadata + optional file)
DELETE /api/v1/my/documents/{documentId}
POST   /api/v1/my/documents/{documentId}/submit-review
```

Note: endpoint `/reprocess` riêng chưa có; thay file trong `PATCH` đã tạo analyze job mới.

Rules:

- Chỉ owner xem được document chưa public của mình.
- Owner sửa metadata khi `DRAFT` hoặc `REJECTED`.
- Owner xóa khi `DRAFT` hoặc `REJECTED`.
- Submit review chỉ khi:

```txt
processing_status = ANALYZED
publication_status = DRAFT hoặc REJECTED
```

- Khi submit review:

```txt
publication_status = PENDING_REVIEW
rejection_reason = null nếu submit lại
```

Reprocess:

- Cho phép khi owner và document không ở `PENDING_REVIEW`.
- Nếu thay file, tăng `file_version` và tạo `storage_key` mới.
- Nếu chỉ reprocess file cũ, giữ `storage_key`.

Acceptance criteria:

- Teacher A không xem/sửa/xóa draft của Teacher B.
- Submit khi chưa `ANALYZED` trả lỗi.
- `REJECTED` có thể sửa metadata và submit lại.
- `PUBLISHED` không cho sửa file trong core MVP.

### BE-06 - Admin review API

- TIP-ID: BE-06
- Owner: Tâm
- Priority: P0
- Depends on: BE-05
- Concurrency: EXCLUSIVE
- Estimate: 0.75 ngày

Endpoints:

```txt
GET  /api/v1/admin/reviews
GET  /api/v1/admin/reviews/{documentId}
POST /api/v1/admin/reviews/{documentId}/approve
POST /api/v1/admin/reviews/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive
```

Rules:

- Chỉ role `ADMIN` gọi được.
- Review queue chỉ lấy `PENDING_REVIEW`.
- Approve chỉ từ `PENDING_REVIEW` sang `PUBLISHED`.
- Reject chỉ từ `PENDING_REVIEW` sang `REJECTED` và bắt buộc `reason`.
- Archive chỉ từ `PUBLISHED` sang `ARCHIVED`.

Khi approve:

```txt
reviewed_by = admin_id
reviewed_at = now
published_at = now
publication_status = PUBLISHED
processing_status = PROCESSING
-> Document xuất hiện trong Library ngay lập tức
-> fire-and-forget gọi AI /v1/index-document ở background
-> index success: processing_status = PROCESSED
-> index fail: processing_status = FAILED
```

Khi reject:

```txt
reviewed_by = admin_id
reviewed_at = now
rejection_reason = reason
publication_status = REJECTED
```

Acceptance criteria:

- Teacher không gọi được admin endpoints.
- Admin approve xong document xuất hiện trong Library ngay lập tức (không đợi index RAG xong).
- Admin approve xong BE tự gọi AI `/v1/index-document` ở background.
- Admin reject xong Teacher owner thấy lý do.
- `ARCHIVED` không còn trong Library.

### BE-07 - Library API

- TIP-ID: BE-07
- Owner: Tâm
- Priority: P0
- Depends on: BE-06
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Endpoints:

```txt
GET /api/v1/library
GET /api/v1/library/{documentId}
```

Query filters:

```txt
q
subject
topic
chapter
tags
uploaded_by
page
limit
```

Rules:

- Chỉ trả `publication_status = PUBLISHED`.
- Không trả `DRAFT`, `PENDING_REVIEW`, `REJECTED`, `ARCHIVED`.
- Detail chỉ mở document `PUBLISHED` cho Teacher khác.
- Owner vẫn nên dùng `/my/documents/{id}` cho tài liệu chưa public.

Acceptance criteria:

- Teacher B thấy tài liệu Teacher A đã publish.
- Teacher B không thấy draft/rejected của Teacher A.
- Filter subject/topic/chapter/tags hoạt động ở mức MVP.

### BE-08 - RAG proxy API

- TIP-ID: BE-08
- Owner: Tâm
- Priority: P0
- Depends on: BE-07, AI-03
- Concurrency: EXCLUSIVE
- Estimate: 0.75 ngày

Endpoint:

```txt
POST /api/v1/rag/answer
```

Request:

```json
{
  "document_ids": [12],
  "question": "Chuẩn hóa dữ liệu là gì?",
  "top_k": 5
}
```

Backend xử lý:

1. Validate request (1-10 document IDs, question không rỗng, top_k từ 3-8).
2. Deduplicate `document_ids`.
3. Kiểm tra từng document:
   - Document phải tồn tại.
   - `publication_status = PUBLISHED`.
   - `processing_status = PROCESSED` (đã index RAG xong).
   - Admin/Teacher đều có quyền hỏi khi thỏa mãn 2 điều kiện trên.
4. Gọi AI `/v1/answer-question` đồng bộ (sync) vì FE đang chờ response.
5. Trả answer/citations về FE.

Acceptance criteria:

- Không gọi AI nếu có document không `PUBLISHED` hoặc chưa `PROCESSED`.
- Không gửi document chưa index RAG sang AI.
- Citation trả về FE giữ đủ `chunk_id`, `document_id`, `page_number`, `chunk_index`, `excerpt`, `score`.
- Response đồng bộ, FE không cần polling.

### BE-09 - Admin Teacher management Should-have

- TIP-ID: BE-09
- Owner: Tâm
- Priority: P1
- Depends on: Auth ổn định
- Concurrency: EXCLUSIVE
- Estimate: 0.5-1 ngày

Endpoints:

```txt
GET  /api/v1/admin/teachers
POST /api/v1/admin/teachers
POST /api/v1/admin/teachers/batch
PATCH /api/v1/admin/teachers/{teacherId}
POST /api/v1/admin/teachers/{teacherId}/activate
POST /api/v1/admin/teachers/{teacherId}/deactivate
POST /api/v1/admin/teachers/{teacherId}/reset-password
```

Rules:

- Chỉ Admin gọi được.
- Không tạo thêm Admin.
- Không đổi role qua UI.
- Deactivate Teacher không xóa documents.
- Create/reset password đều do hệ thống tự sinh mật khẩu tạm; API không nhận hoặc trả plaintext password.
- Create gửi email bất đồng bộ sau commit. Reset hiện trả `emailSent=false` cho đến khi nối luồng gửi email reset.

Acceptance criteria:

- Admin tạo Teacher demo được.
- Teacher bị inactive không login được.
- Không làm ảnh hưởng core upload/review/RAG.

## 8. Frontend implementation plan

### FE-01 - Khởi tạo app shell, route guard, API client

- TIP-ID: FE-01
- Owner: Việt
- Priority: P0
- Depends on: Backend auth contract
- Concurrency: SAFE nếu Backend làm song song
- Estimate: 0.75 ngày

Tạo/cập nhật:

```txt
frontend app React + Vite nếu chưa có
src/main.tsx
src/App.tsx
src/routes
src/api/client.ts
src/auth/AuthProvider.tsx
src/auth/ProtectedRoute.tsx
src/layouts/AppLayout.tsx
```

Routes tối thiểu:

```txt
/login
/library
/library/:documentId
/my-documents
/my-documents/upload
/my-documents/:documentId
/admin/reviews
/admin/reviews/:documentId
/admin/teachers
```

Acceptance criteria:

- Login lưu JWT.
- API client tự gắn `Authorization: Bearer <token>`.
- Teacher không vào admin routes.
- Admin vào được admin routes.
- Không gọi AI trực tiếp từ FE.

### FE-02 - Login screen

- TIP-ID: FE-02
- Owner: Việt
- Priority: P0
- Depends on: FE-01, Backend auth
- Concurrency: SAFE
- Estimate: 0.5 ngày

UI:

- Email input.
- Password input.
- Submit button.
- Loading/error state.

Flow:

```txt
POST /api/v1/auth/login
-> save token/user
-> Teacher redirect /library
-> Admin redirect /admin/reviews hoặc /library
```

Acceptance criteria:

- Sai tài khoản hiển thị lỗi rõ.
- Token hết hạn/401 đưa về login.
- Không hiển thị token trong UI/log.

### FE-03 - Library list và filter

- TIP-ID: FE-03
- Owner: Việt
- Priority: P0
- Depends on: FE-01, BE-07
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/library
```

UI cần có:

- Search box `q`.
- Filter subject/topic/chapter/tags.
- Danh sách document cards/rows.
- Badge subject/status/file type.
- Pagination đơn giản.

API:

```txt
GET /api/v1/library?q=&subject=&topic=&chapter=&tags=&page=&limit=
```

Acceptance criteria:

- Chỉ hiển thị tài liệu published do Backend trả.
- Empty state khi chưa có tài liệu.
- Loading/error state.
- Click document mở `/library/:documentId`.

### FE-04 - Library detail và RAG UI

- TIP-ID: FE-04
- Owner: Việt
- Priority: P0
- Depends on: FE-03, BE-08
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/library/:documentId
```

UI cần có:

- Metadata document: title, description, subject, topic, chapter, tags.
- File info: type, size, uploader, published_at.
- Download/open file button nếu Backend có endpoint file.
- RAG question input.
- Answer panel.
- Citation list.

RAG call:

```txt
POST /api/v1/rag/answer
```

Acceptance criteria:

- Teacher hỏi được trên document đang mở.
- Hiển thị `not_found` tử tế nếu AI không tìm thấy context.
- Citations hiển thị page/chunk/excerpt/score.
- Không cho gửi câu hỏi rỗng.

### FE-05 - My Documents list

- TIP-ID: FE-05
- Owner: Việt
- Priority: P0
- Depends on: FE-01, BE-05
- Concurrency: SAFE
- Estimate: 0.75 ngày

Route:

```txt
/my-documents
```

UI cần có:

- Danh sách tài liệu của Teacher hiện tại.
- Badge `processing_status`.
- Badge `publication_status`.
- Actions theo trạng thái:
  - View detail.
  - Submit review nếu `ANALYZED + DRAFT/REJECTED`.
  - Reprocess nếu failed hoặc cần xử lý lại.
  - Delete nếu được phép.

Acceptance criteria:

- Teacher chỉ thấy tài liệu của mình.
- Status dễ đọc: UPLOADED/ANALYZING/ANALYZED/PROCESSING/PROCESSED/FAILED và DRAFT/PENDING/PUBLISHED/REJECTED/ARCHIVED.
- Submit review disabled khi chưa `ANALYZED`.

### FE-06 - Upload Document screen

- TIP-ID: FE-06
- Owner: Việt
- Priority: P0
- Depends on: FE-05, BE-03
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/my-documents/upload
```

Form:

```txt
file PDF/TXT
title
description
subject
topic
chapter
tags
```

Không có:

```txt
course select
lecture select
```

Flow:

```txt
submit multipart
-> redirect /my-documents/{documentId}
-> detail hiển thị PROCESSING
-> user có thể refresh/poll status
```

Acceptance criteria:

- Upload file PDF/TXT thành công.
- File sai loại/quá size hiển thị lỗi.
- Metadata gửi đúng field mới.
- Không có UI yêu cầu tạo/chọn Course/Lecture.

### FE-07 - My Document detail

- TIP-ID: FE-07
- Owner: Việt
- Priority: P0
- Depends on: FE-05, BE-05
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/my-documents/:documentId
```

UI cần có:

- Metadata + file info.
- Processing status timeline đơn giản.
- Publication status.
- Error message nếu processing failed.
- Rejection reason nếu rejected.
- Edit metadata form khi allowed.
- Submit review button khi allowed.
- Reprocess button khi allowed.

Acceptance criteria:

- `PENDING_REVIEW` không cho sửa file.
- `REJECTED` hiển thị lý do và cho submit lại sau khi sửa.
- `FAILED` hiển thị lỗi xử lý AI.
- Owner có thể hỏi RAG nếu document `PROCESSED` nếu BE hỗ trợ trong same RAG API.

### FE-08 - Admin review queue

- TIP-ID: FE-08
- Owner: Việt
- Priority: P0
- Depends on: FE-01, BE-06
- Concurrency: SAFE
- Estimate: 0.75 ngày

Route:

```txt
/admin/reviews
```

UI cần có:

- List documents `PENDING_REVIEW`.
- Uploader, subject/topic/chapter, submitted time.
- Link detail review.

Acceptance criteria:

- Teacher không vào được.
- Empty state khi không có tài liệu chờ duyệt.
- Click mở `/admin/reviews/:documentId`.

### FE-09 - Admin review detail

- TIP-ID: FE-09
- Owner: Việt
- Priority: P0
- Depends on: FE-08, BE-06
- Concurrency: SAFE
- Estimate: 0.75 ngày

Route:

```txt
/admin/reviews/:documentId
```

UI cần có:

- Document metadata.
- File info/download/open.
- Processing status.
- Approve button.
- Reject button + reason input.

Acceptance criteria:

- Approve chuyển document sang published và quay về queue/list.
- Reject bắt buộc nhập reason.
- Sau approve, document xuất hiện trong Library.

### FE-10 - Admin Teacher management Should-have

- TIP-ID: FE-10
- Owner: Việt
- Priority: P1
- Depends on: BE-09
- Concurrency: SAFE
- Estimate: 0.5-1 ngày

Route:

```txt
/admin/teachers
```

UI tối thiểu:

- List/search Teacher.
- Create Teacher form.
- Activate/deactivate buttons.
- Reset password action.

Acceptance criteria:

- Không có UI tạo Admin.
- Không có UI đổi role.
- Inactive Teacher hiển thị rõ.

## 9. AI implementation plan

### AI-01 - Align process-document contract v1.4

- Owner: Khánh
- Priority: P0
- Depends on: BE schema contract
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Việc cần làm:

- Bỏ `lecture_id` khỏi request/response schema nếu còn.
- Optional `metadata` gồm subject/topic/chapter/tags.
- Repository insert `document_chunks` không insert `lecture_id`.
- Tests cập nhật theo payload mới.

Acceptance criteria:

- `/v1/process-document` nhận payload không có `lecture_id`.
- Process PDF/TXT vẫn tạo chunks/embeddings.
- Unit/API tests pass.

### AI-02 - Retrieval repository theo document_ids

- Owner: Khánh
- Priority: P0
- Depends on: BE-01 schema, AI-01
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày
- Status: DONE

Việc đã làm:

- Thêm model `RetrievedDocumentChunk` cho kết quả retrieval/citation.
- Thêm interface `search_similar_chunks(document_ids, query_embedding, top_k)`.
- Query vector trong `document_chunks` theo `document_ids` bằng pgvector cosine distance.
- Deduplicate `document_ids`, validate `top_k`, vector dimensions và NaN/Infinity trước khi mở DB.
- Trả `chunk_id`, `document_id`, `page_number`, `chunk_index`, `content`, `token_count`, `distance`, `score`.
- Không query toàn Library và không tự kiểm permission trong AI Service.

Acceptance criteria:

- Không rò chunks của document ngoài scope.
- Có mock test với nhiều document.
- `pytest tests/test_document_chunk_repository.py` pass 14 tests.

### AI-03 - Answer question endpoint

- Owner: Khánh
- Priority: P0
- Depends on: AI-02
- Concurrency: EXCLUSIVE
- Estimate: 1 ngày
- Status: DONE

Endpoint:

```txt
POST /v1/answer-question
```

Việc đã làm:

- Thêm schema `AnswerQuestionRequest`, `AnswerQuestionResult`, `AnswerCitation`.
- Thêm service `AnswerQuestionService` để embed câu hỏi, gọi `search_similar_chunks` và format kết quả.
- Thêm route `/v1/answer-question` có `X-Internal-Key` giống các internal API khác.
- Trả `not_found=true` nếu retrieval không có chunk.
- Trả citations dựa trên row thật từ `document_chunks`, không tạo citation giả.
- MVP hiện dùng grounded LLM generation sau retrieval; answer chỉ được sinh từ retrieved chunks và citations thật.

Response có:

```txt
answer
not_found
citations[]
tokens_used
```

Citation fields:

```txt
chunk_id
document_id
page_number
chunk_index
excerpt
score
```

Acceptance criteria:

- Không có context thì `not_found=true`.
- Answer chỉ dựa trên retrieved context.
- Không tạo citation giả.
- Internal key sai trả 401.
- `pytest tests/test_answer_question_api.py tests/test_process_document_api.py tests/test_document_chunk_repository.py` pass 35 tests.
### AI-04 - Index document endpoint

- Owner: Khánh
- Priority: P0
- Depends on: AI-01
- Concurrency: SAFE
- Estimate: 0.25 ngày
- Status: DONE

Endpoint:

```txt
POST /v1/index-document
```

Việc đã làm:

- Thêm route `/v1/index-document` có `X-Internal-Key`.
- Dùng lại `ProcessDocumentRequest`, `ProcessDocumentResult` và `ProcessDocumentService`.
- Không copy pipeline parse/clean/chunk/embed/save.
- Giữ `/v1/process-document` để tương thích code cũ trong giai đoạn chuyển tiếp.

Acceptance criteria:

- `/v1/index-document` trả cùng data contract với `/v1/process-document`.
- Missing/wrong internal key trả `UNAUTHORIZED_INTERNAL_CALL`.
- Unit/API tests pass.

### AI-05 - RAG index safety hardening

- Owner: Khánh
- Priority: P0
- Depends on: AI-04
- Status: DONE

Việc đã làm:

- Giữ atomic replace transaction cho `DELETE old chunks + INSERT new chunks`.
- Bắt riêng PostgreSQL foreign key violation khi Backend đã xóa document trong lúc AI đang index.
- Trả `DOCUMENT_DELETED_DURING_INDEX` HTTP 409 thay vì `DATABASE_ERROR` chung.
- Bổ sung fake DB test đảm bảo rollback và chunks cũ vẫn còn.

Acceptance criteria:

- Insert lỗi không làm mất chunks cũ.
- Document bị xóa giữa lúc index trả lỗi rõ cho Backend.
- `python -m pytest tests/test_document_chunk_repository.py -q` pass.

### AI-06 - RAG retrieval quality threshold

- Owner: Khánh
- Priority: P0
- Depends on: AI-03
- Status: DONE

Việc đã làm:

- Thêm cấu hình `RAG_SIMILARITY_THRESHOLD`, default `0.65`.
- AI Service lọc chunks theo `score >= threshold` sau retrieval.
- Nếu không còn chunk đủ điểm, trả `not_found=true`, `citations=[]`, `tokens_used=0`.
- Bổ sung tests cho below-threshold, at-threshold, not-found tiếng Việt/Anh và citation excerpt.

Acceptance criteria:

- Không trả lời từ chunks score thấp hơn threshold.
- Citation chỉ lấy từ chunks đủ threshold.
- `.env.example` và `docker-compose.yml` có biến cấu hình threshold.

### AI-07 - Embedding provider reliability tests

- Owner: Khánh
- Priority: P1
- Depends on: AI-01
- Status: DONE

Việc đã làm:

- Bổ sung test retry nhiều lần với exponential backoff.
- Kiểm tra timeout được truyền vào mọi request OpenAI embedding.
- Kiểm tra `APIConnectionError` hết retry trả `PROVIDER_UNAVAILABLE`.
- Kiểm tra provider tự tạo OpenAI client với SDK `max_retries=0` để project tự kiểm soát retry.

Acceptance criteria:

- Retry/backoff/timeout có test mock, không gọi OpenAI thật.
- Lỗi tạm thời map về `PROVIDER_UNAVAILABLE`, lỗi không tạm thời không retry và map về `EMBEDDING_ERROR`.

### AI-08 - Stateless multi-turn RAG

- Owner: Khánh
- Priority: P0
- Depends on: AI-03, AI-06
- Status: DONE

Việc đã làm:

- Thêm schema `ConversationMessage` và optional `history` vào `AnswerQuestionRequest`.
- Giới hạn history tối đa 6 messages, role `user` hoặc `assistant`.
- AI build retrieval query từ history + current question khi có history.
- Không lưu conversation trong AI Service; mỗi request tự mang context.
- Cập nhật `04_AI_API_CONTRACT.md` và `06_AI_PIPELINE.md`.

Acceptance criteria:

- Request cũ không có `history` vẫn hoạt động.
- Request có `history` dùng history trong query embedding.
- Invalid history trả `INVALID_INPUT`.
- Regression nhóm AI chính pass.

## 10. Infra/Docker/shared volume

### INFRA-01 - Docker compose tích hợp Backend + AI + PostgreSQL

- Owner: Tâm + Khánh
- Priority: P0
- Depends on: BE-03, AI-01
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Cần có:

```txt
postgres
backend
ai-service
frontend optional
pgadmin optional
uploads named volume
```

Mount:

```txt
backend:/storage/uploads read-write
ai-service:/storage/uploads read-only
```

Env:

```txt
UPLOAD_ROOT=/storage/uploads
AI_SERVICE_BASE_URL=http://ai-service:8000
INTERNAL_API_KEY=dev-internal-secret
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
MAX_FILE_SIZE_MB=20
```

Acceptance criteria:

- Backend container lưu file vào uploads.
- AI container đọc được file đó bằng `storage_key`.
- Backend gọi được AI bằng service name.
- PostgreSQL có pgvector.

## 11. Backend public API contract tối thiểu

### Auth

```txt
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/refresh/revoke
GET  /api/v1/auth/me
POST /api/v1/auth/logout
GET  /api/v1/me/profile
PATCH /api/v1/me/profile
POST /api/v1/me/change-password
```

Login response nên có:

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "tokenType": "Bearer",
    "accessTokenExpiresInSeconds": 3600,
    "refreshTokenExpiresAt": "2026-08-22T10:00:00Z",
    "user": {
      "id": 2,
      "email": "teacher.a@example.com",
      "name": "Teacher A",
      "role": "TEACHER"
    }
  },
  "message": "Đăng nhập thành công"
}
```

### Documents

```txt
POST   /api/v1/documents
GET    /api/v1/my/documents
GET    /api/v1/my/documents/{documentId}
PATCH  /api/v1/my/documents/{documentId}   (multipart: metadata + optional file)
DELETE /api/v1/my/documents/{documentId}
POST   /api/v1/my/documents/{documentId}/submit-review
POST   /api/v1/my/documents/{documentId}/reprocess-rag
GET    /api/v1/documents/{documentId}/content
GET    /api/v1/documents/{documentId}/download
```

### Admin

```txt
GET  /api/v1/admin/reviews
GET  /api/v1/admin/reviews/{documentId}
POST /api/v1/admin/reviews/{documentId}/approve
POST /api/v1/admin/reviews/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive
GET  /api/v1/admin/teachers
POST /api/v1/admin/teachers
POST /api/v1/admin/teachers/batch
PATCH /api/v1/admin/teachers/{teacherId}
POST /api/v1/admin/teachers/{teacherId}/activate
POST /api/v1/admin/teachers/{teacherId}/deactivate
POST /api/v1/admin/teachers/{teacherId}/reset-password
```

### Library/RAG

```txt
GET  /api/v1/library
GET  /api/v1/library/{documentId}
POST /api/v1/rag/answer
GET  /api/v1/rag/conversations/by-document/{documentId}
POST /api/v1/rag/conversations/{conversationId}/messages
GET  /api/v1/rag/conversations/{conversationId}/messages
DELETE /api/v1/rag/conversations/{conversationId}/messages
```

### Quiz

```txt
POST  /api/v1/quiz/generate
GET   /api/v1/quiz/{quizId}
PATCH /api/v1/quiz/{quizId}
POST  /api/v1/quiz/{quizId}/publish
```

`/api/v1/quiz/**` chỉ dành cho `TEACHER`. Generate yêu cầu document `PUBLISHED + PROCESSED` và
trả `201`; xem/sửa/publish chỉ dành cho owner, trong đó sửa/publish yêu cầu quiz còn `DRAFT`.

### DocumentView DTO

```json
{
  "id": 12,
  "title": "Bài giảng cơ sở dữ liệu",
  "description": "Tài liệu nhập môn",
  "subject": "Cơ sở dữ liệu",
  "topic": "Chuẩn hóa dữ liệu",
  "chapter": "Chương 3",
  "tags": ["database", "normalization"],
  "file_type": "PDF",
  "file_size": 1200000,
  "storage_key": "documents/12/v1/source.pdf",
  "processing_status": "PROCESSED",
  "publication_status": "PUBLISHED",
  "rag_eligible": true,
  "page_count": 10,
  "estimated_token_count": 4200,
  "estimated_chunk_count": 263,
  "unsupported_reason": null,
  "analyzed_at": "2026-07-07T09:35:00Z",
  "uploaded_by": 2,
  "uploader_name": "Teacher A",
  "reviewed_by": 1,
  "reviewer_name": "Admin",
  "reviewed_at": "2026-07-07T10:00:00Z",
  "published_at": "2026-07-07T10:00:00Z",
  "created_at": "2026-07-07T09:30:00Z"
}
```

## 12. Permission matrix

| Publication status | Owner Teacher | Teacher khác | Admin |
|---|---|---|---|
| `DRAFT` | Xem/sửa/xóa/reprocess/submit nếu `ANALYZED`, RAG nếu `PROCESSED` | Không | Không cần |
| `PENDING_REVIEW` | Xem | Không | Xem/approve/reject |
| `PUBLISHED` | Xem/RAG | Xem/RAG | Xem/archive |
| `REJECTED` | Xem lý do/sửa/xóa/reprocess/submit lại | Không | Xem |
| `ARCHIVED` | Xem lịch sử | Không | Xem |

## 13. Test gates bắt buộc

Backend:

```powershell
cd backend
./mvnw test
```

AI:

```powershell
cd ai-service
pytest
python scripts/check_pgvector.py
```

Frontend:

```powershell
cd frontend
npm run build
npm test
```

Docker/E2E:

```powershell
docker compose up -d postgres backend ai-service
```

Manual E2E checklist:

- [ ] Teacher A login.
- [ ] Teacher A upload PDF/TXT không chọn Course/Lecture.
- [ ] Document có metadata subject/topic/chapter/tags.
- [ ] Backend gọi AI analyze và document chuyển `ANALYZED`.
- [ ] `document_chunks` có rows theo `document_id`.
- [ ] Teacher A submit review khi document `ANALYZED`.
- [ ] Admin approve.
- [ ] Teacher B thấy document trong Library.
- [ ] Teacher B hỏi RAG và nhận citation.
- [ ] Teacher B không thấy draft/rejected của Teacher A.

## 14. Handoff checklist giữa thành viên

### Backend -> AI

- [ ] DB có bảng `documents` và `document_chunks` theo schema v1.5.
- [ ] `document_chunks` không có `lecture_id`.
- [ ] Shared file tồn tại trong uploads.
- [ ] `storage_key` đúng format `documents/{id}/v1/source.pdf`.
- [ ] Backend gửi payload AI không có `lecture_id`.
- [ ] `INTERNAL_API_KEY` thống nhất.

### AI -> Backend

- [ ] `/v1/index-document` hoặc legacy `/v1/process-document` trả `document_id`, `status`, `page_count`, `chunk_count`.
- [x] `/v1/answer-question` trả `answer`, `not_found`, `citations`.
- [ ] Error codes theo contract.
- [ ] Retrieval chỉ theo `document_ids`.

### Backend -> Frontend

- [ ] Auth endpoints ổn định.
- [ ] DocumentView DTO thống nhất.
- [ ] Upload endpoint không yêu cầu Course/Lecture.
- [ ] Status transition rõ ràng.
- [ ] Error response đủ để FE hiển thị.

### Frontend -> Backend

- [ ] FE gửi đúng field metadata mới.
- [ ] FE không gửi `course_id` hoặc `lecture_id`.
- [ ] FE không gọi AI trực tiếp.
- [ ] FE có screenshot/recording demo nếu cần báo cáo.

## 15. Thứ tự làm trong 7 ngày

### Ngày 1

- BE-01: migration/schema.
- BE-02: entity/repository.
- FE-01: app shell/API client/route guard.
- AI-01: align contract bỏ `lecture_id`.

### Ngày 2

- BE-03: upload/shared storage.
- BE-04: AI client/background worker.
- FE-02: login.
- FE-06: upload screen bắt đầu.

### Ngày 3

- BE-05: My Documents.
- FE-05: My Documents list.
- FE-07: My Document detail.
- INFRA-01: Docker shared volume lần 1.

### Ngày 4

- BE-06: Admin review.
- FE-08/FE-09: Admin review UI.
- AI-02: retrieval repository.

### Ngày 5

- BE-07: Library.
- BE-08: RAG proxy.
- FE-03/FE-04: Library + RAG UI.
- AI-03: answer-question endpoint.

### Ngày 6

- Tích hợp E2E.
- Fix lỗi status/permission/storage.
- Kiểm tra citation.
- Chuẩn bị dữ liệu demo.

### Ngày 7

- Chạy demo rehearsal.
- Ghi lại lỗi còn lại.
- Chốt scope Should-have nào bỏ.
- Chuẩn bị báo cáo tiến độ.

## 16. Thứ tự commit/branch đề xuất

Branch:

```txt
feature/document-centric-backend
feature/document-centric-frontend
feature/document-centric-ai
feature/document-centric-integration
```

Commit order gợi ý:

```txt
docs: expand document centric implementation plan
feat(backend): add document mvp migration
feat(backend): add document upload and processing worker
feat(ai): align document processing contract
feat(ai): add document retrieval and rag answer
feat(backend): add review library and rag proxy
feat(frontend): add auth and document routes
feat(frontend): add upload library review and rag screens
test(e2e): verify document publication and rag citation
```

## 17. Definition of Done

MVP đạt khi:

- Không còn bước bắt buộc tạo/chọn Course/Lecture trong demo.
- Teacher upload tài liệu và gắn metadata.
- AI tự động analyze tài liệu sau upload.
- Chunks/vector được lưu theo `document_id`.
- Teacher submit review được sau khi `ANALYZED`.
- Admin approve được.
- Document published xuất hiện trong Library.
- Teacher khác hỏi RAG trên document và nhận citation.
- Backend/AI/Frontend có test hoặc manual test evidence tối thiểu.
