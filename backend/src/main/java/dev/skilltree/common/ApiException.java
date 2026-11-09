package dev.skilltree.common;

import java.util.List;

import org.springframework.http.HttpStatus;

/** Business error rendered as RFC 9457 problem detail by {@link GlobalExceptionHandler}. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<String> errors;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, List.of());
    }

    public ApiException(HttpStatus status, String code, String message, List<String> errors) {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, "not_found", what + " not found");
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    public static ApiException invalid(String message, List<String> errors) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "validation_failed", message, errors);
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public List<String> errors() {
        return errors;
    }
}
