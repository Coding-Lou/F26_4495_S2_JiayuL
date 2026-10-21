package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class ImageTooLargeException extends ApplicationException {

    public ImageTooLargeException() {
        super(HttpStatus.CONTENT_TOO_LARGE, ErrorCode.IMAGE_TOO_LARGE, "The image is larger than 40 megapixels or 12000 pixels on a side");
    }
}
