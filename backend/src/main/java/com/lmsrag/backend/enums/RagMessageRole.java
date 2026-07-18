package com.lmsrag.backend.enums;

/**
 * Vai trò của một message trong RAG conversation.
 * Chỉ chấp nhận user (câu hỏi) và assistant (câu trả lờI từ AI).
 */
public enum RagMessageRole {

    /** Câu hỏi của ngườI dùng. */
    user,

    /** Câu trả lờI từ AI assistant. */
    assistant
}
