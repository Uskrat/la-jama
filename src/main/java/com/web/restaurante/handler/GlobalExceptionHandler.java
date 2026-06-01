package com.web.restaurante.handler;

import com.web.restaurante.dto.ApiResponseDTO;
import com.web.restaurante.exception.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(WrongPasswordException.class)
    public ResponseEntity<?> handleWrongPassword(WrongPasswordException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponseDTO<>(false, e.getMessage(), null));
    }

    @ExceptionHandler(ResourceDisabledException.class)
    public ResponseEntity<?> handleResourceDisabled(ResourceDisabledException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiResponseDTO<>(false, e.getMessage(), null));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiResponseDTO<>(false, e.getMessage(), null));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusinessException(BusinessException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponseDTO<>(false, e.getMessage(), null));
    }

    @ExceptionHandler(InvalidArgumentException.class)
    public ResponseEntity<?> handleInvalidArgumentException(InvalidArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponseDTO<>(false, e.getMessage(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiResponseDTO<>(false, "Error interno del servidor - " + e.getMessage(), null));
    }
}
