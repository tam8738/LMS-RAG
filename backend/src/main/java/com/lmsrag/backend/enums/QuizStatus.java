package com.lmsrag.backend.enums;

/** Trạng thái vòng đời của một quiz do Teacher tạo. */
public enum QuizStatus {
    /** Bản nháp có thể được Teacher owner chỉnh sửa hoặc công bố. */
    DRAFT,

    /** Quiz đã công bố và không thể chỉnh sửa hoặc công bố lại. */
    PUBLISHED
}
