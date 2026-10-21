package com.jay.outdoor.memory.controller;

import com.jay.outdoor.memory.dto.CreateMemoryRequest;
import com.jay.outdoor.memory.dto.MemoryPage;
import com.jay.outdoor.memory.dto.OwnerMemoryDetail;
import com.jay.outdoor.memory.dto.OwnerMemorySummary;
import com.jay.outdoor.memory.dto.UpdateMemoryRequest;
import com.jay.outdoor.memory.security.OwnerSubject;
import com.jay.outdoor.memory.service.MemoryPaging;
import com.jay.outdoor.memory.service.MemoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Owner API (section 13). The owner is always the token's subject. */
@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    @GetMapping
    public MemoryPage<OwnerMemorySummary> listOwnMemories(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + MemoryPaging.DEFAULT_SIZE) int size
    ) {
        return memoryService.list(OwnerSubject.of(jwt), page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OwnerMemoryDetail createMemory(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateMemoryRequest request
    ) {
        return memoryService.create(OwnerSubject.of(jwt), request);
    }

    @GetMapping("/{memoryId}")
    public OwnerMemoryDetail getMemory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID memoryId
    ) {
        return memoryService.get(OwnerSubject.of(jwt), memoryId);
    }

    @PutMapping("/{memoryId}")
    public OwnerMemoryDetail updateMemory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID memoryId,
            @Valid @RequestBody UpdateMemoryRequest request
    ) {
        return memoryService.update(OwnerSubject.of(jwt), memoryId, request);
    }

    @DeleteMapping("/{memoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMemory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID memoryId
    ) {
        memoryService.delete(OwnerSubject.of(jwt), memoryId);
    }
}
