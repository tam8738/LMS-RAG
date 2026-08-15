package com.lmsrag.backend.validation;

/**
 * Tập hợp biểu thức chính quy dùng chung để xác thực dữ liệu đầu vào API.
 */
public final class ValidationPatterns {

    public static final String NON_BLANK_IF_PRESENT = "(?s).*\\S.*";
    public static final String SUPPORTED_LANGUAGE = "^(vi|en)$";
    public static final String PHONE_NUMBER = "^\\+?[0-9]{9,15}$";

    private ValidationPatterns() {
    }
}
