package com.lmsrag.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // ===== SUCCESS =====
    SUCCESS(HttpStatus.OK, "Success"),

    // ===== CREATE USER =====
    EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "Email must not be empty"),
    EMAIL_INVALID(HttpStatus.BAD_REQUEST, "Invalid email format"),
    EMAIL_EXISTED(HttpStatus.BAD_REQUEST, "Email already exists"),

    PASSWORD_REQUIRED(HttpStatus.BAD_REQUEST, "Password must not be empty"),
    PASSWORD_WEAK(HttpStatus.BAD_REQUEST, "Password is too weak"),

    NAME_REQUIRED(HttpStatus.BAD_REQUEST, "Name must not be empty"),

    ROLE_REQUIRED(HttpStatus.BAD_REQUEST, "Role must not be empty"),
    ROLE_NOT_FOUND(HttpStatus.NOT_FOUND, "Role not found"),

    LEVEL_NOT_FOUND(HttpStatus.NOT_FOUND, "Level not found"),

    // ===== READ USER =====
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "User not found"),

    // ===== UPDATE USER =====
    USER_UPDATE_FAILED(HttpStatus.BAD_REQUEST, "Failed to update user"),
    USER_EMAIL_DUPLICATED(HttpStatus.BAD_REQUEST, "Email is already in use"),

    // ===== DELETE USER =====
    USER_DELETE_FAILED(HttpStatus.BAD_REQUEST, "Failed to delete user"),

    // ===== AUTH =====
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Unauthenticated"),
    UNAUTHORIZED(HttpStatus.FORBIDDEN, "Access denied"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Email or password is incorrect"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid token"),

    // ===== CREATE COURSE =====
    COURSE_NAME_REQUIRED(HttpStatus.BAD_REQUEST, "Course name must not be empty"),
    COURSE_DESCRIPTION_REQUIRED(HttpStatus.BAD_REQUEST, "Description must not be empty"),
    COURSE_THUMBNAIL_REQUIRED(HttpStatus.BAD_REQUEST, "Thumbnail_URL must not be empty"),

    COURSE_SCORE_REQUIRED(HttpStatus.BAD_REQUEST, "Score must not be null"),
    COURSE_SCORE_INVALID(HttpStatus.BAD_REQUEST, "Score must be greater than 0"),

    COURSE_LEVEL_REQUIRED(HttpStatus.BAD_REQUEST, "LevelId must not be null"),
    COURSE_LEVEL_NOT_FOUND(HttpStatus.NOT_FOUND, "Level not found"),

    COURSE_CREATED_BY_REQUIRED(HttpStatus.BAD_REQUEST, "CreatedBy must not be null"),
    COURSE_CREATED_BY_INVALID(HttpStatus.BAD_REQUEST, "CreatedBy must be a valid integer"),
    COURSE_CREATOR_NOT_FOUND(HttpStatus.NOT_FOUND, "User (creator) not found"),

    COURSE_STATE_INVALID(HttpStatus.BAD_REQUEST, "Invalid course state"),

    COURSE_CREATE_FAILED(HttpStatus.BAD_REQUEST, "Failed to create course"),

    // ===== UPDATE COURSE =====
    COURSE_NOT_FOUND(HttpStatus.NOT_FOUND, "Course not found"),
    COURSE_UPDATE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "Cannot update a published course"),
    COURSE_ALREADY_PUBLISHED(HttpStatus.BAD_REQUEST, "Course has already been published"),
    COURSE_DELETE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "Cannot delete a published course"),

    // ===== LESSON =====
    LESSON_EMPTY(HttpStatus.BAD_REQUEST, "Lesson must not be empty"),

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