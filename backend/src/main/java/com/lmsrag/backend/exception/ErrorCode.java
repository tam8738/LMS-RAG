package com.lmsrag.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Danh sách tất cả mã lỗi nghiệp vụ trong hệ thống.
 * Mỗi mã lỗi gắn liền với một HTTP status và message mặc định,
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
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập"),
    UNAUTHORIZED(HttpStatus.FORBIDDEN, "Không có quyền truy cập"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Truy cập bị từ chối"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Token không hợp lệ"),

    // =========================================================
    // ===== USER =====
    // =========================================================
    EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "Email không được để trống"),
    EMAIL_INVALID(HttpStatus.BAD_REQUEST, "Email không hợp lệ"),
    EMAIL_EXISTED(HttpStatus.BAD_REQUEST, "Email đã tồn tại"),
    USER_EMAIL_DUPLICATED(HttpStatus.BAD_REQUEST, "Email đã được sử dụng"),

    PASSWORD_REQUIRED(HttpStatus.BAD_REQUEST, "Mật khẩu không được để trống"),
    PASSWORD_WEAK(HttpStatus.BAD_REQUEST, "Mật khẩu quá yếu"),

    NAME_REQUIRED(HttpStatus.BAD_REQUEST, "Tên không được để trống"),

    ROLE_REQUIRED(HttpStatus.BAD_REQUEST, "Vai trò không được để trống"),
    ROLE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy vai trò"),

    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"),
    USER_UPDATE_FAILED(HttpStatus.BAD_REQUEST, "Cập nhật người dùng thất bại"),
    USER_DELETE_FAILED(HttpStatus.BAD_REQUEST, "Xóa người dùng thất bại"),

    // =========================================================
    // ===== DOCUMENT =====
    // =========================================================
    DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu"),
    DOCUMENT_NOT_EDITABLE(HttpStatus.BAD_REQUEST, "Tài liệu không được phép chỉnh sửa ở trạng thái này"),
    DOCUMENT_NOT_DELETABLE(HttpStatus.BAD_REQUEST, "Tài liệu không được phép xóa ở trạng thái này"),
    DOCUMENT_NOT_PROCESSED(HttpStatus.BAD_REQUEST, "Tài liệu chưa được xử lý xong"),
    DOCUMENT_CANNOT_SUBMIT(HttpStatus.BAD_REQUEST, "Tài liệu không thể gửi duyệt ở trạng thái này"),
    DOCUMENT_CANNOT_APPROVE(HttpStatus.BAD_REQUEST, "Tài liệu không thể approve ở trạng thái này"),
    DOCUMENT_CANNOT_REJECT(HttpStatus.BAD_REQUEST, "Tài liệu không thể reject ở trạng thái này"),
    DOCUMENT_CANNOT_ARCHIVE(HttpStatus.BAD_REQUEST, "Tài liệu không thể archive ở trạng thái này"),
    DOCUMENT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "Không có quyền truy cập tài liệu"),
    DOCUMENT_UPLOAD_FAILED(HttpStatus.BAD_REQUEST, "Upload tài liệu thất bại"),

    // =========================================================
    // ===== FILE UPLOAD =====
    // =========================================================
    FILE_REQUIRED(HttpStatus.BAD_REQUEST, "Vui lòng chọn file tải lên"),
    METADATA_REQUIRED(HttpStatus.BAD_REQUEST, "Vui lòng cung cấp thông tin tài liệu"),
    FILE_TOO_LARGE(HttpStatus.BAD_REQUEST, "Dung lượng file không được vượt quá 20MB"),
    FILE_INVALID_TYPE(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận file PDF hoặc TXT"),
    FILE_EMPTY(HttpStatus.BAD_REQUEST, "File tải lên không được để trống"),
    FILE_STORE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Lưu file thất bại"),
    UPLOAD_NOT_ALLOWED(HttpStatus.FORBIDDEN, "Chỉ giảng viên mới được upload tài liệu"),

    // =========================================================
    // ===== COURSE / LESSON (legacy) =====
    // =========================================================
    COURSE_NAME_REQUIRED(HttpStatus.BAD_REQUEST, "Tên khóa học không được để trống"),
    COURSE_DESCRIPTION_REQUIRED(HttpStatus.BAD_REQUEST, "Mô tả không được để trống"),
    COURSE_THUMBNAIL_REQUIRED(HttpStatus.BAD_REQUEST, "Thumbnail không được để trống"),
    COURSE_SCORE_REQUIRED(HttpStatus.BAD_REQUEST, "Điểm không được để trống"),
    COURSE_SCORE_INVALID(HttpStatus.BAD_REQUEST, "Điểm phải lớn hơn 0"),
    COURSE_CREATED_BY_REQUIRED(HttpStatus.BAD_REQUEST, "người tạo không được để trống"),
    COURSE_CREATED_BY_INVALID(HttpStatus.BAD_REQUEST, "người tạo không hợp lệ"),
    COURSE_CREATOR_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy người tạo"),
    COURSE_STATE_INVALID(HttpStatus.BAD_REQUEST, "Trạng thái khóa học không hợp lệ"),
    COURSE_CREATE_FAILED(HttpStatus.BAD_REQUEST, "Tạo khóa học thất bại"),
    COURSE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học"),
    COURSE_UPDATE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "Không thể cập nhật khóa học đã công bố"),
    COURSE_ALREADY_PUBLISHED(HttpStatus.BAD_REQUEST, "Khóa học đã được công bố"),
    COURSE_DELETE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "Không thể xóa khóa học đã công bố"),
    LESSON_EMPTY(HttpStatus.BAD_REQUEST, "Bài học không được để trống"),

    // =========================================================
    // ===== SYSTEM =====
    // =========================================================
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống"),
    URL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên"),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ");

    /** HTTP status tương ứng với mã lỗi này */
    private final HttpStatus status;

    /** Message mặc định mô tả lỗi (dùng khi không cần custom message) */
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
