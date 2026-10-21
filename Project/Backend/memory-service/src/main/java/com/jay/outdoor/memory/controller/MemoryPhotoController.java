package com.jay.outdoor.memory.controller;

import com.jay.outdoor.memory.dto.MemoryPhotoResponse;
import com.jay.outdoor.memory.dto.ReorderPhotosRequest;
import com.jay.outdoor.memory.security.OwnerSubject;
import com.jay.outdoor.memory.service.MemoryPhotoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/** Photos of one owned Memory (sections 13.8 to 13.10). */
@RestController
@RequestMapping("/api/memories/{memoryId}/photos")
public class MemoryPhotoController {

    private final MemoryPhotoService photoService;

    public MemoryPhotoController(MemoryPhotoService photoService) {
        this.photoService = photoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemoryPhotoResponse addPhoto(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID memoryId,
            @RequestPart("file") MultipartFile file
    ) {
        return photoService.add(OwnerSubject.of(jwt), memoryId, file);
    }

    @PutMapping("/order")
    public List<MemoryPhotoResponse> reorderPhotos(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID memoryId,
            @Valid @RequestBody ReorderPhotosRequest request
    ) {
        return photoService.reorder(OwnerSubject.of(jwt), memoryId, request);
    }

    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePhoto(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID memoryId,
            @PathVariable UUID photoId
    ) {
        photoService.remove(OwnerSubject.of(jwt), memoryId, photoId);
    }
}
