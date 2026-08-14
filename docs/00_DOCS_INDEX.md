# Bộ tài liệu chính thức của dự án

**Phiên bản:** 1.8
**Cập nhật:** 26/07/2026
**Đối tượng đọc:** Frontend, Backend, AI Service

## 1. Mục đích

Đây là mục lục dùng chung của bộ tài liệu dự án. Mỗi file sở hữu một nhóm quyết định riêng để tránh lặp, tránh mâu thuẫn và giúp thành viên mới đọc đúng thứ tự.

Khi tài liệu và code không thống nhất, cần ưu tiên kiểm tra code thực tế, sau đó cập nhật lại file contract/plan tương ứng.

## 2. Thứ tự đọc khuyến nghị

1. `01_PROJECT_PRD.md`: phạm vi, actor, nghiệp vụ và tiêu chí hoàn thành.
2. `02_MVP_IMPLEMENTATION_PLAN.md`: task graph, tracking, public API tối thiểu, test gate và thứ tự thực hiện.
3. `03_BE_AI_INTEGRATION.md`: ranh giới Backend - AI Service, shared storage, status và internal API.
4. `04_AI_API_CONTRACT.md`: endpoint, request, response và error giữa Backend và AI Service.
5. `05_DATABASE_SCHEMA_CONTRACT.md`: schema database của MVP document-centric.
6. `07_BACKEND_DATABASE_SCHEMA_GUIDE.md`: hướng dẫn migration database chi tiết cho Backend.
7. `06_AI_PIPELINE.md`: parse, clean, chunk, embedding, retrieval, grounded answer, citation và quiz generation.
8. `08_SYSTEM_DESIGN.md`: kiến trúc, luồng dữ liệu, API, database, security và scope triển khai.
9. `API_ROLES.md`: tổng hợp Backend API `/api/v1/**`, method, path và role.
10. `13_RAG_CHAT_HISTORY_RESUME_PLAN.md`: lưu lịch sử hỏi đáp, resume chat và clear history.
11. `BE09_TEACHER_MANAGEMENT_DESIGN.md`: contract đã triển khai cho API Admin quản lý tài khoản Teacher.
12. `15_QUIZ_API_BACKEND_SPEC.md`: contract quiz generate/list/get/update/delete draft/publish và public quiz link.
13. `17_BACKEND_API_FUNCTIONAL_REFERENCE.md`: mô tả chức năng chi tiết cho từng API backend theo source code hiện tại.
14. `../PROJECT_PROGRESS_REPORT.md`: báo cáo tiến độ tổng hợp để gửi giáo viên hướng dẫn.

## 3. Quyết định đã khóa

- `Document` là trung tâm của hệ thống.
- Giảng viên là actor chính trong luồng quản lý tài liệu, RAG và quiz.
- Admin kiểm duyệt/công bố tài liệu và quản lý tài khoản Teacher ở mức cơ bản.
- Sinh viên/người học chỉ tham gia MVP qua link quiz public; không cần tài khoản Student.
- `subject`, `topic`, `chapter`, `tags` chỉ là metadata của Document.
- Không bắt Teacher tạo Course/Lecture trước khi upload.
- Upload tự động kích hoạt AI analyze.
- Admin approve kích hoạt AI index RAG.
- Dùng hai trạng thái riêng: `processing_status` và `publication_status`.
- `storage_key` có version: `documents/{document_id}/{version}/source.{extension}`.
- RAG nhận `document_ids`; AI không tự kiểm quyền và không retrieval toàn thư viện trong MVP.
- Backend là source of truth cho RAG conversation history; AI Service chỉ nhận `history` stateless.
- Grounded LLM answer chỉ được sinh sau khi retrieval có context phù hợp.
- AI Service sinh quiz draft từ chunks thật; Backend/Frontend quản lý review, publish, link public và làm quiz.
- MVP chưa lưu attempt/result/xếp hạng quiz vào database và chưa chấm quiz phía server.

## 4. Thứ tự ưu tiên khi có xung đột

1. `01_PROJECT_PRD.md` quyết định phạm vi và nghiệp vụ.
2. `04_AI_API_CONTRACT.md` quyết định payload HTTP Backend - AI.
3. `05_DATABASE_SCHEMA_CONTRACT.md` quyết định database schema.
4. `03_BE_AI_INTEGRATION.md` quyết định ownership và kiến trúc tích hợp.
5. `06_AI_PIPELINE.md` quyết định thuật toán AI.
6. `API_ROLES.md` tổng hợp endpoint và role truy cập Backend.
7. `15_QUIZ_API_BACKEND_SPEC.md` quyết định chi tiết triển khai API Backend cho quiz.
8. `02_MVP_IMPLEMENTATION_PLAN.md` quyết định tracking và thứ tự thi công.
9. Code thực tế là nguồn kiểm chứng cuối cùng khi cần báo cáo tiến độ.

## 5. Tài liệu legacy hoặc không phải contract

Các file học tập, ghi chú cá nhân, báo cáo cũ hoặc test-case theo scope cũ không dùng làm nguồn triển khai chính. Nếu cần giữ lại để tham khảo, file phải ghi rõ trạng thái legacy.

Ví dụ: `AI_LEARNING_LOG.md`, `LMS-RAG-Backend-Test-Cases.md`, `BACKEND_CHANGES_*.md`, `frontend/TODO_DEVELOPMENT_PLAN.md`.

## 6. Quy trình thay đổi docs

1. Xác định file canonical bị ảnh hưởng.
2. Cập nhật đúng file sở hữu quyết định đó.
3. Nếu thay đổi ảnh hưởng API/schema/flow, cập nhật thêm plan hoặc index liên quan.
4. Không copy dài nội dung giữa nhiều file; ưu tiên link qua file chính.
5. Review docs cùng code hoặc cập nhật docs ngay sau khi code đổi.