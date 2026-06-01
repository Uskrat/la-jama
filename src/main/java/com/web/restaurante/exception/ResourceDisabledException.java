package com.web.restaurante.exception;

public class ResourceDisabledException extends RuntimeException {
    public ResourceDisabledException(String message) {
        super(message);
    }
}
