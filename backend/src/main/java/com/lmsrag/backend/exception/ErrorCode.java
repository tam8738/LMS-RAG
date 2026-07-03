package com.lmsrag.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Danh sách tất cả mã lỗi nghiệp vụ trong hệ thống.
 */
@Getter
public enum ErrorCode {

    // ===== USER =====
    EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "Email must not be empty"),
    EMAIL_INVALID(HttpStatus.BAD_REQUEST, "Invalid email format"),
    EMAIL_EXISTED(HttpStatus.BAD_REQUEST, "Email already exists"),
    USER_EMAIL_DUPLICATED(HttpStatus.BAD_REQUEST, "Email is already in use"),
    PASSWORD_REQUIRED(HttpStatus.BAD_REQUEST, "Password must not be empty"),
    PASSWORD_WEAK(HttpStatus.BAD_REQUEST, "Password is too weak"),
    NAME_REQUIRED(HttpStatus.BAD_REQUEST, "Name must not be empty"),
    ROLE_REQUIRED(HttpStatus.BAD_REQUEST, "Role must not be empty"),
    ROLE_NOT_FOUND(HttpStatus.NOT_FOUND, "Role not found"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "User not found"),
    USER_UPDATE_FAILED(HttpStatus.BAD_REQUEST, "Failed to update user"),
    USER_DELETE_FAILED(HttpStatus.BAD_REQUEST, "Failed to delete user"),

    // ===== AUTH =====
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Unauthenticated"),
    UNAUTHORIZED(HttpStatus.FORBIDDEN, "Access denied"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Email or password is incorrect"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid token"),

    // ===== COURSE =====
    COURSE_NOT_FOUND(HttpStatus.NOT_FOUND, "Course not found"),
    COURSE_CODE_REQUIRED(HttpStatus.BAD_REQUEST, "Course code is required"),
    COURSE_CODE_INVALID(HttpStatus.BAD_REQUEST, "Course code is invalid"),
    COURSE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "You do not have permission to access this course"),
    COURSE_MEMBER_ALREADY_JOINED(HttpStatus.BAD_REQUEST, "You have already joined this course"),
    COURSE_MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "You are not a member of this course"),

    // ===== SYSTEM =====
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"),
    URL_NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}