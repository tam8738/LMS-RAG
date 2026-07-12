package com.lmsrag.backend.enums;

/**
 * Vai trò người dùng trong hệ thống, dùng cho phân quyền (RBAC).
 */
public enum UserRole {

    /** Quản trị viên: duyệt tài liệu, quản lý người dùng, archive tài liệu. */
    ADMIN,

    /** Giảng viên: upload, chỉnh sửa và gửi duyệt tài liệu của mình. */
    TEACHER,

    /** Học sinh/sinh viên: tra cứu và đọc tài liệu đã được công bố. */
    STUDENT
}
