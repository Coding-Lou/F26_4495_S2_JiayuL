package com.jay.outdoor.memory.controller;

import com.jay.outdoor.memory.exception.PhotoNotFoundException;
import com.jay.outdoor.memory.storage.LocalMemoryPhotoStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Development-only photo bytes for local storage (section 12). Registered only
 * when {@code memory.storage.type} is {@code local}. No token: the signed,
 * expiring URL is the authorization. Every failure is the same 404.
 */
@RestController
@ConditionalOnProperty(name = "memory.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalPhotoController {

    private final LocalMemoryPhotoStorage storage;

    public LocalPhotoController(LocalMemoryPhotoStorage storage) {
        this.storage = storage;
    }

    @GetMapping(LocalMemoryPhotoStorage.URL_PATH + "{memoryId}/{fileName}")
    public ResponseEntity<byte[]> photo(
            @PathVariable String memoryId,
            @PathVariable String fileName,
            @RequestParam(required = false) String expires,
            @RequestParam(required = false) String signature
    ) {
        return storage.readSigned(memoryId, fileName, expires, signature)
                .map(photo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(photo.mediaType()))
                        .header(HttpHeaders.CACHE_CONTROL,
                                "private, max-age=" + photo.maxAgeSeconds())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(photo.content()))
                .orElseThrow(PhotoNotFoundException::new);
    }
}
