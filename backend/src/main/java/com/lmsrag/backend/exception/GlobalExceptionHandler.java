package com.lmsrag.backend.exception;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.lmsrag.backend.client.ai.AiServiceException;
import com.lmsrag.backend.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.ArrayList;
import java.util.List;

/**
 * Chuyển đổi lỗi từ controller và service sang envelope phản hồi API thống nhất.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String REQUEST_FIELD = "request";

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(
            AppException exception,
            HttpServletRequest request) {
        ErrorCode errorCode = exception.getErrorCode();
        log.warn("[BUSINESS] Request rejected | method={} | path={} | code={}",
                request.getMethod(), request.getRequestURI(), errorCode.getCode());

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(ApiResponse.error(errorCode.getCode(), errorCode.getMessage()));
    }

    /** Xử lý JSON body không hợp lệ và multipart DTO không thể binding bởi Spring. */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiResponse<Object>> handleBindingException(
            BindException exception,
            HttpServletRequest request) {
        List<ApiResponse.ErrorDetail> details = exception.getBindingResult()
                .getAllErrors()
                .stream()
                .map(this::toErrorDetail)
                .toList();
        return invalidInput(details, request);
    }

    /** Xử lý ràng buộc được khai báo trực tiếp trên tham số của controller. */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiResponse<Object>> handleMethodValidationException(
            HandlerMethodValidationException exception,
            HttpServletRequest request) {
        List<ApiResponse.ErrorDetail> details = new ArrayList<>();

        for (ParameterValidationResult result : exception.getParameterValidationResults()) {
            if (result instanceof ParameterErrors parameterErrors) {
                parameterErrors.getAllErrors().stream()
                        .map(this::toErrorDetail)
                        .forEach(details::add);
                continue;
            }

            String parameterName = result.getMethodParameter().getParameterName();
            String field = parameterName != null ? parameterName : REQUEST_FIELD;
            result.getResolvableErrors().stream()
                    .map(error -> errorDetail(field, resolveMessage(error.getDefaultMessage())))
                    .forEach(details::add);
        }

        exception.getCrossParameterValidationResults().stream()
                .map(error -> errorDetail(REQUEST_FIELD, resolveMessage(error.getDefaultMessage())))
                .forEach(details::add);

        return invalidInput(details, request);
    }

    /** Xử lý DTO được xác thực thủ công, chẳng hạn JSON metadata trong multipart request. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleConstraintViolationException(
            ConstraintViolationException exception,
            HttpServletRequest request) {
        List<ApiResponse.ErrorDetail> details = exception.getConstraintViolations().stream()
                .map(this::toErrorDetail)
                .toList();
        return invalidInput(details, request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> handleTypeMismatchException(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request) {
        String requiredType = exception.getRequiredType() != null
                ? exception.getRequiredType().getSimpleName()
                : "đúng định dạng";
        ApiResponse.ErrorDetail detail = errorDetail(
                exception.getName(),
                "Giá trị phải thuộc kiểu " + requiredType
        );
        return invalidInput(List.of(detail), request);
    }

    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            MissingRequestHeaderException.class,
            MissingServletRequestPartException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleMissingRequestValue(
            Exception exception,
            HttpServletRequest request) {
        String field = switch (exception) {
            case MissingServletRequestParameterException missing -> missing.getParameterName();
            case MissingRequestHeaderException missing -> missing.getHeaderName();
            case MissingServletRequestPartException missing -> missing.getRequestPartName();
            default -> REQUEST_FIELD;
        };
        return invalidInput(
                List.of(errorDetail(field, "Trường bắt buộc không được để trống")),
                request
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleUnreadableRequestBody(
            HttpMessageNotReadableException exception,
            HttpServletRequest request) {
        JsonMappingException mappingException = findCause(exception, JsonMappingException.class);
        String field = mappingException != null ? jsonFieldPath(mappingException) : REQUEST_FIELD;
        String message = mappingException != null
                ? "Giá trị không đúng kiểu hoặc định dạng yêu cầu"
                : "Nội dung JSON không hợp lệ";

        log.warn("[VALIDATION] Request body cannot be parsed | method={} | path={} | field={} | cause={}",
                request.getMethod(),
                request.getRequestURI(),
                field,
                exception.getMostSpecificCause().getClass().getSimpleName());
        return invalidInput(List.of(errorDetail(field, message)), request, false);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleMaxUploadSizeExceeded(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request) {
        log.warn("[VALIDATION] Upload rejected | method={} | path={} | reason=file-too-large",
                request.getMethod(), request.getRequestURI());
        return ResponseEntity
                .status(ErrorCode.FILE_TOO_LARGE.getStatusCode())
                .body(ApiResponse.error(
                        ErrorCode.FILE_TOO_LARGE.getCode(),
                        ErrorCode.FILE_TOO_LARGE.getMessage()
                ));
    }

    @ExceptionHandler(AiServiceException.class)
    public ResponseEntity<ApiResponse<Object>> handleAiServiceException(AiServiceException exception) {
        log.error("[AI] Service exception | code={} | message={}",
                exception.getErrorCode(), exception.getMessage());
        return ResponseEntity
                .status(ErrorCode.AI_SERVICE_ERROR.getStatusCode())
                .body(ApiResponse.error(exception.getErrorCode(), exception.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(
            AccessDeniedException exception,
            HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.warn("[SECURITY] Access denied | user={} | method={} | path={}",
                username, request.getMethod(), request.getRequestURI());

        return ResponseEntity
                .status(ErrorCode.FORBIDDEN.getStatusCode())
                .body(ApiResponse.error(ErrorCode.FORBIDDEN.getCode(), ErrorCode.FORBIDDEN.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleException(
            Exception exception,
            HttpServletRequest request) {
        log.error("[SYSTEM] Unexpected error | method={} | path={} | type={}",
                request.getMethod(), request.getRequestURI(), exception.getClass().getSimpleName(), exception);
        return ResponseEntity
                .status(ErrorCode.INTERNAL_ERROR.getStatusCode())
                .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR.getCode(), ErrorCode.INTERNAL_ERROR.getMessage()));
    }

    private ResponseEntity<ApiResponse<Object>> invalidInput(
            List<ApiResponse.ErrorDetail> details,
            HttpServletRequest request) {
        return invalidInput(details, request, true);
    }

    private ResponseEntity<ApiResponse<Object>> invalidInput(
            List<ApiResponse.ErrorDetail> details,
            HttpServletRequest request,
            boolean writeLog) {
        List<ApiResponse.ErrorDetail> safeDetails = details.isEmpty()
                ? List.of(errorDetail(REQUEST_FIELD, ErrorCode.INVALID_INPUT.getMessage()))
                : details;

        if (writeLog) {
            List<String> validationErrors = safeDetails.stream()
                    .map(detail -> detail.getField() + ": " + detail.getMessage())
                    .distinct()
                    .sorted()
                    .toList();
            log.warn("[VALIDATION] Request rejected | method={} | path={} | errors={}",
                    request.getMethod(), request.getRequestURI(), validationErrors);
        }

        return ResponseEntity
                .status(ErrorCode.INVALID_INPUT.getStatusCode())
                .body(ApiResponse.error(
                        ErrorCode.INVALID_INPUT.getCode(),
                        ErrorCode.INVALID_INPUT.getMessage(),
                        safeDetails
                ));
    }

    private ApiResponse.ErrorDetail toErrorDetail(ObjectError error) {
        String field = error instanceof FieldError fieldError
                ? fieldError.getField()
                : REQUEST_FIELD;
        return errorDetail(field, resolveMessage(error.getDefaultMessage()));
    }

    private ApiResponse.ErrorDetail toErrorDetail(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString()
                .replaceAll("\\.<[^>]+>", "");
        int lastDot = path.lastIndexOf('.');
        String field = lastDot >= 0 ? path.substring(lastDot + 1) : path;
        if (field.isBlank()) {
            field = REQUEST_FIELD;
        }
        return errorDetail(field, resolveMessage(violation.getMessage()));
    }

    private ApiResponse.ErrorDetail errorDetail(String field, String message) {
        return ApiResponse.ErrorDetail.builder()
                .field(field)
                .message(message)
                .build();
    }

    private String resolveMessage(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return ErrorCode.INVALID_INPUT.getMessage();
        }
        try {
            return ErrorCode.valueOf(rawMessage).getMessage();
        } catch (IllegalArgumentException ignored) {
            return rawMessage;
        }
    }

    private String jsonFieldPath(JsonMappingException exception) {
        String path = exception.getPath().stream()
                .map(reference -> reference.getFieldName() != null
                        ? reference.getFieldName()
                        : "[" + reference.getIndex() + "]")
                .reduce((left, right) -> right.startsWith("[")
                        ? left + right
                        : left + "." + right)
                .orElse(REQUEST_FIELD);
        return path.isBlank() ? REQUEST_FIELD : path;
    }

    private <T extends Throwable> T findCause(Throwable throwable, Class<T> type) {
        Throwable current = throwable;
        while (current != null) {
            if (type.isInstance(current)) {
                return type.cast(current);
            }
            current = current.getCause();
        }
        return null;
    }
}
