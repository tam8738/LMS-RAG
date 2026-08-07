package com.lmsrag.backend.validation;

/** Shared regular expressions used by API request DTOs. */
public final class ValidationPatterns {

    public static final String NON_BLANK_IF_PRESENT = "(?s).*\\S.*";
    public static final String SUPPORTED_LANGUAGE = "^(vi|en)$";
    public static final String PHONE_NUMBER = "^\\+?[0-9]{9,15}$";

    private ValidationPatterns() {
    }
}
