package com.lmsrag.backend.exception;

import lombok.Getter;

/**
 * Danh sách tất cả mã lỗi nghiệp vụ trong hệ thống.
 * Mỗi mã lỗi gồm HTTP status code, mã lỗi riêng (code) và message mặc định,
 * được dùng làm "code" và "message" trong {@code ApiResponse.ErrorInfo}.
 *
 * Quy ước đặt tên: <ENTITY>_<LY_DO>, vd: EMAIL_REQUIRED, COURSE_NOT_FOUND.
 * Lưu ý: KHÔNG khai báo mã thành công ở đây — response thành công dùng
 * {@code ApiResponse.success(...)} với message truyền trực tiếp tại Controller.
 */
@Getter
public enum ErrorCode {

    // =========================================================
    // ===== AUTH =====
    // =========================================================
    UNAUTHENTICATED(401, "UNAUTHENTICATED", "Chưa đăng nhập"),
    UNAUTHORIZED(403, "UNAUTHORIZED", "Không có quyền truy cập"),
    FORBIDDEN(403, "FORBIDDEN", "Truy cập bị từ chối"),
    INVALID_CREDENTIALS(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng"),
    INVALID_TOKEN(401, "INVALID_TOKEN", "Token không hợp lệ"),
    INVALID_REFRESH_TOKEN(401, "INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ hoặc đã hết hạn"),
    ACCOUNT_INACTIVE(403, "ACCOUNT_INACTIVE", "Tài khoản đã bị vô hiệu hóa"),

    // =========================================================
    // ===== USER =====
    // =========================================================
    EMAIL_REQUIRED(400, "EMAIL_REQUIRED", "Email không được để trống"),
    EMAIL_INVALID(400, "EMAIL_INVALID", "Email không hợp lệ"),
    EMAIL_EXISTED(400, "EMAIL_EXISTED", "Email đã tồn tại"),
    USER_EMAIL_DUPLICATED(400, "USER_EMAIL_DUPLICATED", "Email đã được sử dụng"),
    PASSWORD_REQUIRED(400, "PASSWORD_REQUIRED", "Mật khẩu không được để trống"),
    PASSWORD_WEAK(400, "PASSWORD_WEAK", "Mật khẩu quá yếu"),
    CURRENT_PASSWORD_INCORRECT(400, "CURRENT_PASSWORD_INCORRECT", "Mật khẩu hiện tại không đúng"),
    PASSWORD_CONFIRMATION_MISMATCH(400, "PASSWORD_CONFIRMATION_MISMATCH", "Xác nhận mật khẩu không khớp"),
    NEW_PASSWORD_SAME_AS_CURRENT(400, "NEW_PASSWORD_SAME_AS_CURRENT", "Mật khẩu mới phải khác mật khẩu hiện tại"),

    NAME_REQUIRED(400, "NAME_REQUIRED", "Tên không được để trống"),

    ROLE_REQUIRED(400, "ROLE_REQUIRED", "Vai trò không được để trống"),
    ROLE_NOT_FOUND(404, "ROLE_NOT_FOUND", "Không tìm thấy vai trò"),

    USER_NOT_FOUND(404, "USER_NOT_FOUND", "Không tìm thấy ngườI dùng"),
    USER_UPDATE_FAILED(400, "USER_UPDATE_FAILED", "Cập nhật ngườI dùng thất bại"),
    USER_DELETE_FAILED(400, "USER_DELETE_FAILED", "Xóa ngườI dùng thất bại"),
    PROFILE_NO_CHANGES(400, "PROFILE_NO_CHANGES", "Không có thông tin hồ sơ nào để cập nhật"),

    // =========================================================
    // ===== TEACHER ADMIN =====
    // =========================================================
    TEACHER_NOT_FOUND(404, "TEACHER_NOT_FOUND", "Không tìm thấy giảng viên"),
    TEACHER_EMAIL_ALREADY_EXISTS(409, "TEACHER_EMAIL_ALREADY_EXISTS", "Email đã được đăng ký"),
    INVALID_TEACHER_ROLE(400, "INVALID_TEACHER_ROLE", "Endpoint này chỉ cho phép tạo tài khoản giảng viên"),
    TEACHER_ALREADY_ACTIVE(400, "TEACHER_ALREADY_ACTIVE", "Giảng viên đang ở trạng thái hoạt động"),
    TEACHER_ALREADY_INACTIVE(400, "TEACHER_ALREADY_INACTIVE", "Giảng viên đang ở trạng tháI không hoạt động"),
    TEACHER_BATCH_LIMIT_EXCEEDED(400, "TEACHER_BATCH_LIMIT_EXCEEDED", "Số lượng giảng viên trong batch vượt quá giới hạn"),

    // =========================================================
    // ===== DOCUMENT =====
    // =========================================================
    DOCUMENT_NOT_FOUND(404, "DOCUMENT_NOT_FOUND", "Không tìm thấy tài liệu"),
    DOCUMENT_NOT_EDITABLE(400, "DOCUMENT_NOT_EDITABLE", "Tài liệu không được phép chỉnh sửa ở trạng thái này"),
    DOCUMENT_NOT_DELETABLE(400, "DOCUMENT_NOT_DELETABLE", "Tài liệu không được phép xóa ở trạng thái này"),
    DOCUMENT_NOT_ANALYZED(400, "DOCUMENT_NOT_ANALYZED", "Tài liệu chưa được AI analyze xong"),
    DOCUMENT_CANNOT_SUBMIT(400, "DOCUMENT_CANNOT_SUBMIT", "Tài liệu không thể gửi duyệt ở trạng thái này"),
    DOCUMENT_CANNOT_APPROVE(400, "DOCUMENT_CANNOT_APPROVE", "Tài liệu không thể approve ở trạng thái này"),
    DOCUMENT_CANNOT_REJECT(400, "DOCUMENT_CANNOT_REJECT", "Tài liệu không thể reject ở trạng thái này"),
    DOCUMENT_CANNOT_ARCHIVE(400, "DOCUMENT_CANNOT_ARCHIVE", "Tài liệu không thể archive ở trạng thái này"),
    DOCUMENT_CANNOT_REPROCESS_RAG(400, "DOCUMENT_CANNOT_REPROCESS_RAG", "Tài liệu không thể yêu cầu xử lý lại RAG ở trạng thái này"),
    DOCUMENT_ACCESS_DENIED(403, "DOCUMENT_ACCESS_DENIED", "Không có quyền truy cập tài liệu"),
    DOCUMENT_NOT_PUBLISHED(400, "DOCUMENT_NOT_PUBLISHED", "Tài liệu chưa được công bố"),
    DOCUMENT_NOT_PROCESSED(400, "DOCUMENT_NOT_PROCESSED", "Tài liệu chưa được AI xử lý RAG xong"),
    DOCUMENT_UPLOAD_FAILED(400, "DOCUMENT_UPLOAD_FAILED", "Upload tài liệu thất bại"),

    // =========================================================
    // ===== FILE UPLOAD =====
    // =========================================================
    FILE_REQUIRED(400, "FILE_REQUIRED", "Vui lòng chọn file tải lên"),
    METADATA_REQUIRED(400, "METADATA_REQUIRED", "Vui lòng cung cấp thông tin tài liệu"),
    FILE_TOO_LARGE(400, "FILE_TOO_LARGE", "Dung lượng file không được vượt quá 20MB"),
    FILE_INVALID_TYPE(400, "FILE_INVALID_TYPE", "Chỉ chấp nhận file PDF hoặc TXT"),
    FILE_EMPTY(400, "FILE_EMPTY", "File tải lên không được để trống"),
    FILE_STORE_FAILED(500, "FILE_STORE_FAILED", "Lưu file thất bại"),
    UPLOAD_NOT_ALLOWED(403, "UPLOAD_NOT_ALLOWED", "Chỉ giảng viên mới được upload tài liệu"),

    // =========================================================
    // ===== COURSE / LESSON (legacy) =====
    // =========================================================
    COURSE_NAME_REQUIRED(400, "COURSE_NAME_REQUIRED", "Tên khóa học không được để trống"),
    COURSE_DESCRIPTION_REQUIRED(400, "COURSE_DESCRIPTION_REQUIRED", "Mô tả không được để trống"),
    COURSE_THUMBNAIL_REQUIRED(400, "COURSE_THUMBNAIL_REQUIRED", "Thumbnail không được để trống"),
    COURSE_SCORE_REQUIRED(400, "COURSE_SCORE_REQUIRED", "Điểm không được để trống"),
    COURSE_SCORE_INVALID(400, "COURSE_SCORE_INVALID", "Điểm phải lớn hơn 0"),
    COURSE_CREATED_BY_REQUIRED(400, "COURSE_CREATED_BY_REQUIRED", "ngườI tạo không được để trống"),
    COURSE_CREATED_BY_INVALID(400, "COURSE_CREATED_BY_INVALID", "ngườI tạo không hợp lệ"),
    COURSE_CREATOR_NOT_FOUND(404, "COURSE_CREATOR_NOT_FOUND", "Không tìm thấy ngườI tạo"),
    COURSE_STATE_INVALID(400, "COURSE_STATE_INVALID", "Trạng thái khóa học không hợp lệ"),
    COURSE_CREATE_FAILED(400, "COURSE_CREATE_FAILED", "Tạo khóa học thất bại"),
    COURSE_NOT_FOUND(404, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"),
    COURSE_UPDATE_NOT_ALLOWED(400, "COURSE_UPDATE_NOT_ALLOWED", "Không thể cập nhật khóa học đã công bố"),
    COURSE_ALREADY_PUBLISHED(400, "COURSE_ALREADY_PUBLISHED", "Khóa học đã được công bố"),
    COURSE_DELETE_NOT_ALLOWED(400, "COURSE_DELETE_NOT_ALLOWED", "Không thể xóa khóa học đã công bố"),
    LESSON_EMPTY(400, "LESSON_EMPTY", "Bài học không được để trống"),

    // =========================================================
    // ===== RAG CONVERSATION =====
    // =========================================================
    CONVERSATION_NOT_FOUND(404, "CONVERSATION_NOT_FOUND", "Không tìm thấy cuộc hội thoại"),
    CONVERSATION_ACCESS_DENIED(403, "CONVERSATION_ACCESS_DENIED", "Không có quyền truy cập cuộc hội thoại này"),

    // =========================================================
    // ===== QUIZ =====
    // =========================================================
    QUIZ_NOT_FOUND(404, "QUIZ_NOT_FOUND", "Không tìm thấy quiz"),
    QUIZ_ACCESS_DENIED(403, "QUIZ_ACCESS_DENIED", "Không có quyền truy cập quiz này"),
    QUIZ_NOT_DRAFT(400, "QUIZ_NOT_DRAFT", "Chỉ có thể sửa, xóa hoặc publish quiz ở trạng thái DRAFT"),
    QUIZ_NOT_PUBLISHED(404, "QUIZ_NOT_PUBLISHED", "Quiz chưa được công bố"),
    QUIZ_GENERATE_FAILED(502, "QUIZ_GENERATE_FAILED", "AI Service không thể sinh quiz"),

    // =========================================================
    // ===== AI SERVICE =====
    // =========================================================
    AI_SERVICE_ERROR(502, "AI_SERVICE_ERROR", "Lỗi khi giao tiếp với AI Service"),

    // =========================================================
    // ===== SYSTEM =====
    // =========================================================
    INTERNAL_ERROR(500, "INTERNAL_ERROR", "Lỗi hệ thống"),
    URL_NOT_FOUND(404, "URL_NOT_FOUND", "Không tìm thấy tài nguyên"),
    INVALID_INPUT(400, "INVALID_INPUT", "Dữ liệu không hợp lệ");

    /** HTTP status code tương ứng với mã lỗi này */
    private final int statusCode;

    /** Mã lỗi riêng (code) dùng trong response envelope, có thể khác enum name nếu cần */
    private final String code;

    /** Message mặc định mô tả lỗi (dùng khi không cần custom message) */
    private final String message;

    ErrorCode(int statusCode, String code, String message) {
        this.statusCode = statusCode;
        this.code = code;
        this.message = message;
    }
}
