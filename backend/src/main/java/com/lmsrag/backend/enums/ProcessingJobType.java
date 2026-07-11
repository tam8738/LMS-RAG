package com.lmsrag.backend.enums;

/**
 * Loại job xử lý nền của tài liệu, dùng để phân biệt các tác vụ
 * BE giao cho AI Service thực hiện bất đồng bộ.
 */
public enum ProcessingJobType {

    /** Đánh giá tài liệu: kiểm tra file có đủ điều kiện RAG hay không
     *  (số trang, token, chunk, lý do không hỗ trợ...). */
    ANALYZE,

    /** Tạo embedding và lưu chunk vào vector store để phục vụ RAG. */
    INDEX,

    /** Xử lý lại tài liệu đã từng analyze/index (ví dụ sau khi thay file). */
    REPROCESS
}
