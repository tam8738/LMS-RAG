# Information Architecture & Routes

## Public

- `/login`

Không có sign up, forgot password, social login hoặc landing page dài.

## Teacher

- `/library`
- `/library/:documentId`
- `/my-documents`
- `/my-documents/upload`
- `/my-documents/:documentId`
- `/ai-chat` nếu dùng màn độc lập
- `/profile` nếu cần

## Admin

- `/library`
- `/library/:documentId`
- `/admin/reviews`
- `/admin/reviews/:documentId`
- `/admin/teachers` chỉ là Should-have
- `/profile` nếu cần

Admin không có My Documents hoặc Upload.

## Primary navigation

### Teacher

- Library
- My Documents
- Upload
- AI Chat
- Account menu / Logout

### Admin

- Library
- Reviews
- Teachers (optional)
- Account menu / Logout

Ưu tiên top header hiện đại. Không tạo sidebar phức tạp nếu không cần.

## Shared screen

`DocumentDetailPage` có thể dùng chung cho Library và My Documents, phân biệt bằng:

- `isOwner`
- `isAdminReview`
- trạng thái;
- quyền thao tác.

## Behavior

- Header sticky nhẹ.
- Active state rõ.
- Breadcrumb chỉ dùng ở detail/upload/review.
- Mobile nav chuyển thành drawer/menu.
- Footer tối giản.
